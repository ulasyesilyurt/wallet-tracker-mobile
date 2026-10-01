import React from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {
  AuthFooterLink,
  AuthFormLayout,
  AuthNotice,
  AuthScaffold,
  AuthTextField,
  AuthTextLink,
  PasswordField,
  PasswordRules,
  PrimaryAuthButton,
  SecondaryAuthButton,
} from '../src/components/AuthUI';
import {authColors} from '../src/theme/auth';

let mockSafeAreaInsets = {top: 24, bottom: 24, left: 0, right: 0};

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockSafeAreaInsets,
}));

const originalOS = Platform.OS;

beforeEach(() => {
  mockSafeAreaInsets = {top: 24, bottom: 24, left: 0, right: 0};
});

function render(element: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(element); });
  return renderer;
}

function node(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  const matches = renderer.root.findAllByProps({testID});
  return matches[matches.length - 1];
}

function pressable(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAllByProps({testID}).find(item => item.props.accessibilityRole === 'button' && typeof item.props.onPress === 'function')!;
}

function input(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAllByType(TextInput).find(item => item.props.testID === testID)!;
}

function hasUnderline(renderer: TestRenderer.ReactTestRenderer, color: string) {
  return renderer.root.findAllByType(View).some(item => StyleSheet.flatten(item.props.style)?.borderBottomColor === color);
}

afterEach(() => {
  Object.defineProperty(Platform, 'OS', {value: originalOS, configurable: true});
});

it('scaffolds a safe, keyboard-aware auth screen with accessible navigation and footer', () => {
  Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
  mockSafeAreaInsets = {top: 24, bottom: 24, left: 32, right: 16};
  const onBack = jest.fn();
  const onSignOut = jest.fn();
  const renderer = render(
    <AuthScaffold
      testID="scaffold"
      navLeading="back"
      onBack={onBack}
      navTrailing={{label: 'Sign out', onPress: onSignOut}}
      footer={<Text>Footer</Text>}>
      <Text>Content</Text>
    </AuthScaffold>,
  );
  const avoidingView = renderer.root.findByType(KeyboardAvoidingView);
  const scroll = renderer.root.findByType(ScrollView);
  expect(avoidingView.props.behavior).toBe('padding');
  expect(StyleSheet.flatten(avoidingView.props.style).backgroundColor).toBe(authColors.background);
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({
    flexGrow: 1, paddingTop: 0, paddingBottom: 8, paddingLeft: 20, paddingRight: 20,
  });
  const back = pressable(renderer, 'scaffold.back');
  expect(back.props.accessibilityRole).toBe('button');
  expect(StyleSheet.flatten(back.props.style)).toMatchObject({width: 44, height: 44});
  act(() => back.props.onPress());
  act(() => pressable(renderer, 'scaffold.navTrailing').props.onPress());
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onSignOut).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(Text).map(textNode => textNode.props.children)).toContain('Footer');
  act(() => renderer.unmount());
});

it('retains Android inset handling and the existing form top spacing', () => {
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
  const renderer = render(<AuthFormLayout><Text>Current screen</Text></AuthFormLayout>);
  expect(renderer.root.findByType(KeyboardAvoidingView).props.behavior).toBeUndefined();
  expect(StyleSheet.flatten(renderer.root.findByType(ScrollView).props.contentContainerStyle)).toMatchObject({
    paddingTop: 44, paddingBottom: 32,
  });
  act(() => renderer.unmount());
});

it('renders email autofill, focus and error states without owning validation', () => {
  const renderer = render(<AuthTextField testID="email" label="Email" value="" onChangeText={jest.fn()} emailPreset helper="Helper" />);
  let emailInput = input(renderer, 'email');
  expect(emailInput.props.keyboardType).toBe('email-address');
  expect(emailInput.props.autoComplete).toBe('email');
  expect(emailInput.props.textContentType).toBe('emailAddress');
  expect(emailInput.props.editable).toBe(true);
  expect(node(renderer, 'email.helper').props.children).toBe('Helper');
  act(() => emailInput.props.onFocus({}));
  expect(hasUnderline(renderer, authColors.focus)).toBe(true);

  act(() => renderer.update(<AuthTextField testID="email" label="Email" value="bad" onChangeText={jest.fn()} emailPreset error="Enter a valid email address." />));
  emailInput = input(renderer, 'email');
  expect(emailInput.props.accessibilityHint).toBe('Enter a valid email address.');
  expect(node(renderer, 'email.error').props.children).toBe('Enter a valid email address.');
  expect(renderer.root.findAllByProps({testID: 'email.helper'})).toHaveLength(0);
  expect(hasUnderline(renderer, authColors.error)).toBe(true);

  act(() => renderer.update(<AuthTextField testID="email" label="Email" value="bad" onChangeText={jest.fn()} loading />));
  expect(input(renderer, 'email').props).toMatchObject({
    editable: false, accessibilityState: {disabled: true},
  });
  act(() => renderer.unmount());
});

it('toggles password visibility and keeps current/new autofill variants', () => {
  const renderer = render(<PasswordField testID="password" variant="current" value="secret" onChangeText={jest.fn()} />);
  let passwordInput = input(renderer, 'password');
  expect(passwordInput.props.secureTextEntry).toBe(true);
  expect(passwordInput.props.autoComplete).toBe('current-password');
  act(() => pressable(renderer, 'password.toggle').props.onPress());
  passwordInput = input(renderer, 'password');
  expect(passwordInput.props.secureTextEntry).toBe(false);
  expect(pressable(renderer, 'password.toggle').props.accessibilityLabel).toBe('Hide password');
  act(() => renderer.update(<PasswordField testID="password" variant="new" value="secret" onChangeText={jest.fn()} />));
  expect(input(renderer, 'password').props.autoComplete).toBe('new-password');
  act(() => renderer.unmount());
});

it('shows only the backend-compatible minimum-eight-character password rule', () => {
  const renderer = render(<PasswordRules password="1234567" testID="rules" />);
  expect(node(renderer, 'rules.length').props.accessibilityState.checked).toBe(false);
  act(() => renderer.update(<PasswordRules password="abcdefgh" testID="rules" />));
  expect(node(renderer, 'rules.length').props.accessibilityState.checked).toBe(true);
  expect(renderer.root.findAllByProps({accessibilityLabel: 'A number or symbol'})).toHaveLength(0);
  act(() => renderer.unmount());
});

it('keeps primary and secondary button width stable across enabled, pressed, loading and disabled states', () => {
  const onPress = jest.fn();
  const renderer = render(<PrimaryAuthButton testID="primary" label="Save" loadingLabel="Saving…" onPress={onPress} />);
  let button = pressable(renderer, 'primary');
  expect(StyleSheet.flatten(button.props.style({pressed: false}))).toMatchObject({width: '100%', minHeight: 52, backgroundColor: authColors.primary});
  expect(StyleSheet.flatten(button.props.style({pressed: true})).backgroundColor).toBe(authColors.primaryPressed);
  act(() => button.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);

  act(() => renderer.update(<PrimaryAuthButton testID="primary" label="Save" loadingLabel="Saving…" onPress={onPress} loading />));
  button = pressable(renderer, 'primary');
  expect(button.props).toMatchObject({disabled: true, accessibilityLabel: 'Saving…', accessibilityState: {busy: true}});
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  expect(StyleSheet.flatten(button.props.style({pressed: false})).width).toBe('100%');
  expect(StyleSheet.flatten(button.props.style({pressed: false})).backgroundColor).toBe(authColors.primaryPressed);

  act(() => renderer.update(<PrimaryAuthButton testID="primary" label="Save" onPress={onPress} disabled />));
  button = pressable(renderer, 'primary');
  expect(StyleSheet.flatten(button.props.style({pressed: false})).backgroundColor).toBe(authColors.disabledFill);
  act(() => renderer.update(<SecondaryAuthButton testID="secondary" label="Open mail app" onPress={onPress} disabled />));
  button = pressable(renderer, 'secondary');
  expect(button.props.disabled).toBe(true);
  expect(StyleSheet.flatten(button.props.style({pressed: false}))).toMatchObject({width: '100%', minHeight: 48});
  act(() => renderer.unmount());
});

it('renders request notices and accessible links with 44-point actions', () => {
  const action = jest.fn();
  const renderer = render(
    <View>
      <AuthNotice tone="warning" message="Try again later." action={{label: 'Retry', onPress: action}} testID="notice" />
      <AuthTextLink label="Forgot password?" onPress={action} testID="textLink" />
      <AuthFooterLink prompt="New here?" linkLabel="Create account" onPress={action} testID="footerLink" />
    </View>,
  );
  expect(node(renderer, 'notice').props.accessibilityRole).toBe('alert');
  for (const id of ['notice.action', 'textLink', 'footerLink']) {
    const link = pressable(renderer, id);
    expect(link.props.accessibilityRole).toBe('button');
    expect(StyleSheet.flatten(link.props.style).minHeight).toBe(44);
    act(() => link.props.onPress());
  }
  expect(action).toHaveBeenCalledTimes(3);
  expect(pressable(renderer, 'footerLink').props.accessibilityLabel).toBe('New here? Create account');
  act(() => renderer.unmount());
});
