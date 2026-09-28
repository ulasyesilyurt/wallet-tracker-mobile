import React from 'react';
import {Text, TextInput} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {ApiError} from '../src/api/client';
import {useAuth} from '../src/auth/AuthContext';
import {
  requestEmailVerificationCode,
  requestPasswordResetCode,
  resetPasswordWithCode,
} from '../src/api/auth';
import {ForgotPasswordScreen} from '../src/screens/ForgotPasswordScreen';
import {VerificationCodeScreen} from '../src/screens/VerificationCodeScreen';
import {NewPasswordScreen} from '../src/screens/NewPasswordScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 24, bottom: 24, left: 0, right: 0}),
}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/api/auth', () => ({
  requestEmailVerificationCode: jest.fn(),
  requestPasswordResetCode: jest.fn(),
  resetPasswordWithCode: jest.fn(),
}));

const auth = jest.mocked(useAuth);
const requestVerification = jest.mocked(requestEmailVerificationCode);
const requestReset = jest.mocked(requestPasswordResetCode);
const resetPassword = jest.mocked(resetPasswordWithCode);
const verifyEmail = jest.fn<Promise<void>, [string]>();

function button(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByProps({accessibilityLabel: label})
    .find(node => node.props.accessibilityRole === 'button')!;
}

function input(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
}

function copy(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
}

beforeEach(() => {
  jest.clearAllMocks();
  requestVerification.mockResolvedValue(undefined);
  requestReset.mockResolvedValue(undefined);
  resetPassword.mockResolvedValue(undefined);
  verifyEmail.mockResolvedValue(undefined);
  auth.mockReturnValue({verifyEmail} as unknown as ReturnType<typeof useAuth>);
});

it('validates forgot email and advances on the neutral backend success without account hints', async () => {
  const onCodeSent = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(
    <ForgotPasswordScreen initialEmail="bad" onBack={jest.fn()} onCodeSent={onCodeSent} />,
  ); });
  await act(async () => { await button(renderer, 'Send code').props.onPress(); });
  expect(requestReset).not.toHaveBeenCalled();
  expect(copy(renderer)).toContain('Enter a valid email address.');

  act(() => { input(renderer, 'Email').props.onChangeText(' unknown@example.com '); });
  await act(async () => { await button(renderer, 'Send code').props.onPress(); });
  expect(requestReset).toHaveBeenCalledWith('unknown@example.com');
  expect(onCodeSent).toHaveBeenCalledWith('unknown@example.com');
  expect(copy(renderer)).not.toMatch(/account exists|account not found/i);
  act(() => renderer.unmount());
});

it('accepts pasted six digits once and carries them to the reset form without claiming verification', async () => {
  const onCodeEntered = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(
    <VerificationCodeScreen mode="reset" email="unknown@example.com" onBack={jest.fn()} onCodeEntered={onCodeEntered} />,
  ); });
  expect(requestReset).not.toHaveBeenCalled();
  expect(copy(renderer)).toContain('If an account exists');
  const codeInput = input(renderer, '6-digit verification code');
  expect(codeInput.props.textContentType).toBe('oneTimeCode');
  act(() => { codeInput.props.onChangeText('12 34x56'); });
  act(() => { codeInput.props.onChangeText('123456'); });
  expect(onCodeEntered).toHaveBeenCalledTimes(1);
  expect(onCodeEntered).toHaveBeenCalledWith('123456');
  act(() => renderer.unmount());
});

it('enables resend after the countdown and starts a fresh cooldown only after success', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-28T10:00:00Z'));
  const onCodeRequested = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  try {
    await act(async () => { renderer = TestRenderer.create(
      <VerificationCodeScreen mode="reset" email="user@example.com" onBack={jest.fn()} onCodeRequested={onCodeRequested} />,
    ); });
    expect(copy(renderer)).toMatch(/Resend code in\s+1:00/);
    act(() => { jest.advanceTimersByTime(61_000); });
    await act(async () => { button(renderer, 'Resend code').props.onPress(); await Promise.resolve(); });
    expect(requestReset).toHaveBeenCalledTimes(1);
    expect(requestReset).toHaveBeenCalledWith('user@example.com');
    expect(onCodeRequested).toHaveBeenCalledWith(Date.now() + 60_000);
    expect(copy(renderer)).toMatch(/Resend code in\s+1:00/);
  } finally {
    act(() => renderer.unmount());
    jest.useRealTimers();
  }
});

it('requests email verification once, clears invalid codes, and submits the next six digits', async () => {
  verifyEmail.mockRejectedValueOnce(new ApiError(400, 'Invalid or expired code.', 'AUTH_INVALID_CODE'));
  const onVerified = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(
    <VerificationCodeScreen mode="email" email="user@example.com" onBack={jest.fn()} onVerified={onVerified} />,
  ); });
  expect(requestVerification).toHaveBeenCalledTimes(1);

  await act(async () => { input(renderer, '6-digit verification code').props.onChangeText('111111'); });
  expect(verifyEmail).toHaveBeenCalledWith('111111');
  expect(input(renderer, '6-digit verification code').props.value).toBe('');
  expect(copy(renderer)).toContain('That code didn’t match or has expired.');
  expect(onVerified).not.toHaveBeenCalled();

  await act(async () => { input(renderer, '6-digit verification code').props.onChangeText('222222'); });
  expect(verifyEmail).toHaveBeenCalledTimes(2);
  expect(onVerified).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('lets an unverified user continue to the app while the initial email request is pending', async () => {
  let resolveRequest!: () => void;
  requestVerification.mockReturnValueOnce(new Promise<void>(resolve => { resolveRequest = resolve; }));
  const onBack = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(
    <VerificationCodeScreen mode="email" email="user@example.com" onBack={onBack} />,
  ); });
  expect(button(renderer, 'Continue to app').props.disabled).not.toBe(true);
  act(() => { button(renderer, 'Continue to app').props.onPress(); });
  expect(onBack).toHaveBeenCalledTimes(1);
  await act(async () => { resolveRequest(); await Promise.resolve(); });
  act(() => renderer.unmount());
});

it('submits only an eight-character reset password and returns invalid codes for re-entry', async () => {
  const onInvalidCode = jest.fn();
  const onResetSuccess = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(
    <NewPasswordScreen email="user@example.com" code="123456" onBack={jest.fn()} onInvalidCode={onInvalidCode} onResetSuccess={onResetSuccess} />,
  ); });
  expect(button(renderer, 'Save new password').props.disabled).toBe(true);
  act(() => { input(renderer, 'New password').props.onChangeText('1234567'); });
  expect(button(renderer, 'Save new password').props.disabled).toBe(true);
  act(() => { input(renderer, 'New password').props.onChangeText('12345678'); });
  resetPassword.mockRejectedValueOnce(new ApiError(400, 'Invalid or expired code.', 'AUTH_INVALID_CODE'));
  await act(async () => { await button(renderer, 'Save new password').props.onPress(); });
  expect(resetPassword).toHaveBeenCalledWith({email: 'user@example.com', code: '123456', newPassword: '12345678'});
  expect(onInvalidCode).toHaveBeenCalledTimes(1);
  expect(onResetSuccess).not.toHaveBeenCalled();

  await act(async () => { await button(renderer, 'Save new password').props.onPress(); });
  expect(onResetSuccess).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});
