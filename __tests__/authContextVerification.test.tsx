import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {
  getAuthenticatedUser,
  loginWithEmail,
  logoutCurrentSession,
  registerWithEmail,
  requestEmailVerificationCode,
  verifyEmailVerificationCode,
} from '../src/api/auth';
import {AuthProvider, useAuth} from '../src/auth/AuthContext';
import {clearStoredAuthTokens, getStoredAccessToken, getStoredRefreshToken, storeAuthTokens} from '../src/auth/authStorage';
import {getSessionAccessToken, getSessionUser, setSessionAccessToken, setSessionUser} from '../src/auth/session';

jest.mock('../src/api/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  loginWithEmail: jest.fn(),
  logoutCurrentSession: jest.fn(),
  registerWithEmail: jest.fn(),
  requestEmailVerificationCode: jest.fn(),
  verifyEmailVerificationCode: jest.fn(),
}));
jest.mock('../src/auth/authStorage', () => ({
  getStoredAccessToken: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  storeAuthTokens: jest.fn(),
  clearStoredAuthTokens: jest.fn(),
}));

const getUser = jest.mocked(getAuthenticatedUser);
const register = jest.mocked(registerWithEmail);
const login = jest.mocked(loginWithEmail);
const requestCode = jest.mocked(requestEmailVerificationCode);
const verify = jest.mocked(verifyEmailVerificationCode);
const getStored = jest.mocked(getStoredAccessToken);
const store = jest.mocked(storeAuthTokens);
let currentAuth: ReturnType<typeof useAuth>;

function Probe() {
  currentAuth = useAuth();
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  setSessionAccessToken(null);
  setSessionUser(null);
  getStored.mockResolvedValue(null);
  jest.mocked(getStoredRefreshToken).mockResolvedValue(null);
  store.mockResolvedValue(undefined);
  jest.mocked(logoutCurrentSession).mockResolvedValue(undefined);
});

it('updates the verified user while keeping the existing access token and storage flow', async () => {
  const unverifiedUser = {
    id: 'user-1', email: 'user@example.com', name: null, emailVerified: false,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  };
  register.mockResolvedValue({user: unverifiedUser, accessToken: 'existing-token', refreshToken: 'register-refresh'});
  getUser.mockResolvedValue(unverifiedUser);
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<AuthProvider><Probe /></AuthProvider>); });

  await act(async () => {
    await currentAuth.register({email: 'user@example.com', password: 'password123'});
  });
  expect(currentAuth.user?.emailVerified).toBe(false);
  expect(requestCode).not.toHaveBeenCalled();
  expect(currentAuth.consumeInitialVerificationCodeRequest('another-user')).toBe(false);
  expect(currentAuth.consumeInitialVerificationCodeRequest('user-1')).toBe(true);
  expect(currentAuth.consumeInitialVerificationCodeRequest('user-1')).toBe(false);
  expect(getSessionAccessToken()).toBe('existing-token');
  expect(store).toHaveBeenCalledTimes(1);
  expect(store).toHaveBeenCalledWith('existing-token', 'register-refresh');

  const verifiedUser = {...unverifiedUser, emailVerified: true};
  verify.mockResolvedValue(verifiedUser);
  await act(async () => { await currentAuth.verifyEmail('123456'); });
  expect(verify).toHaveBeenCalledWith('123456');
  expect(currentAuth.user?.emailVerified).toBe(true);
  expect(getSessionUser()).toEqual(verifiedUser);
  expect(getSessionAccessToken()).toBe('existing-token');
  expect(store).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('arms one initial request after interactive sign-in without sending a code from AuthContext', async () => {
  const unverifiedUser = {
    id: 'signin-user', email: 'signin@example.com', emailVerified: false,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  };
  login.mockResolvedValue({user: unverifiedUser, accessToken: 'signin-token'});
  getUser.mockResolvedValue(unverifiedUser);
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<AuthProvider><Probe /></AuthProvider>); });

  await act(async () => {
    await currentAuth.login({email: unverifiedUser.email, password: 'password123'});
  });
  expect(requestCode).not.toHaveBeenCalled();
  expect(currentAuth.consumeInitialVerificationCodeRequest(unverifiedUser.id)).toBe(true);
  expect(currentAuth.consumeInitialVerificationCodeRequest(unverifiedUser.id)).toBe(false);
  act(() => renderer.unmount());
});

it('preserves the auth response verification flag when /auth/me omits it', async () => {
  const authUser = {
    id: 'new-user', email: 'new@example.com', emailVerified: false,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  };
  register.mockResolvedValue({user: authUser, accessToken: 'new-token'});
  getUser.mockResolvedValue({
    id: authUser.id, email: authUser.email,
    createdAt: authUser.createdAt, updatedAt: authUser.updatedAt,
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<AuthProvider><Probe /></AuthProvider>); });

  await act(async () => {
    await currentAuth.register({email: authUser.email, password: 'password123'});
  });
  expect(currentAuth.user?.emailVerified).toBe(false);
  expect(getSessionUser()?.emailVerified).toBe(false);
  expect(getSessionAccessToken()).toBe('new-token');
  act(() => renderer.unmount());
});

it('persists refresh credentials on sign-in and clears both tokens despite backend logout failure', async () => {
  const authUser = {
    id: 'user-1', email: 'user@example.com', emailVerified: true,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  };
  login.mockResolvedValue({user: authUser, accessToken: 'access-token', refreshToken: 'refresh-token'});
  getUser.mockResolvedValue(authUser);
  jest.mocked(clearStoredAuthTokens).mockResolvedValue(undefined);
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<AuthProvider><Probe /></AuthProvider>); });

  await act(async () => { await currentAuth.login({email: authUser.email, password: 'password123'}); });
  expect(store).toHaveBeenCalledWith('access-token', 'refresh-token');
  expect(currentAuth.user).toEqual(authUser);
  jest.mocked(logoutCurrentSession).mockRejectedValueOnce(new Error('Server unavailable'));
  await act(async () => { await currentAuth.logout(); });
  expect(logoutCurrentSession).toHaveBeenCalledTimes(1);
  expect(clearStoredAuthTokens).toHaveBeenCalledTimes(1);
  expect(getSessionAccessToken()).toBeNull();
  expect(getSessionUser()).toBeNull();
  expect(currentAuth.user).toBeNull();
  act(() => renderer.unmount());
});
