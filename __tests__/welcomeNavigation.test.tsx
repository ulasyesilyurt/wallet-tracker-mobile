import React from 'react';
import {Image, ScrollView, StyleSheet, Text} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../src/auth/AuthContext';
import {RootNavigator} from '../src/navigation/RootNavigator';
import {WelcomeScreen} from '../src/screens/WelcomeScreen';
import {LoginScreen} from '../src/screens/LoginScreen';
import {AppNavigator} from '../src/navigation/AppNavigator';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {getItem: jest.fn(), setItem: jest.fn()},
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 24, left: 0, right: 0}),
}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/screens/LoginScreen', () => ({LoginScreen: jest.fn(() => null)}));
jest.mock('../src/screens/RegisterScreen', () => ({RegisterScreen: jest.fn(() => null)}));
jest.mock('../src/navigation/AppNavigator', () => ({AppNavigator: jest.fn(() => null)}));

const auth = jest.mocked(useAuth);
const getItem = jest.mocked(AsyncStorage.getItem);
const setItem = jest.mocked(AsyncStorage.setItem);

async function renderRoot() {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<RootNavigator />);
    await Promise.resolve();
  });
  return renderer!;
}

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({user: null, isInitializing: false} as ReturnType<typeof useAuth>);
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue(undefined);
});

it('shows the branded welcome once, then continues to the existing login flow', async () => {
  const renderer = await renderRoot();

  expect(renderer.root.findByType(WelcomeScreen)).toBeTruthy();
  const copy = renderer.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
  expect(copy).not.toContain('ChainBell');
  expect(copy).toContain('YOUR WALLETS, IN THE KNOW');
  expect(copy).toContain('Real-time wallet alerts and tracking');
  expect(copy).toContain('Track wallets across chains');
  const logos = renderer.root.findAllByType(Image);
  expect(logos).toHaveLength(1);
  expect(logos[0].props.accessibilityLabel).toBe('ChainBell logo');
  const contentStyle = StyleSheet.flatten(
    renderer.root.findByType(ScrollView).props.contentContainerStyle,
  );
  expect(contentStyle.paddingBottom).toBe(44);

  await act(async () => {
    renderer.root.findByProps({accessibilityLabel: 'Continue'}).props.onPress();
  });

  expect(renderer.root.findByType(LoginScreen)).toBeTruthy();
  expect(setItem).toHaveBeenCalledWith('chainbell_welcome_seen', 'true');
  act(() => renderer.unmount());
});

it('skips welcome on later launches', async () => {
  getItem.mockResolvedValue('true');
  const renderer = await renderRoot();

  expect(renderer.root.findByType(LoginScreen)).toBeTruthy();
  expect(renderer.root.findAllByType(WelcomeScreen)).toHaveLength(0);
  act(() => renderer.unmount());
});

it('sends existing signed-in users straight to the app', async () => {
  auth.mockReturnValue({user: {id: 'user-1'}, isInitializing: false} as ReturnType<typeof useAuth>);
  const renderer = await renderRoot();

  expect(renderer.root.findByType(AppNavigator)).toBeTruthy();
  expect(renderer.root.findAllByType(WelcomeScreen)).toHaveLength(0);
  act(() => renderer.unmount());
});

it('still allows continuation when local welcome storage is unavailable', async () => {
  getItem.mockRejectedValue(new Error('storage unavailable'));
  setItem.mockRejectedValue(new Error('storage unavailable'));
  const renderer = await renderRoot();

  expect(renderer.root.findByType(WelcomeScreen)).toBeTruthy();
  await act(async () => {
    renderer.root.findByProps({accessibilityLabel: 'Continue'}).props.onPress();
    await Promise.resolve();
  });

  expect(renderer.root.findByType(LoginScreen)).toBeTruthy();
  act(() => renderer.unmount());
});
