import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../src/auth/AuthContext';
import {RootNavigator} from '../src/navigation/RootNavigator';
import {LoginScreen} from '../src/screens/LoginScreen';
import {RegisterScreen} from '../src/screens/RegisterScreen';
import {ForgotPasswordScreen} from '../src/screens/ForgotPasswordScreen';
import {VerificationCodeScreen} from '../src/screens/VerificationCodeScreen';
import {NewPasswordScreen} from '../src/screens/NewPasswordScreen';
import {AppNavigator} from '../src/navigation/AppNavigator';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {getItem: jest.fn(), setItem: jest.fn()},
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/screens/LoginScreen', () => ({LoginScreen: jest.fn(() => null)}));
jest.mock('../src/screens/RegisterScreen', () => ({RegisterScreen: jest.fn(() => null)}));
jest.mock('../src/screens/ForgotPasswordScreen', () => ({ForgotPasswordScreen: jest.fn(() => null)}));
jest.mock('../src/screens/VerificationCodeScreen', () => ({VerificationCodeScreen: jest.fn(() => null)}));
jest.mock('../src/screens/NewPasswordScreen', () => ({NewPasswordScreen: jest.fn(() => null)}));
jest.mock('../src/navigation/AppNavigator', () => ({AppNavigator: jest.fn(() => null)}));

const auth = jest.mocked(useAuth);

async function renderRoot() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<RootNavigator />); await Promise.resolve(); });
  return renderer;
}

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({user: null, isInitializing: false} as ReturnType<typeof useAuth>);
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('true');
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
});

it('carries email from sign-in through neutral recovery, code entry, and back to sign-in', async () => {
  const renderer = await renderRoot();
  act(() => { renderer.root.findByType(LoginScreen).props.onForgotPassword('user@example.com'); });
  expect(renderer.root.findByType(ForgotPasswordScreen).props.initialEmail).toBe('user@example.com');

  act(() => { renderer.root.findByType(ForgotPasswordScreen).props.onCodeSent('user@example.com'); });
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('reset');
  act(() => { renderer.root.findByType(VerificationCodeScreen).props.onCodeEntered('123456'); });
  expect(renderer.root.findByType(NewPasswordScreen).props.code).toBe('123456');

  act(() => { renderer.root.findByType(NewPasswordScreen).props.onInvalidCode(); });
  expect(renderer.root.findByType(VerificationCodeScreen).props.initialError).toContain('Invalid or expired code');
  act(() => { renderer.root.findByType(VerificationCodeScreen).props.onCodeEntered('654321'); });
  act(() => { renderer.root.findByType(NewPasswordScreen).props.onResetSuccess(); });
  expect(renderer.root.findByType(LoginScreen).props.initialEmail).toBe('user@example.com');
  act(() => renderer.unmount());
});

it('offers verification after new email registration but never blocks the app', async () => {
  const renderer = await renderRoot();
  act(() => { renderer.root.findByType(LoginScreen).props.onShowRegister(); });
  act(() => { renderer.root.findByType(RegisterScreen).props.onRegistered(); });
  auth.mockReturnValue({
    user: {id: 'user-1', email: 'user@example.com', emailVerified: false},
    isInitializing: false,
  } as ReturnType<typeof useAuth>);
  act(() => { renderer.update(<RootNavigator />); });
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('email');
  expect(renderer.root.findByType(VerificationCodeScreen).props.email).toBe('user@example.com');
  act(() => { renderer.root.findByType(VerificationCodeScreen).props.onBack(); });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  act(() => renderer.unmount());
});

it('keeps restored unverified sessions on the existing app route', async () => {
  auth.mockReturnValue({
    user: {id: 'user-1', email: 'user@example.com', emailVerified: false},
    isInitializing: false,
  } as ReturnType<typeof useAuth>);
  const renderer = await renderRoot();
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  expect(renderer.root.findAllByType(VerificationCodeScreen)).toHaveLength(0);
  act(() => renderer.unmount());
});

it('offers the same skippable verification after sign-in for an unverified account', async () => {
  const renderer = await renderRoot();
  act(() => { renderer.root.findByType(LoginScreen).props.onSignedIn(); });
  auth.mockReturnValue({
    user: {id: 'user-1', email: 'user@example.com', emailVerified: false},
    isInitializing: false,
  } as ReturnType<typeof useAuth>);
  act(() => { renderer.update(<RootNavigator />); });
  expect(renderer.root.findByType(VerificationCodeScreen).props.mode).toBe('email');
  act(() => { renderer.root.findByType(VerificationCodeScreen).props.onBack(); });
  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  act(() => renderer.unmount());
});
