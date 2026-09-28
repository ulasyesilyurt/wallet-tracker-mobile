import React from 'react';
import {Platform} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import messaging from '@react-native-firebase/messaging';
import {registerDeviceToken} from '../src/api/deviceTokens';
import {ApiError} from '../src/api/client';
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
const verifiedUser = {
  id: 'user-1', email: 'user@example.com', emailVerified: true,
  createdAt: '2026-09-28', updatedAt: '2026-09-28',
};
const unverifiedUser = {...verifiedUser, emailVerified: false};

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({user: verifiedUser} as ReturnType<typeof useAuth>);
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

it('does not acquire or register a token for an unverified authenticated user', async () => {
  auth.mockReturnValue({user: unverifiedUser} as ReturnType<typeof useAuth>);
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<PushRegistrationManager enabled />); });

  expect(getToken).not.toHaveBeenCalled();
  expect(onTokenRefresh).not.toHaveBeenCalled();
  expect(saveToken).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('registers once after verification changes false to true, without rerunning for a new user object', async () => {
  auth.mockReturnValue({user: unverifiedUser} as ReturnType<typeof useAuth>);
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<PushRegistrationManager enabled />); });
  expect(saveToken).not.toHaveBeenCalled();

  auth.mockReturnValue({user: verifiedUser} as ReturnType<typeof useAuth>);
  await act(async () => {
    renderer.update(<PushRegistrationManager enabled />);
    await Promise.resolve();
  });
  expect(getToken).toHaveBeenCalledTimes(1);
  expect(saveToken).toHaveBeenCalledTimes(1);
  expect(saveToken).toHaveBeenCalledWith({token: 'fcm-token', platform: 'ios'});
  expect(onTokenRefresh).toHaveBeenCalledTimes(1);

  auth.mockReturnValue({user: {...verifiedUser}} as ReturnType<typeof useAuth>);
  await act(async () => { renderer.update(<PushRegistrationManager enabled />); });
  expect(getToken).toHaveBeenCalledTimes(1);
  expect(saveToken).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('does not retry a verification-required device-token failure or register after becoming unverified', async () => {
  saveToken.mockRejectedValueOnce(new ApiError(403, 'Verify your email before accessing this resource.', 'AUTH_EMAIL_VERIFICATION_REQUIRED'));
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<PushRegistrationManager enabled />);
    await Promise.resolve();
  });
  expect(saveToken).toHaveBeenCalledTimes(1);

  auth.mockReturnValue({user: unverifiedUser} as ReturnType<typeof useAuth>);
  await act(async () => { renderer.update(<PushRegistrationManager enabled />); });
  auth.mockReturnValue({user: {...unverifiedUser}} as ReturnType<typeof useAuth>);
  await act(async () => { renderer.update(<PushRegistrationManager enabled />); });
  expect(getToken).toHaveBeenCalledTimes(1);
  expect(saveToken).toHaveBeenCalledTimes(1);
  expect(onTokenRefresh).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('drops an in-flight token acquisition after the user becomes unverified', async () => {
  let resolveToken!: (token: string) => void;
  getToken.mockReturnValueOnce(new Promise(resolve => { resolveToken = resolve; }));
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<PushRegistrationManager enabled />); });
  expect(getToken).toHaveBeenCalledTimes(1);

  auth.mockReturnValue({user: unverifiedUser} as ReturnType<typeof useAuth>);
  await act(async () => { renderer.update(<PushRegistrationManager enabled />); });
  await act(async () => { resolveToken('late-token'); await Promise.resolve(); });

  expect(saveToken).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

it('keeps Android token registration for verified users', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<PushRegistrationManager enabled />);
    await Promise.resolve();
  });
  expect(saveToken).toHaveBeenCalledWith({token: 'fcm-token', platform: 'android'});
  act(() => renderer.unmount());
});
