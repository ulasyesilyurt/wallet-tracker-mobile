import React from 'react';
import {Text, TextInput} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {useAuth} from '../src/auth/AuthContext';
import {LoginScreen} from '../src/screens/LoginScreen';
import {RegisterScreen} from '../src/screens/RegisterScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 24, bottom: 24, left: 0, right: 0}),
}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));

const auth = jest.mocked(useAuth);
const login = jest.fn<Promise<void>, [{email: string; password: string}]>();
const register = jest.fn<Promise<void>, [{email: string; password: string; name?: string}]>();

function button(renderer: TestRenderer.ReactTestRenderer, label: string) {
  const candidates = renderer.root.findAllByProps({accessibilityLabel: label});
  return candidates.find(node => node.props.accessibilityRole === 'button')!;
}

function input(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
}

function copy(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return {promise, resolve};
}

beforeEach(() => {
  jest.clearAllMocks();
  login.mockReset();
  register.mockReset();
  login.mockResolvedValue(undefined);
  register.mockResolvedValue(undefined);
  auth.mockReturnValue({login, register} as unknown as ReturnType<typeof useAuth>);
});

it('keeps only supported sign-in actions, validates on blur, and toggles password visibility', async () => {
  const onShowRegister = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<LoginScreen onShowRegister={onShowRegister} />); });
  expect(button(renderer, 'Sign in').props.disabled).toBe(true);
  expect(copy(renderer)).toContain('Welcome back to ChainBell.');
  expect(copy(renderer)).not.toMatch(/Forgot password|Continue with Apple|Continue with Google/);

  act(() => {
    input(renderer, 'Email').props.onChangeText('invalid');
    input(renderer, 'Password').props.onChangeText('secret');
  });
  act(() => { input(renderer, 'Email').props.onBlur(); });
  expect(copy(renderer)).toContain('Enter a valid email address.');
  await act(async () => { await button(renderer, 'Sign in').props.onPress(); });
  expect(login).not.toHaveBeenCalled();

  act(() => { input(renderer, 'Email').props.onChangeText(' user@example.com '); });
  expect(copy(renderer)).not.toContain('Enter a valid email address.');
  act(() => { button(renderer, 'Show password').props.onPress(); });
  expect(input(renderer, 'Password').props.secureTextEntry).toBe(false);
  expect(button(renderer, 'Hide password')).toBeTruthy();

  await act(async () => { await button(renderer, 'Sign in').props.onPress(); });
  expect(login).toHaveBeenCalledWith({email: 'user@example.com', password: 'secret'});
  act(() => { button(renderer, 'Create account').props.onPress(); });
  expect(onShowRegister).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('keeps sign-in loading in its button, blocks duplicates, and clears request errors on edit', async () => {
  const pending = deferred();
  login.mockReturnValueOnce(pending.promise);
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<LoginScreen onShowRegister={jest.fn()} />); });
  act(() => {
    input(renderer, 'Email').props.onChangeText('user@example.com');
    input(renderer, 'Password').props.onChangeText('secret');
  });
  act(() => {
    button(renderer, 'Sign in').props.onPress();
    button(renderer, 'Sign in').props.onPress();
  });
  expect(login).toHaveBeenCalledTimes(1);
  expect(button(renderer, 'Sign in').props.disabled).toBe(true);
  expect(copy(renderer)).toContain('Signing in…');
  await act(async () => { pending.resolve(); await pending.promise; });

  login.mockRejectedValueOnce(new Error('Invalid email or password.'));
  await act(async () => { await button(renderer, 'Sign in').props.onPress(); });
  expect(copy(renderer)).toContain('Invalid email or password.');
  act(() => { input(renderer, 'Password').props.onChangeText('another'); });
  expect(copy(renderer)).not.toContain('Invalid email or password.');
  act(() => renderer.unmount());
});

it('keeps the optional name, eight-character rule, and existing registration payload', async () => {
  const onShowLogin = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<RegisterScreen onShowLogin={onShowLogin} />); });
  expect(button(renderer, 'Create account').props.disabled).toBe(true);
  expect(copy(renderer)).toContain('8+ characters');
  expect(copy(renderer)).not.toMatch(/number or symbol|verification|Continue with Apple|Continue with Google/i);

  act(() => {
    input(renderer, 'Email').props.onChangeText(' user@example.com ');
    input(renderer, 'Password').props.onChangeText('abcdefgh');
    input(renderer, 'Name (optional)').props.onChangeText(' Ada ');
  });
  await act(async () => { await button(renderer, 'Create account').props.onPress(); });
  expect(register).toHaveBeenCalledWith({email: 'user@example.com', password: 'abcdefgh', name: 'Ada'});
  act(() => { button(renderer, 'Sign in').props.onPress(); });
  expect(onShowLogin).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('disables invalid registration and blocks duplicate submits while showing button loading', async () => {
  const pending = deferred();
  register.mockReturnValueOnce(pending.promise);
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<RegisterScreen onShowLogin={jest.fn()} />); });
  act(() => {
    input(renderer, 'Email').props.onChangeText('user@example.com');
    input(renderer, 'Password').props.onChangeText('12345678');
    input(renderer, 'Name (optional)').props.onChangeText('a'.repeat(121));
  });
  act(() => { input(renderer, 'Name (optional)').props.onBlur(); });
  expect(button(renderer, 'Create account').props.disabled).toBe(true);
  expect(copy(renderer)).toContain('Name must be 120 characters or less.');
  act(() => { input(renderer, 'Name (optional)').props.onChangeText(''); });
  expect(copy(renderer)).not.toContain('Name must be 120 characters or less.');

  act(() => {
    button(renderer, 'Create account').props.onPress();
    button(renderer, 'Create account').props.onPress();
  });
  expect(register).toHaveBeenCalledTimes(1);
  expect(copy(renderer)).toContain('Creating account…');
  expect(button(renderer, 'Create account').props.disabled).toBe(true);
  await act(async () => { pending.resolve(); await pending.promise; });
  expect(register).toHaveBeenCalledWith({email: 'user@example.com', password: '12345678', name: undefined});
  act(() => renderer.unmount());
});

it('presents and clears a registration request error', async () => {
  register.mockRejectedValueOnce(new Error('An account with that email already exists.'));
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<RegisterScreen onShowLogin={jest.fn()} />); });
  act(() => {
    input(renderer, 'Email').props.onChangeText('user@example.com');
    input(renderer, 'Password').props.onChangeText('12345678');
  });
  await act(async () => { await button(renderer, 'Create account').props.onPress(); });
  expect(copy(renderer)).toContain('An account with that email already exists.');
  act(() => { input(renderer, 'Email').props.onChangeText('other@example.com'); });
  expect(copy(renderer)).not.toContain('An account with that email already exists.');
  act(() => renderer.unmount());
});
