import React from 'react';
import {NativeModules} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthProvider} from '../src/auth/AuthContext';
import {clearStoredAuthTokens, getStoredAccessToken, getStoredRefreshToken, storeAuthTokens} from '../src/auth/authStorage';
import {getSessionAccessToken, setSessionAccessToken, setSessionUser} from '../src/auth/session';
import {RootNavigator} from '../src/navigation/RootNavigator';
import {AppNavigator} from '../src/navigation/AppNavigator';
import {LoginScreen} from '../src/screens/LoginScreen';
import {VerificationCodeScreen} from '../src/screens/VerificationCodeScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 24, bottom: 24, left: 0, right: 0}),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {getItem: jest.fn(), setItem: jest.fn()},
}));
jest.mock('../src/auth/authStorage', () => ({
  getStoredAccessToken: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  storeAuthTokens: jest.fn(),
  clearStoredAuthTokens: jest.fn(),
}));
jest.mock('../src/navigation/AppNavigator', () => ({AppNavigator: jest.fn(() => null)}));

const originalFetch = globalThis.fetch;
const unverifiedUser = {
  id: 'restored-user', email: 'restored@example.com', emailVerified: false,
  createdAt: '2026-09-28', updatedAt: '2026-09-28',
};

function response(status: number, body: unknown) {
  return {ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body)};
}

beforeEach(() => {
  jest.clearAllMocks();
  NativeModules.ApiConfig = {apiOrigin: 'https://api.example.com', isRelease: true};
  setSessionAccessToken(null);
  setSessionUser(null);
  jest.mocked(getStoredAccessToken).mockResolvedValue('expired-access');
  jest.mocked(getStoredRefreshToken).mockResolvedValue('stored-refresh');
  jest.mocked(storeAuthTokens).mockResolvedValue(undefined);
  jest.mocked(clearStoredAuthTokens).mockResolvedValue(undefined);
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('true');
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete NativeModules.ApiConfig;
  setSessionAccessToken(null);
  setSessionUser(null);
});

it('restores an expired unverified session through refresh without automatically requesting a code', async () => {
  globalThis.fetch = jest.fn().mockImplementation((url: string, options: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return Promise.resolve(response(200, {data: {
      user: unverifiedUser, accessToken: 'rotated-access', refreshToken: 'rotated-refresh',
    }}));
    if (url.endsWith('/auth/me') && (options.headers as Record<string, string>).Authorization === 'Bearer expired-access') {
      return Promise.resolve(response(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}}));
    }
    if (url.endsWith('/auth/me')) return Promise.resolve(response(200, {data: {user: unverifiedUser}}));
    throw new Error(`Unexpected request path: ${url}`);
  }) as typeof fetch;

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('restored');
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(getSessionAccessToken()).toBe('rotated-access');
  expect(storeAuthTokens).toHaveBeenCalledWith('rotated-access', 'rotated-refresh');
  expect(jest.mocked(globalThis.fetch).mock.calls.filter(([url]) => String(url).endsWith('/auth/email-verification/request'))).toHaveLength(0);
  act(() => renderer.unmount());
});

it('returns to signed-out auth after a revoked refresh credential during restore', async () => {
  globalThis.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(url.endsWith('/auth/refresh')
    ? response(401, {error: {code: 'AUTH_INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.'}})
    : response(401, {error: {code: 'AUTH_INVALID_TOKEN', message: 'Invalid access token.'}}))) as typeof fetch;

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(renderer.root.findByType(LoginScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(getSessionAccessToken()).toBeNull();
  expect(clearStoredAuthTokens).toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('keeps secure credentials after a transient refresh outage during cold restore', async () => {
  globalThis.fetch = jest.fn().mockImplementation((url: string) => url.endsWith('/auth/refresh')
    ? Promise.reject(new TypeError('Network request failed'))
    : Promise.resolve(response(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}}))) as typeof fetch;

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(renderer.root.findByType(LoginScreen)).toBeTruthy();
  expect(clearStoredAuthTokens).not.toHaveBeenCalled();
  expect(getStoredAccessToken).toHaveBeenCalled();
  expect(getStoredRefreshToken).toHaveBeenCalled();
  act(() => renderer.unmount());
});
