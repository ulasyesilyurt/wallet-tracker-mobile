import React from 'react';
import {PermissionsAndroid, Platform, SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import messaging from '@react-native-firebase/messaging';
import App from '../App';
import {PushRegistrationManager} from '../src/notifications/PushRegistrationManager';
import {colors} from '../src/theme/colors';
import {authColors} from '../src/theme/auth';
import {walletsColors} from '../src/theme/wallets';
import {SafeAreaScreen} from '../src/components/SafeAreaScreen';

jest.mock('@react-native-firebase/messaging', () => {
  const client = {
    requestPermission: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(),
  };
  const module = Object.assign(jest.fn(() => client), {
    AuthorizationStatus: {AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0},
  });
  return {__esModule: true, default: module};
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));
jest.mock('../src/auth/AuthContext', () => ({
  AuthProvider: ({children}: {children: React.ReactNode}) => children,
}));
jest.mock('../src/navigation/RootNavigator', () => ({RootNavigator: () => null}));
jest.mock('../src/notifications/PushRegistrationManager', () => ({
  PushRegistrationManager: jest.fn(() => null),
}));

const client = messaging();
const requestPermission = jest.mocked(client.requestPermission);
const registerForRemoteMessages = jest.mocked(client.registerDeviceForRemoteMessages);
const pushManager = jest.mocked(PushRegistrationManager);
const originalOS = Platform.OS;

async function renderApp() {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<App />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer!;
}

beforeEach(() => {
  jest.clearAllMocks();
  registerForRemoteMessages.mockResolvedValue(undefined);
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
});

it('uses the shared background for auth, authenticated screens, and the iOS safe area', async () => {
  expect(colors.background).toBe('#08090B');
  expect(walletsColors.background).toBe(colors.background);
  expect(authColors.background).toBe(colors.background);
  const renderer = await renderApp();
  expect(renderer.root.findByType(StatusBar).props.backgroundColor).toBe(colors.background);
  expect(StyleSheet.flatten(renderer.root.findByType(SafeAreaView).props.style).backgroundColor)
    .toBe(colors.background);
  act(() => renderer.unmount());
});

it('gives shared app screens the same background by default', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<SafeAreaScreen testID="screen" />); });
  expect(StyleSheet.flatten(renderer!.root.findByType(View).props.style).backgroundColor)
    .toBe(colors.background);
  act(() => renderer!.unmount());
});

afterEach(() => {
  Object.defineProperty(Platform, 'OS', {value: originalOS, configurable: true});
  jest.restoreAllMocks();
});

it('requests iOS authorization before remote registration and enables token registration', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
  requestPermission.mockResolvedValue(messaging.AuthorizationStatus.AUTHORIZED);

  const renderer = await renderApp();

  expect(requestPermission).toHaveBeenCalledTimes(1);
  expect(registerForRemoteMessages).toHaveBeenCalledTimes(1);
  expect(requestPermission.mock.invocationCallOrder[0]).toBeLessThan(
    registerForRemoteMessages.mock.invocationCallOrder[0],
  );
  expect(pushManager).toHaveBeenLastCalledWith(
    expect.objectContaining({enabled: true}),
    undefined,
  );
  act(() => renderer.unmount());
});

it('keeps iOS token registration disabled when permission is denied', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
  requestPermission.mockResolvedValue(messaging.AuthorizationStatus.DENIED);

  const renderer = await renderApp();

  expect(registerForRemoteMessages).not.toHaveBeenCalled();
  expect(pushManager).toHaveBeenLastCalledWith(
    expect.objectContaining({enabled: false}),
    undefined,
  );
  act(() => renderer.unmount());
});

it('accepts provisional iOS authorization', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
  requestPermission.mockResolvedValue(messaging.AuthorizationStatus.PROVISIONAL);

  const renderer = await renderApp();

  expect(registerForRemoteMessages).toHaveBeenCalledTimes(1);
  expect(pushManager).toHaveBeenLastCalledWith(
    expect.objectContaining({enabled: true}),
    undefined,
  );
  act(() => renderer.unmount());
});

it('does not crash or enable iOS token registration if permission setup fails', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
  requestPermission.mockRejectedValue(new Error('native permission error'));

  const renderer = await renderApp();

  expect(registerForRemoteMessages).not.toHaveBeenCalled();
  expect(pushManager).toHaveBeenLastCalledWith(
    expect.objectContaining({enabled: false}),
    undefined,
  );
  act(() => renderer.unmount());
});

it('keeps Android remote registration behavior without an iOS permission request', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});

  const renderer = await renderApp();

  expect(requestPermission).not.toHaveBeenCalled();
  expect(registerForRemoteMessages).toHaveBeenCalledTimes(1);
  expect(pushManager).toHaveBeenLastCalledWith(
    expect.objectContaining({enabled: true}),
    undefined,
  );
  act(() => renderer.unmount());
});
