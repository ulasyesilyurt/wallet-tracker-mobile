import React from 'react';
import {Platform} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import messaging from '@react-native-firebase/messaging';
import {registerDeviceToken} from '../src/api/deviceTokens';
import {useAuth} from '../src/auth/AuthContext';
import {PushRegistrationManager} from '../src/notifications/PushRegistrationManager';

jest.mock('@react-native-firebase/messaging', () => {
  const client = {
    getToken: jest.fn(),
    onTokenRefresh: jest.fn(() => jest.fn()),
  };
  return {__esModule: true, default: jest.fn(() => client)};
});
jest.mock('../src/api/deviceTokens', () => ({registerDeviceToken: jest.fn()}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));

const client = messaging();
const getToken = jest.mocked(client.getToken);
const onTokenRefresh = jest.mocked(client.onTokenRefresh);
const saveToken = jest.mocked(registerDeviceToken);
const auth = jest.mocked(useAuth);
const originalOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({user: {id: 'user-1'}} as ReturnType<typeof useAuth>);
  getToken.mockResolvedValue('fcm-token');
  saveToken.mockResolvedValue({} as Awaited<ReturnType<typeof registerDeviceToken>>);
  Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
});

afterEach(() => {
  Object.defineProperty(Platform, 'OS', {value: originalOS, configurable: true});
});

it('does not acquire or register an iOS token until push setup is ready', async () => {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<PushRegistrationManager enabled={false} />);
  });

  expect(getToken).not.toHaveBeenCalled();
  expect(onTokenRefresh).not.toHaveBeenCalled();
  expect(saveToken).not.toHaveBeenCalled();

  await act(async () => {
    renderer!.update(<PushRegistrationManager enabled />);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(getToken).toHaveBeenCalledTimes(1);
  expect(saveToken).toHaveBeenCalledWith({token: 'fcm-token', platform: 'ios'});
  expect(onTokenRefresh).toHaveBeenCalledTimes(1);
  act(() => renderer!.unmount());
});
