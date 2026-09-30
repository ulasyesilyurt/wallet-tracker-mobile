import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ApiError} from '../src/api/client';
import {getAuthenticatedUser, loginWithApple, loginWithGoogle, requestEmailVerificationCode} from '../src/api/auth';
import {requestAppleIdentity} from '../src/auth/appleProvider';
import {requestGoogleIdentity} from '../src/auth/googleProvider';
import {AuthProvider, useAuth} from '../src/auth/AuthContext';
import {getStoredAccessToken, getStoredRefreshToken, storeAuthTokens} from '../src/auth/authStorage';
import {setSessionAccessToken, setSessionUser} from '../src/auth/session';
import {RootNavigator} from '../src/navigation/RootNavigator';
import {AppNavigator} from '../src/navigation/AppNavigator';
import {VerificationCodeScreen} from '../src/screens/VerificationCodeScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 24, bottom: 24, left: 0, right: 0}),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: {getItem: jest.fn(), setItem: jest.fn()},
}));
jest.mock('../src/api/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  loginWithApple: jest.fn(),
  loginWithGoogle: jest.fn(),
  requestEmailVerificationCode: jest.fn(),
}));
jest.mock('../src/auth/appleProvider', () => ({requestAppleIdentity: jest.fn()}));
jest.mock('../src/auth/googleProvider', () => ({requestGoogleIdentity: jest.fn()}));
jest.mock('../src/auth/authStorage', () => ({
  getStoredAccessToken: jest.fn(), getStoredRefreshToken: jest.fn(),
  storeAuthTokens: jest.fn(), clearStoredAuthTokens: jest.fn(),
}));
jest.mock('../src/navigation/AppNavigator', () => ({AppNavigator: jest.fn(() => null)}));

const baseUser = {
  id: 'social-user', email: 'social@example.com', emailVerified: true,
  createdAt: '2026-09-30', updatedAt: '2026-09-30',
};
let auth!: ReturnType<typeof useAuth>;

function Probe() {
  auth = useAuth();
  return null;
}

async function renderAuth() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><Probe /><RootNavigator /></AuthProvider>);
    await Promise.resolve();
  });
  return renderer;
}

beforeEach(() => {
  jest.clearAllMocks();
  setSessionAccessToken(null);
  setSessionUser(null);
  jest.mocked(getStoredAccessToken).mockResolvedValue(null);
  jest.mocked(getStoredRefreshToken).mockResolvedValue(null);
  jest.mocked(storeAuthTokens).mockResolvedValue(undefined);
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('true');
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  jest.mocked(requestEmailVerificationCode).mockResolvedValue(undefined);
  jest.mocked(requestAppleIdentity).mockResolvedValue({
    status: 'success', credential: {identityToken: 'apple-id-token', expectedNonce: 'nonce-hash'},
  });
  jest.mocked(requestGoogleIdentity).mockResolvedValue({
    status: 'success', credential: {idToken: 'google-id-token'},
  });
  jest.mocked(loginWithApple).mockResolvedValue({
    user: baseUser, accessToken: 'chainbell-access', refreshToken: 'chainbell-refresh',
  });
  jest.mocked(loginWithGoogle).mockResolvedValue({
    user: baseUser, accessToken: 'chainbell-access', refreshToken: 'chainbell-refresh',
  });
  jest.mocked(getAuthenticatedUser).mockResolvedValue(baseUser);
});

afterEach(() => {
  setSessionAccessToken(null);
  setSessionUser(null);
});

it('stores ChainBell tokens and opens the app for a verified Apple user', async () => {
  const renderer = await renderAuth();
  await act(async () => { await expect(auth.signInWithApple()).resolves.toEqual({status: 'success'}); });
  expect(loginWithApple).toHaveBeenCalledWith({identityToken: 'apple-id-token', expectedNonce: 'nonce-hash'});
  expect(storeAuthTokens).toHaveBeenCalledWith('chainbell-access', 'chainbell-refresh');
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(1);
  act(() => renderer.unmount());
});

it('routes an unverified Apple user through the existing gate and arms one code request', async () => {
  const unverified = {...baseUser, emailVerified: false};
  jest.mocked(loginWithApple).mockResolvedValueOnce({
    user: unverified, accessToken: 'chainbell-access', refreshToken: 'chainbell-refresh',
  });
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(unverified);
  const renderer = await renderAuth();
  await act(async () => { await auth.signInWithApple(); });
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('signin');
  expect(requestEmailVerificationCode).toHaveBeenCalledTimes(1);
  expect(auth.consumeInitialVerificationCodeRequest(unverified.id)).toBe(false);
  act(() => renderer.unmount());
});

it('does not change the session or call backend on provider cancellation', async () => {
  jest.mocked(requestAppleIdentity).mockResolvedValueOnce({status: 'cancelled'});
  const renderer = await renderAuth();
  await act(async () => { await expect(auth.signInWithApple()).resolves.toEqual({status: 'cancelled'}); });
  expect(auth.user).toBeNull();
  expect(loginWithApple).not.toHaveBeenCalled();
  expect(storeAuthTokens).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('propagates AUTH_LINK_REQUIRED without changing tokens or session', async () => {
  jest.mocked(loginWithApple).mockRejectedValueOnce(new ApiError(409, 'Link required', 'AUTH_LINK_REQUIRED'));
  const renderer = await renderAuth();
  await act(async () => {
    await expect(auth.signInWithApple()).rejects.toMatchObject({code: 'AUTH_LINK_REQUIRED'});
  });
  expect(auth.user).toBeNull();
  expect(storeAuthTokens).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('stores ChainBell tokens and opens the app for a verified Google user', async () => {
  const renderer = await renderAuth();
  await act(async () => { await expect(auth.signInWithGoogle()).resolves.toEqual({status: 'success'}); });
  expect(loginWithGoogle).toHaveBeenCalledWith('google-id-token');
  expect(storeAuthTokens).toHaveBeenCalledWith('chainbell-access', 'chainbell-refresh');
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(1);
  act(() => renderer.unmount());
});

it('routes an unverified Google user through the existing gate and requests one code', async () => {
  const unverified = {...baseUser, emailVerified: false};
  jest.mocked(loginWithGoogle).mockResolvedValueOnce({
    user: unverified, accessToken: 'chainbell-access', refreshToken: 'chainbell-refresh',
  });
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(unverified);
  const renderer = await renderAuth();
  await act(async () => { await auth.signInWithGoogle(); });
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('signin');
  expect(requestEmailVerificationCode).toHaveBeenCalledTimes(1);
  expect(auth.consumeInitialVerificationCodeRequest(unverified.id)).toBe(false);
  act(() => renderer.unmount());
});

it('keeps auth state and storage unchanged on Google cancellation', async () => {
  jest.mocked(requestGoogleIdentity).mockResolvedValueOnce({status: 'cancelled'});
  const renderer = await renderAuth();
  await act(async () => { await expect(auth.signInWithGoogle()).resolves.toEqual({status: 'cancelled'}); });
  expect(auth.user).toBeNull();
  expect(loginWithGoogle).not.toHaveBeenCalled();
  expect(storeAuthTokens).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('propagates Google AUTH_LINK_REQUIRED without changing tokens or session', async () => {
  jest.mocked(loginWithGoogle).mockRejectedValueOnce(new ApiError(409, 'Link required', 'AUTH_LINK_REQUIRED'));
  const renderer = await renderAuth();
  await act(async () => {
    await expect(auth.signInWithGoogle()).rejects.toMatchObject({code: 'AUTH_LINK_REQUIRED'});
  });
  expect(auth.user).toBeNull();
  expect(storeAuthTokens).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});
