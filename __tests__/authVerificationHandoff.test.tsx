import React from 'react';
import {AppState, NativeModules, Text, TextInput} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuthenticatedUser,
  loginWithEmail,
  logoutCurrentSession,
  registerWithEmail,
  requestEmailVerificationCode,
  verifyEmailVerificationCode,
} from '../src/api/auth';
import {ApiError, apiRequest} from '../src/api/client';
import {AuthProvider, useAuth} from '../src/auth/AuthContext';
import {clearStoredAuthTokens, getStoredAccessToken, getStoredRefreshToken, storeAuthTokens} from '../src/auth/authStorage';
import {getSessionAccessToken, setSessionAccessToken, setSessionUser} from '../src/auth/session';
import {RootNavigator} from '../src/navigation/RootNavigator';
import {VerificationCodeScreen} from '../src/screens/VerificationCodeScreen';
import {AppNavigator} from '../src/navigation/AppNavigator';
import {WelcomeScreen} from '../src/screens/WelcomeScreen';
import {LoginScreen} from '../src/screens/LoginScreen';
import {RegisterScreen} from '../src/screens/RegisterScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 24, bottom: 24, left: 0, right: 0}),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {getItem: jest.fn(), setItem: jest.fn()},
}));
jest.mock('../src/api/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  loginWithEmail: jest.fn(),
  logoutCurrentSession: jest.fn(),
  registerWithEmail: jest.fn(),
  requestEmailVerificationCode: jest.fn(),
  requestPasswordResetCode: jest.fn(),
  resetPasswordWithCode: jest.fn(),
  verifyEmailVerificationCode: jest.fn(),
}));
jest.mock('../src/auth/authStorage', () => ({
  getStoredAccessToken: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  storeAuthTokens: jest.fn(),
  clearStoredAuthTokens: jest.fn(),
}));
jest.mock('../src/navigation/AppNavigator', () => ({AppNavigator: jest.fn(() => null)}));

const register = jest.mocked(registerWithEmail);
const login = jest.mocked(loginWithEmail);
const getUser = jest.mocked(getAuthenticatedUser);
const requestCode = jest.mocked(requestEmailVerificationCode);
const verifyCode = jest.mocked(verifyEmailVerificationCode);
const originalFetch = globalThis.fetch;
let currentUser: ReturnType<typeof useAuth>['user'];

function UserProbe() {
  currentUser = useAuth().user;
  return null;
}

function button(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByProps({accessibilityLabel: label})
    .find(node => node.props.accessibilityRole === 'button') ??
    renderer.root.findAll(node => node.props.accessibilityRole === 'button' &&
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.endsWith(` ${label}`))[0]!;
}

function input(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
}

function copy(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return {promise, resolve};
}

beforeEach(() => {
  jest.clearAllMocks();
  setSessionAccessToken(null);
  setSessionUser(null);
  jest.mocked(getStoredAccessToken).mockResolvedValue(null);
  jest.mocked(getStoredRefreshToken).mockResolvedValue(null);
  jest.mocked(storeAuthTokens).mockResolvedValue(undefined);
  jest.mocked(clearStoredAuthTokens).mockResolvedValue(undefined);
  jest.mocked(logoutCurrentSession).mockResolvedValue(undefined);
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('true');
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  const authUser = {
    id: 'new-user', email: 'new@example.com', emailVerified: false,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  };
  register.mockResolvedValue({user: authUser, accessToken: 'new-access-token'});
  login.mockResolvedValue({user: authUser, accessToken: 'new-access-token'});
  getUser.mockResolvedValue({
    id: authUser.id, email: authUser.email,
    createdAt: authUser.createdAt, updatedAt: authUser.updatedAt,
  });
  requestCode.mockResolvedValue(undefined);
  verifyCode.mockResolvedValue({...authUser, emailVerified: true});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete NativeModules.ApiConfig;
});

async function registerUser() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
    await Promise.resolve();
  });
  act(() => { button(renderer, 'Create account').props.onPress(); });
  act(() => {
    input(renderer, 'Email').props.onChangeText('new@example.com');
    input(renderer, 'Password').props.onChangeText('password123');
  });
  await act(async () => {
    await button(renderer, 'Create account').props.onPress();
    await Promise.resolve();
  });
  return renderer;
}

async function restoreUnverifiedUser() {
  jest.mocked(getStoredAccessToken).mockResolvedValue('stored-access-token');
  getUser.mockResolvedValue({
    id: 'existing-user', email: 'existing@example.com', emailVerified: false,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
  });
  return renderer;
}

it('keeps verification visible after the 202 code request without any skip control', async () => {
  const renderer = await registerUser();
  expect(requestCode).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('register');
  expect(copy(renderer)).toContain('Enter the 6-digit code we sent to');
  expect(button(renderer, 'Wrong email?')).toBeTruthy();
  expect(button(renderer, 'Sign out')).toBeTruthy();
  expect(button(renderer, 'Back')).toBeUndefined();
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(verifyCode).not.toHaveBeenCalled();
  expect(button(renderer, 'Continue to app')).toBeUndefined();
  act(() => renderer.unmount());
});

it('keeps the pending verification prompt if RootNavigator remounts', async () => {
  const renderer = await registerUser();
  expect(requestCode).toHaveBeenCalledTimes(1);

  await act(async () => {
    renderer.update(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
  });
  expect(requestCode).toHaveBeenCalledTimes(1);

  await act(async () => {
    renderer.update(<AuthProvider><RootNavigator key="remounted" /></AuthProvider>);
    await Promise.resolve();
  });

  expect(register).toHaveBeenCalledTimes(1);
  expect(requestCode).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(verifyCode).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('enters the app only after the user submits the six-digit verification code', async () => {
  const renderer = await registerUser();
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  await act(async () => { input(renderer, '6-digit verification code').props.onChangeText('123456'); });
  expect(verifyCode).toHaveBeenCalledWith('123456');
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  act(() => renderer.unmount());
});

it('keeps verification visible after an unverified interactive sign-in', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
    await Promise.resolve();
  });
  act(() => {
    input(renderer, 'Email').props.onChangeText('new@example.com');
    input(renderer, 'Password').props.onChangeText('password123');
  });
  await act(async () => {
    await button(renderer, 'Sign in').props.onPress();
    await Promise.resolve();
  });
  expect(requestCode).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('signin');
  expect(copy(renderer)).toContain('Your account isn’t verified yet. We just sent a code to');
  expect(button(renderer, 'Not you?')).toBeTruthy();
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(button(renderer, 'Continue to app')).toBeUndefined();

  await act(async () => {
    renderer.update(<AuthProvider><RootNavigator key="signin-remount" /></AuthProvider>);
    await Promise.resolve();
  });
  expect(login).toHaveBeenCalledTimes(1);
  expect(requestCode).toHaveBeenCalledTimes(1);
  await act(async () => { button(renderer, 'Not you?').props.onPress(); await Promise.resolve(); });
  expect(renderer.root.findByType(LoginScreen)).toBeTruthy();
  expect(input(renderer, 'Email').props.value).toBe('');
  expect(input(renderer, 'Password').props.value).toBe('');
  act(() => renderer.unmount());
});

it('never automatically requests a code on restored re-render or background-to-active resume', async () => {
  const changeListeners: Array<(state: 'background' | 'active') => void> = [];
  const addEventListener = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
    if (type === 'change') {
      changeListeners.push(listener as (state: 'background' | 'active') => void);
    }
    return {remove: jest.fn()};
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  try {
    renderer = await restoreUnverifiedUser();
    await act(async () => {
      renderer.update(<AuthProvider><RootNavigator /></AuthProvider>);
      changeListeners.forEach(listener => listener('background'));
      await Promise.resolve();
    });
    await act(async () => {
      renderer.update(<AuthProvider><RootNavigator /></AuthProvider>);
      changeListeners.forEach(listener => listener('active'));
      await Promise.resolve();
    });

    expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
    expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('restored');
    expect(copy(renderer)).toContain('Enter the latest code we sent to');
    expect(button(renderer, 'Not you?')).toBeTruthy();
    expect(requestCode).not.toHaveBeenCalled();
  } finally {
    if (renderer) act(() => renderer.unmount());
    addEventListener.mockRestore();
  }
});

it('fails closed when a restored user has no emailVerified field', async () => {
  jest.mocked(getStoredAccessToken).mockResolvedValue('stored-access-token');
  getUser.mockResolvedValue({
    id: 'older-user', email: 'older@example.com',
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
  });
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(requestCode).not.toHaveBeenCalled();
  expect(button(renderer, 'Continue to app')).toBeUndefined();
  act(() => renderer.unmount());
});

it('requires verification after restoration of an existing unverified session', async () => {
  const renderer = await restoreUnverifiedUser();
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(requestCode).not.toHaveBeenCalled();
  expect(input(renderer, '6-digit verification code').props.editable).toBe(true);
  expect(button(renderer, 'Send code')).toBeTruthy();
  act(() => renderer.unmount());
});

it('accepts a previously sent code after restoring an unverified session', async () => {
  const renderer = await restoreUnverifiedUser();
  expect(requestCode).not.toHaveBeenCalled();
  verifyCode.mockResolvedValue({
    id: 'existing-user', email: 'existing@example.com', emailVerified: true,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  });

  await act(async () => { input(renderer, '6-digit verification code').props.onChangeText('123456'); });
  expect(verifyCode).toHaveBeenCalledWith('123456');
  expect(requestCode).not.toHaveBeenCalled();
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  act(() => renderer.unmount());
});

it('allows explicit resend after restoring an unverified session', async () => {
  const renderer = await restoreUnverifiedUser();
  expect(requestCode).not.toHaveBeenCalled();

  await act(async () => { button(renderer, 'Send code').props.onPress(); await Promise.resolve(); });
  expect(requestCode).toHaveBeenCalledTimes(1);
  expect(button(renderer, 'Resend code')).toBeUndefined();
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  act(() => renderer.unmount());
});

it('keeps a wrong code on verification until a valid code succeeds', async () => {
  const renderer = await registerUser();
  verifyCode.mockRejectedValueOnce(new ApiError(400, 'Invalid or expired code.', 'AUTH_INVALID_CODE'));
  await act(async () => { input(renderer, '6-digit verification code').props.onChangeText('111111'); });
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  await act(async () => { input(renderer, '6-digit verification code').props.onChangeText('222222'); });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  act(() => renderer.unmount());
});

it('lets a verified user enter the app without requesting a code', async () => {
  jest.mocked(getStoredAccessToken).mockResolvedValue('stored-access-token');
  getUser.mockResolvedValue({
    id: 'verified-user', email: 'verified@example.com', emailVerified: true,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
  });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  expect(requestCode).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('recovers from a protected-route verification 403 without discarding the token', async () => {
  jest.mocked(getStoredAccessToken).mockResolvedValue('stored-access-token');
  getUser.mockResolvedValue({
    id: 'verified-user', email: 'verified@example.com', emailVerified: true,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><UserProbe /><RootNavigator /></AuthProvider>);
    await Promise.resolve();
  });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  NativeModules.ApiConfig = {apiOrigin: 'https://api.example.com', isRelease: true};
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 403,
    json: jest.fn().mockResolvedValue({error: {
      code: 'AUTH_EMAIL_VERIFICATION_REQUIRED',
      message: 'Verify your email before accessing this resource.',
    }}),
  }) as typeof fetch;
  await act(async () => {
    await expect(apiRequest('/wallets')).rejects.toMatchObject({
      status: 403, code: 'AUTH_EMAIL_VERIFICATION_REQUIRED',
    });
  });
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(requestCode).not.toHaveBeenCalled();
  expect(getSessionAccessToken()).toBe('stored-access-token');

  const unverifiedUser = currentUser;
  await act(async () => {
    await expect(apiRequest('/wallets')).rejects.toMatchObject({
      status: 403, code: 'AUTH_EMAIL_VERIFICATION_REQUIRED',
    });
  });
  expect(currentUser).toBe(unverifiedUser);
  expect(requestCode).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('signs out locally to Welcome and ignores a late verification response', async () => {
  const renderer = await registerUser();
  const pending = deferred<Awaited<ReturnType<typeof verifyEmailVerificationCode>>>();
  verifyCode.mockReturnValueOnce(pending.promise);
  act(() => { input(renderer, '6-digit verification code').props.onChangeText('123456'); });
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);

  await act(async () => { button(renderer, 'Sign out').props.onPress(); await Promise.resolve(); });
  expect(renderer.root.findByType(WelcomeScreen)).toBeTruthy();
  expect(getSessionAccessToken()).toBeNull();
  expect(clearStoredAuthTokens).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve({
      id: 'new-user', email: 'new@example.com', emailVerified: true,
      createdAt: '2026-09-28', updatedAt: '2026-09-28',
    });
    await pending.promise;
  });
  expect(renderer.root.findByType(WelcomeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  act(() => renderer.unmount());
});

it('returns Wrong email? to registration with only the email prefilled', async () => {
  const renderer = await registerUser();
  await act(async () => { button(renderer, 'Wrong email?').props.onPress(); await Promise.resolve(); });
  expect(renderer.root.findByType(RegisterScreen)).toBeTruthy();
  expect(input(renderer, 'Email').props.value).toBe('new@example.com');
  expect(input(renderer, 'Password').props.value).toBe('');
  expect(getSessionAccessToken()).toBeNull();
  expect(requestCode).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('returns Not you? to an empty Sign In form', async () => {
  const renderer = await restoreUnverifiedUser();
  await act(async () => { button(renderer, 'Not you?').props.onPress(); await Promise.resolve(); });
  expect(renderer.root.findByType(LoginScreen)).toBeTruthy();
  expect(input(renderer, 'Email').props.value).toBe('');
  expect(input(renderer, 'Password').props.value).toBe('');
  expect(getSessionAccessToken()).toBeNull();
  act(() => renderer.unmount());
});

it('ignores a late initial code request after local sign-out', async () => {
  const pending = deferred<void>();
  requestCode.mockReturnValueOnce(pending.promise);
  const renderer = await registerUser();
  expect(requestCode).toHaveBeenCalledTimes(1);
  await act(async () => { button(renderer, 'Sign out').props.onPress(); await Promise.resolve(); });
  await act(async () => { pending.resolve(); await pending.promise; });
  expect(renderer.root.findByType(WelcomeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  act(() => renderer.unmount());
});

it('does not enter the app when the verify endpoint returns an unverified user', async () => {
  const renderer = await registerUser();
  verifyCode.mockResolvedValueOnce({
    id: 'new-user', email: 'new@example.com', emailVerified: false,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  });
  await act(async () => { input(renderer, '6-digit verification code').props.onChangeText('123456'); });
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  act(() => renderer.unmount());
});
