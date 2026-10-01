import React from 'react';
import {Keyboard, Platform, Text, TextInput, View} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {ApiError} from '../src/api/client';
import {useAuth} from '../src/auth/AuthContext';
import {ProviderAuthError} from '../src/auth/providerAuth';
import {AuthOrDivider, PrimaryAuthButton, SecondaryAuthButton} from '../src/components/AuthUI';
import {WelcomeScreen} from '../src/screens/WelcomeScreen';
import {LoginScreen} from '../src/screens/LoginScreen';
import {RegisterScreen} from '../src/screens/RegisterScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 24, bottom: 24, left: 0, right: 0}),
}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));
const mockFocusLabels: string[] = [];
jest.mock('react-native/Libraries/Components/TextInput/TextInput', () => {
  const ReactForMock = require('react');
  const MockTextInput = ReactForMock.forwardRef((props: {accessibilityLabel?: string}, ref: React.Ref<{focus: () => void}>) => {
    ReactForMock.useImperativeHandle(ref, () => ({focus: () => { mockFocusLabels.push(props.accessibilityLabel ?? ''); }}));
    return ReactForMock.createElement('MockTextInput', props);
  });
  return {__esModule: true, default: MockTextInput};
});

const mockedAuth = jest.mocked(useAuth);
const google = jest.fn<Promise<{status: 'success' | 'cancelled'}>, []>();
const apple = jest.fn<Promise<{status: 'success' | 'cancelled'}>, []>();
const login = jest.fn<Promise<void>, [{email: string; password: string}]>();
const register = jest.fn<Promise<void>, [{email: string; password: string; name?: string}]>();
const originalPlatform = Platform.OS;

function setPlatform(value: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', {configurable: true, value});
}

function render(node: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(node); });
  return renderer;
}

function press(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  const matches = renderer.root.findAllByProps({testID});
  const target = matches.find(node => typeof node.props.onPress === 'function')!;
  act(() => { target.props.onPress(); });
}

function input(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
}

function copy(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
}

function deferred() {
  let resolve!: (value: {status: 'success' | 'cancelled'}) => void;
  const promise = new Promise<{status: 'success' | 'cancelled'}>(done => { resolve = done; });
  return {promise, resolve};
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFocusLabels.length = 0;
  (jest.requireMock('@invertase/react-native-apple-authentication').appleAuth as {isSupported: boolean}).isSupported = true;
  setPlatform('ios');
  google.mockResolvedValue({status: 'success'});
  apple.mockResolvedValue({status: 'success'});
  login.mockResolvedValue(undefined);
  register.mockResolvedValue(undefined);
  mockedAuth.mockReturnValue({
    signInWithGoogle: google,
    signInWithApple: apple,
    login,
    register,
  } as unknown as ReturnType<typeof useAuth>);
});

afterEach(() => { Object.defineProperty(Platform, 'OS', {configurable: true, value: originalPlatform}); });

it.each(['ios', 'android'] as const)('shows the right providers on Welcome, Login, and Register for %s', platform => {
  setPlatform(platform);
  const screens = [
    render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={jest.fn()} />),
    render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />),
    render(<RegisterScreen onShowLogin={jest.fn()} />),
  ];
  for (const [index, renderer] of screens.entries()) {
    const prefix = ['welcome', 'login', 'register'][index];
    expect(renderer.root.findByProps({testID: `${prefix}.social.google`})).toBeTruthy();
    expect(renderer.root.findAllByProps({testID: `${prefix}.social.apple`}).some(node =>
      typeof node.props.onPress === 'function')).toBe(platform === 'ios');
    act(() => renderer.unmount());
  }
});

it('orders Apple, Google, then secondary email on iOS and has no Welcome divider', () => {
  const renderer = render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={jest.fn()} />);
  const order = [...new Set(renderer.root.findAll(node =>
    ['welcome.social.apple', 'welcome.social.google', 'welcome.email'].includes(node.props.testID) &&
    typeof node.props.onPress === 'function').map(node => node.props.testID))];
  expect(order).toEqual(['welcome.social.apple', 'welcome.social.google', 'welcome.email']);
  expect(renderer.root.findAllByType(SecondaryAuthButton)).toHaveLength(1);
  expect(renderer.root.findAllByType(AuthOrDivider)).toHaveLength(0);
  act(() => renderer.unmount());
});

it('shows Google then secondary email on Android and omits the Welcome divider', () => {
  setPlatform('android');
  const renderer = render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={jest.fn()} />);
  const order = [...new Set(renderer.root.findAll(node =>
    ['welcome.social.apple', 'welcome.social.google', 'welcome.email'].includes(node.props.testID) &&
    typeof node.props.onPress === 'function').map(node => node.props.testID))];
  expect(order).toEqual(['welcome.social.google', 'welcome.email']);
  expect(renderer.root.findAllByType(SecondaryAuthButton)).toHaveLength(1);
  expect(renderer.root.findAllByType(AuthOrDivider)).toHaveLength(0);
  act(() => renderer.unmount());
});

it('omits the social block and divider when the platform has no provider', () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'web'});
  const welcome = render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={jest.fn()} />);
  expect(welcome.root.findAllByType(View).filter(node => node.props.testID === 'welcome.social')).toHaveLength(0);
  expect(welcome.root.findAllByType(PrimaryAuthButton)).toHaveLength(1);
  act(() => welcome.unmount());
  const loginScreen = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  const registerScreen = render(<RegisterScreen onShowLogin={jest.fn()} />);
  for (const renderer of [loginScreen, registerScreen]) {
    expect(renderer.root.findAllByType(AuthOrDivider)).toHaveLength(0);
    expect(renderer.root.findAllByType(View).filter(node =>
      node.props.testID === 'login.social' || node.props.testID === 'register.social')).toHaveLength(0);
    act(() => renderer.unmount());
  }
});

it('uses existing Apple support information to omit an unavailable Apple button', () => {
  (jest.requireMock('@invertase/react-native-apple-authentication').appleAuth as {isSupported: boolean}).isSupported = false;
  const renderer = render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={jest.fn()} />);
  expect(renderer.root.findAllByProps({testID: 'welcome.social.apple'})).toHaveLength(0);
  expect(renderer.root.findByProps({testID: 'welcome.social.google'})).toBeTruthy();
  act(() => renderer.unmount());
});

it('puts a social notice and divider above each email form', () => {
  for (const renderer of [
    render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />),
    render(<RegisterScreen onShowLogin={jest.fn()} />),
  ]) {
    const divider = renderer.root.findByType(AuthOrDivider);
    expect(divider).toBeTruthy();
    const text = copy(renderer);
    expect(text).toContain('or continue with email');
    expect(text.indexOf('Continue with Google')).toBeLessThan(text.indexOf('or continue with email'));
    expect(text.indexOf('or continue with email')).toBeLessThan(text.indexOf('Email'));
    act(() => renderer.unmount());
  }
});

it('keeps Welcome email navigation and calls the selected provider', async () => {
  apple.mockResolvedValue({status: 'cancelled'});
  google.mockResolvedValue({status: 'cancelled'});
  const onContinue = jest.fn();
  const renderer = render(<WelcomeScreen onContinue={onContinue} onShowRegister={jest.fn()} />);
  press(renderer, 'welcome.social.apple');
  await act(async () => { await Promise.resolve(); });
  press(renderer, 'welcome.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(apple).toHaveBeenCalledTimes(1);
  expect(google).toHaveBeenCalledTimes(1);
  press(renderer, 'welcome.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(google).toHaveBeenCalledTimes(2);
  act(() => { renderer.root.findByProps({accessibilityLabel: 'Continue with email'}).props.onPress(); });
  expect(onContinue).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('keeps Login values and shows no notice when either provider cancels', async () => {
  google.mockResolvedValue({status: 'cancelled'});
  apple.mockResolvedValue({status: 'cancelled'});
  const renderer = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  act(() => {
    input(renderer, 'Email').props.onChangeText('user@example.com');
    input(renderer, 'Password').props.onChangeText('secret123');
  });
  press(renderer, 'login.social.google');
  await act(async () => { await Promise.resolve(); });
  press(renderer, 'login.social.apple');
  await act(async () => { await Promise.resolve(); });
  expect(google).toHaveBeenCalledTimes(1);
  expect(apple).toHaveBeenCalledTimes(1);
  expect(input(renderer, 'Email').props.value).toBe('user@example.com');
  expect(input(renderer, 'Password').props.value).toBe('secret123');
  expect(renderer.root.findAllByProps({testID: 'login.social.notice'})).toHaveLength(0);
  act(() => renderer.unmount());
});

it('does not autofocus plain Login or Register but keeps explicit Login recovery focus', () => {
  const plainLogin = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  const plainRegister = render(<RegisterScreen onShowLogin={jest.fn()} />);
  expect(mockFocusLabels).toEqual([]);
  act(() => { plainLogin.unmount(); plainRegister.unmount(); });
  const recoveryLogin = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} focusEmail />);
  expect(mockFocusLabels).toEqual(['Email']);
  act(() => recoveryLogin.unmount());
});

it.each(['google', 'apple'] as const)('launches %s from Login and remains busy on success', async provider => {
  const renderer = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  press(renderer, `login.social.${provider}`);
  await act(async () => { await Promise.resolve(); });
  expect(provider === 'google' ? google : apple).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByProps({testID: 'login.social.google'}).props.disabled).toBe(true);
  expect(renderer.root.findAllByProps({testID: 'login.social.notice'})).toHaveLength(0);
  act(() => renderer.unmount());
});

it('blocks a second provider launch and email submit while social sign-in is pending', async () => {
  const pending = deferred();
  google.mockReturnValueOnce(pending.promise);
  const renderer = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  act(() => {
    input(renderer, 'Email').props.onChangeText('user@example.com');
    input(renderer, 'Password').props.onChangeText('secret123');
  });
  press(renderer, 'login.social.google');
  press(renderer, 'login.social.google');
  press(renderer, 'login.social.apple');
  expect(google).toHaveBeenCalledTimes(1);
  expect(apple).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({testID: 'login.social.google'}).props.disabled).toBe(true);
  expect(renderer.root.findAllByProps({testID: 'login.social.apple'})[0].props.accessibilityState.disabled).toBe(true);
  expect(renderer.root.findByProps({accessibilityLabel: 'Sign in'}).props.disabled).toBe(true);
  expect(renderer.root.findByProps({accessibilityLabel: 'Forgot password?'}).props.disabled).toBe(true);
  expect(renderer.root.findAllByProps({accessibilityLabel: 'New to ChainBell? Create account'})[0].props.disabled).toBe(true);
  expect(input(renderer, 'Email').props.editable).toBe(false);
  expect(input(renderer, 'Password').props.editable).toBe(false);
  await act(async () => { pending.resolve({status: 'cancelled'}); await pending.promise; });
  expect(renderer.root.findByProps({testID: 'login.social.google'}).props.disabled).toBe(false);
  expect(input(renderer, 'Email').props.editable).toBe(true);
  act(() => renderer.unmount());
});

it('disables Welcome email and Register navigation during a provider attempt', async () => {
  const welcomePending = deferred();
  google.mockReturnValueOnce(welcomePending.promise);
  const welcome = render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={jest.fn()} />);
  press(welcome, 'welcome.social.google');
  expect(welcome.root.findByProps({testID: 'welcome.email'}).props.disabled).toBe(true);
  expect(welcome.root.findAllByProps({accessibilityLabel: 'Already have an account? Sign in'})[0].props.disabled).toBe(true);
  await act(async () => { welcomePending.resolve({status: 'cancelled'}); await welcomePending.promise; });
  act(() => welcome.unmount());

  const registerPending = deferred();
  google.mockReturnValueOnce(registerPending.promise);
  const registerScreen = render(<RegisterScreen onShowLogin={jest.fn()} />);
  press(registerScreen, 'register.social.google');
  expect(registerScreen.root.findByProps({testID: 'register.back'}).props.disabled).toBe(true);
  expect(registerScreen.root.findByProps({accessibilityLabel: 'Create account'}).props.disabled).toBe(true);
  expect(registerScreen.root.findAllByProps({accessibilityLabel: 'Already have an account? Sign in'})[0].props.disabled).toBe(true);
  expect(registerScreen.root.findAllByProps({testID: 'register.social.apple'})[0].props.accessibilityState.disabled).toBe(true);
  expect(input(registerScreen, 'Email').props.editable).toBe(false);
  expect(input(registerScreen, 'Password').props.editable).toBe(false);
  await act(async () => { registerPending.resolve({status: 'cancelled'}); await registerPending.promise; });
  act(() => registerScreen.unmount());
});

it('keeps Login on AUTH_LINK_REQUIRED with a safe notice and no linking action', async () => {
  google.mockRejectedValueOnce(new ApiError(409, 'Sensitive backend detail', 'AUTH_LINK_REQUIRED'));
  const renderer = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  press(renderer, 'login.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(copy(renderer)).toContain('An existing ChainBell account may be associated with this sign-in.');
  expect(copy(renderer)).not.toContain('Sensitive backend detail');
  expect(copy(renderer)).toContain('Enter your email and password below.');
  expect(renderer.root.findAllByProps({testID: 'login.social.action'}).some(node =>
    node.props.accessibilityLabel === 'Use password' && typeof node.props.onPress === 'function')).toBe(true);
  press(renderer, 'login.social.action');
  expect(mockFocusLabels).toEqual(['Email']);
  expect(input(renderer, 'Email').props.value).toBe('');
  act(() => renderer.unmount());
});

it('preserves Register fields on cancellation and offers Sign in on AUTH_LINK_REQUIRED', async () => {
  const onShowLogin = jest.fn();
  apple.mockResolvedValueOnce({status: 'cancelled'});
  google.mockRejectedValueOnce(new ApiError(409, 'Sensitive backend detail', 'AUTH_LINK_REQUIRED'));
  const renderer = render(<RegisterScreen onShowLogin={onShowLogin} />);
  act(() => {
    input(renderer, 'Email').props.onChangeText('user@example.com');
    input(renderer, 'Password').props.onChangeText('secret123');
    input(renderer, 'Name (optional)').props.onChangeText('Ada');
  });
  press(renderer, 'register.social.apple');
  await act(async () => { await Promise.resolve(); });
  expect(renderer.root.findAllByProps({testID: 'register.social.notice'})).toHaveLength(0);
  press(renderer, 'register.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(input(renderer, 'Email').props.value).toBe('user@example.com');
  expect(input(renderer, 'Password').props.value).toBe('secret123');
  expect(input(renderer, 'Name (optional)').props.value).toBe('Ada');
  expect(copy(renderer)).not.toContain('Sensitive backend detail');
  press(renderer, 'register.social.action');
  expect(onShowLogin).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('shows a contextual Register error without exposing the provider response', async () => {
  apple.mockRejectedValueOnce(new ApiError(401, 'Raw provider token', 'AUTH_INVALID_PROVIDER_TOKEN'));
  const renderer = render(<RegisterScreen onShowLogin={jest.fn()} />);
  press(renderer, 'register.social.apple');
  await act(async () => { await Promise.resolve(); });
  expect(copy(renderer)).toContain('We couldn’t verify your Apple sign-in. Please try again.');
  expect(copy(renderer)).not.toContain('Raw provider token');
  act(() => renderer.unmount());
});

it('retries by launching Google again and clears the previous notice', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => false);
  google.mockRejectedValueOnce(new TypeError('Network request failed'));
  google.mockResolvedValueOnce({status: 'cancelled'});
  const renderer = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  press(renderer, 'login.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(copy(renderer)).toContain('Couldn’t connect. Check your connection and try again.');
  press(renderer, 'login.social.action');
  await act(async () => { await Promise.resolve(); });
  expect(google).toHaveBeenCalledTimes(2);
  expect(dismiss).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByProps({testID: 'login.social.notice'})).toHaveLength(0);
  dismiss.mockRestore();
  act(() => renderer.unmount());
});

it('clears a social notice when email sign-in begins', async () => {
  google.mockRejectedValueOnce(new TypeError('Network request failed'));
  const renderer = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  press(renderer, 'login.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(renderer.root.findAllByProps({testID: 'login.social.notice'}).length).toBeGreaterThan(0);
  act(() => { renderer.root.findByProps({accessibilityLabel: 'Sign in'}).props.onPress(); });
  expect(renderer.root.findAllByProps({testID: 'login.social.notice'})).toHaveLength(0);
  act(() => renderer.unmount());
});

it('offers Use email from Welcome and Login on AUTH_EMAIL_REQUIRED', async () => {
  const onShowRegister = jest.fn();
  google.mockRejectedValueOnce(new ApiError(400, 'Private detail', 'AUTH_EMAIL_REQUIRED'));
  const welcome = render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={onShowRegister} />);
  press(welcome, 'welcome.social.google');
  await act(async () => { await Promise.resolve(); });
  press(welcome, 'welcome.social.action');
  expect(onShowRegister).toHaveBeenCalledTimes(1);
  act(() => welcome.unmount());
  google.mockRejectedValueOnce(new ApiError(400, 'Private detail', 'AUTH_EMAIL_REQUIRED'));
  const loginScreen = render(<LoginScreen onShowRegister={onShowRegister} onForgotPassword={jest.fn()} />);
  press(loginScreen, 'login.social.google');
  await act(async () => { await Promise.resolve(); });
  press(loginScreen, 'login.social.action');
  expect(onShowRegister).toHaveBeenCalledTimes(2);
  act(() => loginScreen.unmount());
});

it('focuses the existing Register email field on AUTH_EMAIL_REQUIRED', async () => {
  apple.mockRejectedValueOnce(new ApiError(400, 'Private detail', 'AUTH_EMAIL_REQUIRED'));
  const renderer = render(<RegisterScreen onShowLogin={jest.fn()} />);
  press(renderer, 'register.social.apple');
  await act(async () => { await Promise.resolve(); });
  press(renderer, 'register.social.action');
  expect(mockFocusLabels).toEqual(['Email']);
  act(() => renderer.unmount());
});

it('removes Google after an Android Play Services failure and promotes email', async () => {
  setPlatform('android');
  google.mockRejectedValueOnce(new ProviderAuthError('google', 'PLAY_SERVICES_NOT_AVAILABLE'));
  const welcome = render(<WelcomeScreen onContinue={jest.fn()} onShowRegister={jest.fn()} />);
  press(welcome, 'welcome.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(welcome.root.findAllByProps({testID: 'welcome.social.google'})).toHaveLength(0);
  expect(welcome.root.findAllByType(PrimaryAuthButton)).toHaveLength(1);
  expect(copy(welcome)).toContain('Google sign-in is unavailable right now.');
  act(() => welcome.unmount());
  google.mockRejectedValueOnce(new ProviderAuthError('google', 'PLAY_SERVICES_NOT_AVAILABLE'));
  const loginScreen = render(<LoginScreen onShowRegister={jest.fn()} onForgotPassword={jest.fn()} />);
  press(loginScreen, 'login.social.google');
  await act(async () => { await Promise.resolve(); });
  expect(loginScreen.root.findAllByType(AuthOrDivider)).toHaveLength(0);
  expect(loginScreen.root.findAllByProps({testID: 'login.social.google'})).toHaveLength(0);
  act(() => loginScreen.unmount());
});

it('offers Sign in from Welcome on AUTH_LINK_REQUIRED', async () => {
  const onContinue = jest.fn();
  google.mockRejectedValueOnce(new ApiError(409, 'Private detail', 'AUTH_LINK_REQUIRED'));
  const renderer = render(<WelcomeScreen onContinue={onContinue} onShowRegister={jest.fn()} />);
  press(renderer, 'welcome.social.google');
  await act(async () => { await Promise.resolve(); });
  press(renderer, 'welcome.social.action');
  expect(onContinue).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});
