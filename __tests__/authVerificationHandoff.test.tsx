import React from 'react';
import {TextInput} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuthenticatedUser,
  loginWithEmail,
  registerWithEmail,
  requestEmailVerificationCode,
  verifyEmailVerificationCode,
} from '../src/api/auth';
import {AuthProvider} from '../src/auth/AuthContext';
import {getStoredAccessToken, storeAccessToken} from '../src/auth/authStorage';
import {setSessionAccessToken, setSessionUser} from '../src/auth/session';
import {RootNavigator} from '../src/navigation/RootNavigator';
import {VerificationCodeScreen} from '../src/screens/VerificationCodeScreen';
import {AppNavigator} from '../src/navigation/AppNavigator';

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
  registerWithEmail: jest.fn(),
  requestEmailVerificationCode: jest.fn(),
  requestPasswordResetCode: jest.fn(),
  resetPasswordWithCode: jest.fn(),
  verifyEmailVerificationCode: jest.fn(),
}));
jest.mock('../src/auth/authStorage', () => ({
  getStoredAccessToken: jest.fn(),
  storeAccessToken: jest.fn(),
  clearStoredAccessToken: jest.fn(),
}));
jest.mock('../src/navigation/AppNavigator', () => ({AppNavigator: jest.fn(() => null)}));

const register = jest.mocked(registerWithEmail);
const login = jest.mocked(loginWithEmail);
const getUser = jest.mocked(getAuthenticatedUser);
const requestCode = jest.mocked(requestEmailVerificationCode);
const verifyCode = jest.mocked(verifyEmailVerificationCode);

function button(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByProps({accessibilityLabel: label})
    .find(node => node.props.accessibilityRole === 'button')!;
}

function input(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
}

beforeEach(() => {
  jest.clearAllMocks();
  setSessionAccessToken(null);
  setSessionUser(null);
  jest.mocked(getStoredAccessToken).mockResolvedValue(null);
  jest.mocked(storeAccessToken).mockResolvedValue(undefined);
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

it('keeps verification visible after the 202 code request until explicit skip', async () => {
  const renderer = await registerUser();
  expect(requestCode).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  expect(verifyCode).not.toHaveBeenCalled();

  act(() => { button(renderer, 'Continue to app').props.onPress(); });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  expect(verifyCode).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('keeps the pending verification prompt if RootNavigator remounts', async () => {
  const renderer = await registerUser();
  expect(requestCode).toHaveBeenCalledTimes(1);

  await act(async () => {
    renderer.update(<AuthProvider><RootNavigator key="remounted" /></AuthProvider>);
    await Promise.resolve();
  });

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
  expect(renderer.root.findByType(VerificationCodeScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  act(() => { button(renderer, 'Continue to app').props.onPress(); });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  act(() => renderer.unmount());
});

it('does not prompt during restoration of an existing unverified session', async () => {
  jest.mocked(getStoredAccessToken).mockResolvedValue('stored-access-token');
  getUser.mockResolvedValue({
    id: 'existing-user', email: 'existing@example.com', emailVerified: false,
    createdAt: '2026-09-28', updatedAt: '2026-09-28',
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthProvider><RootNavigator /></AuthProvider>);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  expect(renderer.root.findAllByType(VerificationCodeScreen)).toHaveLength(0);
  expect(requestCode).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});
