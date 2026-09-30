import {NativeModules, Platform} from 'react-native';
import {requestAppleIdentity} from '../src/auth/appleProvider';
import {ProviderAuthError} from '../src/auth/providerAuth';

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    Operation: {LOGIN: 0},
    Scope: {FULL_NAME: 0, EMAIL: 1},
    performRequest: jest.fn(),
  },
}));

const {appleAuth} = jest.requireMock('@invertase/react-native-apple-authentication');
const {createHash} = require('crypto') as {
  createHash: (algorithm: string) => {update: (value: string) => {digest: (encoding: string) => string}};
};
const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');

function noncePair(rawNonce: string) {
  return {
    rawNonce,
    expectedNonce: createHash('sha256').update(rawNonce).digest('hex'),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
  NativeModules.AppleNonce = {generate: jest.fn().mockResolvedValue(noncePair('a'.repeat(64)))};
  appleAuth.performRequest.mockResolvedValue({identityToken: 'apple-id-token'});
});

afterAll(() => {
  if (originalPlatform) Object.defineProperty(Platform, 'OS', originalPlatform);
  else delete (Platform as {OS?: string}).OS;
});

it('rejects Android without invoking native Apple authentication', async () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'});
  await expect(requestAppleIdentity()).rejects.toMatchObject({
    provider: 'apple', code: 'UNSUPPORTED_PLATFORM',
  });
  expect(NativeModules.AppleNonce.generate).not.toHaveBeenCalled();
  expect(appleAuth.performRequest).not.toHaveBeenCalled();
});

it('passes a fresh raw nonce per attempt and returns its lowercase SHA-256 hex digest', async () => {
  const first = noncePair('a'.repeat(64));
  const second = noncePair('b'.repeat(64));
  NativeModules.AppleNonce.generate
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(second);

  await expect(requestAppleIdentity()).resolves.toEqual({
    status: 'success', credential: {identityToken: 'apple-id-token', expectedNonce: first.expectedNonce},
  });
  await expect(requestAppleIdentity()).resolves.toEqual({
    status: 'success', credential: {identityToken: 'apple-id-token', expectedNonce: second.expectedNonce},
  });
  expect(NativeModules.AppleNonce.generate).toHaveBeenCalledTimes(2);
  expect(appleAuth.performRequest).toHaveBeenNthCalledWith(1, expect.objectContaining({nonce: first.rawNonce}));
  expect(appleAuth.performRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({nonce: second.rawNonce}));
  expect(first.expectedNonce).toMatch(/^[0-9a-f]{64}$/);
  expect(second.expectedNonce).toMatch(/^[0-9a-f]{64}$/);
});

it('returns cancellation without an error', async () => {
  appleAuth.performRequest.mockRejectedValueOnce(Object.assign(new Error('Cancelled'), {code: '1001'}));
  await expect(requestAppleIdentity()).resolves.toEqual({status: 'cancelled'});
});

it('requires an identity token', async () => {
  appleAuth.performRequest.mockResolvedValueOnce({identityToken: null});
  await expect(requestAppleIdentity()).rejects.toMatchObject({
    provider: 'apple', code: 'MISSING_IDENTITY_TOKEN',
  });
});

it('separates native provider failures from backend errors without logging credentials', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  appleAuth.performRequest.mockRejectedValueOnce(Object.assign(new Error('Unavailable'), {code: 'NATIVE_FAILURE'}));
  await expect(requestAppleIdentity()).rejects.toMatchObject({
    name: 'ProviderAuthError', provider: 'apple', code: 'NATIVE_FAILURE',
  } satisfies Partial<ProviderAuthError>);
  expect(log).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  log.mockRestore();
  warn.mockRestore();
});
