jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

type Setup = {
  requestGoogleIdentity: typeof import('../src/auth/googleProvider').requestGoogleIdentity;
  google: {
    configure: jest.Mock;
    hasPlayServices: jest.Mock;
    signIn: jest.Mock;
  };
};

function setup(platform: 'ios' | 'android', config = {
  googleWebClientId: 'web.apps.googleusercontent.com',
  googleIosClientId: 'ios.apps.googleusercontent.com',
  googleIosReversedClientId: 'com.googleusercontent.apps.ios',
}): Setup {
  jest.resetModules();
  const {Platform, NativeModules} = require('react-native') as typeof import('react-native');
  Object.defineProperty(Platform, 'OS', {configurable: true, value: platform});
  NativeModules.ApiConfig = config;
  const {GoogleSignin: google} = jest.requireMock('@react-native-google-signin/google-signin');
  google.hasPlayServices.mockResolvedValue(true);
  google.signIn.mockResolvedValue({type: 'success', data: {idToken: 'google-id-token', user: {email: 'user@example.com'}}});
  const {requestGoogleIdentity} = require('../src/auth/googleProvider') as
    typeof import('../src/auth/googleProvider');
  return {requestGoogleIdentity, google};
}

it('configures the iOS client and Web client once, returning only an ID token', async () => {
  const {requestGoogleIdentity, google} = setup('ios');
  await expect(requestGoogleIdentity()).resolves.toEqual({
    status: 'success', credential: {idToken: 'google-id-token'},
  });
  await requestGoogleIdentity();
  expect(google.configure).toHaveBeenCalledTimes(1);
  expect(google.configure).toHaveBeenCalledWith({
    webClientId: 'web.apps.googleusercontent.com',
    iosClientId: 'ios.apps.googleusercontent.com',
    offlineAccess: false,
  });
  expect(google.hasPlayServices).not.toHaveBeenCalled();
});

it('checks Android Play Services and configures only the Web client ID', async () => {
  const {requestGoogleIdentity, google} = setup('android');
  await expect(requestGoogleIdentity()).resolves.toEqual({
    status: 'success', credential: {idToken: 'google-id-token'},
  });
  expect(google.configure).toHaveBeenCalledWith({
    webClientId: 'web.apps.googleusercontent.com', offlineAccess: false,
  });
  expect(google.hasPlayServices).toHaveBeenCalledWith({showPlayServicesUpdateDialog: true});
});

it('returns cancellation without a provider error', async () => {
  const {requestGoogleIdentity, google} = setup('ios');
  google.signIn.mockResolvedValueOnce({type: 'cancelled', data: null});
  await expect(requestGoogleIdentity()).resolves.toEqual({status: 'cancelled'});
  google.signIn.mockRejectedValueOnce(Object.assign(new Error('Cancelled'), {code: 'SIGN_IN_CANCELLED'}));
  await expect(requestGoogleIdentity()).resolves.toEqual({status: 'cancelled'});
});

it('rejects a missing ID token', async () => {
  const {requestGoogleIdentity, google} = setup('ios');
  google.signIn.mockResolvedValueOnce({type: 'success', data: {idToken: null}});
  await expect(requestGoogleIdentity()).rejects.toMatchObject({
    provider: 'google', code: 'MISSING_ID_TOKEN',
  });
});

it('does not start sign-in when Android Play Services are unavailable', async () => {
  const {requestGoogleIdentity, google} = setup('android');
  google.hasPlayServices.mockResolvedValueOnce(false);
  await expect(requestGoogleIdentity()).rejects.toMatchObject({
    provider: 'google', code: 'PLAY_SERVICES_NOT_AVAILABLE',
  });
  expect(google.signIn).not.toHaveBeenCalled();
});

it('separates native provider failures and does not log token values', async () => {
  const {requestGoogleIdentity, google} = setup('ios');
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await expect(requestGoogleIdentity()).resolves.toEqual({
    status: 'success', credential: {idToken: 'google-id-token'},
  });
  google.signIn.mockRejectedValueOnce(Object.assign(new Error('Failed'), {code: 'IN_PROGRESS'}));
  await expect(requestGoogleIdentity()).rejects.toMatchObject({
    name: 'ProviderAuthError', provider: 'google', code: 'IN_PROGRESS',
  });
  expect(log).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  log.mockRestore();
  warn.mockRestore();
});

it('fails safely when the Web client ID has not been configured', async () => {
  const {requestGoogleIdentity, google} = setup('android', {
    googleWebClientId: '', googleIosClientId: '', googleIosReversedClientId: '',
  });
  await expect(requestGoogleIdentity()).rejects.toMatchObject({
    provider: 'google', code: 'CONFIGURATION_MISSING',
  });
  expect(google.configure).not.toHaveBeenCalled();
});

it('requires the iOS client and reversed URL scheme before opening sign-in', async () => {
  const {requestGoogleIdentity, google} = setup('ios', {
    googleWebClientId: 'web.apps.googleusercontent.com',
    googleIosClientId: 'ios.apps.googleusercontent.com',
    googleIosReversedClientId: '',
  });
  await expect(requestGoogleIdentity()).rejects.toMatchObject({
    provider: 'google', code: 'CONFIGURATION_MISSING',
  });
  expect(google.configure).not.toHaveBeenCalled();
});
