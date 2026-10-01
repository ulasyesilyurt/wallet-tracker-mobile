import {ApiError} from '../src/api/client';
import {classifyAuthError, socialAuthError} from '../src/auth/authErrors';
import {ProviderAuthError} from '../src/auth/providerAuth';
import {verificationModes} from '../src/auth/verificationModes';

it('defines presentation-only copy and gate controls for all four verification modes', () => {
  expect(Object.keys(verificationModes)).toEqual(['register', 'signin', 'restored', 'reset']);
  expect(verificationModes.register).toMatchObject({
    title: 'Check your email', emailActionLabel: 'Wrong email?',
    allowsInitialCodeRequest: true, showsSignOut: true, showsBack: false,
  });
  expect(verificationModes.signin).toMatchObject({
    title: 'Verify your email', emailActionLabel: 'Not you?',
    allowsInitialCodeRequest: true, showsSignOut: true, showsBack: false,
  });
  expect(verificationModes.restored).toMatchObject({
    title: 'Finish verifying your email', emailActionLabel: 'Not you?',
    allowsInitialCodeRequest: false, showsSignOut: true, showsBack: false,
  });
  expect(verificationModes.reset).toMatchObject({
    title: 'Check your email', emailActionLabel: 'Change',
    allowsInitialCodeRequest: false, showsSignOut: false, showsBack: true,
  });
  for (const mode of Object.values(verificationModes)) expect(mode.subtitle).toBeTruthy();
});

it.each([
  [400, 'AUTH_INVALID_CODE', 'invalidCode'],
  [429, 'AUTH_CODE_REQUEST_LIMITED', 'verificationRequestLimited'],
  [429, 'RATE_LIMITED', 'rateLimited'],
  [429, null, 'rateLimited'],
  [401, 'AUTH_INVALID_CREDENTIALS', 'invalidCredentials'],
  [409, 'AUTH_EMAIL_IN_USE', 'accountExists'],
  [403, 'AUTH_EMAIL_VERIFICATION_REQUIRED', 'emailVerificationRequired'],
  [500, null, 'serverError'],
  [503, 'AUTH_EMAIL_UNAVAILABLE', 'serverError'],
  [400, 'AUTH_EXPIRED_CODE', 'unknown'],
  [403, 'OTHER_FORBIDDEN', 'unknown'],
  [401, null, 'unknown'],
] as const)('classifies existing structured errors: %i %s', (status, code, kind) => {
  expect(classifyAuthError(new ApiError(status, 'Safe message', code))).toBe(kind);
});

it('classifies known fetch failures without treating arbitrary exceptions as network errors', () => {
  expect(classifyAuthError(new TypeError('Network request failed'))).toBe('networkFailure');
  expect(classifyAuthError(new TypeError('Failed to fetch'))).toBe('networkFailure');
  expect(classifyAuthError(new Error('Network request failed'))).toBe('unknown');
  expect(classifyAuthError(new TypeError('Bad application state'))).toBe('unknown');
  expect(classifyAuthError(null)).toBe('unknown');
});

it.each([
  ['AUTH_INVALID_PROVIDER_TOKEN', 'We couldn’t verify your Google sign-in. Please try again.', 'retry', 'error'],
  ['AUTH_PROVIDER_UNAVAILABLE', 'Google sign-in is temporarily unavailable. Try again later or continue with email.', 'unavailable', 'warning'],
  ['AUTH_LINK_REQUIRED', 'An existing ChainBell account may be associated with this sign-in. Use your existing sign-in method.', 'linkRequired', 'neutral'],
  ['AUTH_EMAIL_REQUIRED', 'This provider didn’t share a usable email address. Continue with email instead.', 'emailRequired', 'neutral'],
] as const)('maps social backend error %s to safe copy', (code, message, kind, tone) => {
  expect(socialAuthError(new ApiError(409, 'Private backend detail', code), 'google')).toEqual({message, kind, tone});
});

it('maps Apple, network, native, and unknown social errors without exposing raw messages', () => {
  expect(socialAuthError(new ApiError(401, 'Private token detail', 'AUTH_INVALID_PROVIDER_TOKEN'), 'apple').message)
    .toBe('We couldn’t verify your Apple sign-in. Please try again.');
  expect(socialAuthError(new TypeError('Network request failed'), 'google').message)
    .toBe('Couldn’t connect. Check your connection and try again.');
  expect(socialAuthError(new ProviderAuthError('google', 'PLAY_SERVICES_NOT_AVAILABLE'), 'google').message)
    .toContain('unavailable right now');
  expect(socialAuthError(new ApiError(500, 'Private server detail', 'OTHER'), 'apple').message)
    .toBe('ChainBell sign-in is temporarily unavailable. Try again later or continue with email.');
  expect(socialAuthError(new ApiError(429, 'Private rate limit detail'), 'google').message)
    .toBe('Too many sign-in attempts. Wait a moment and try again.');
  expect(socialAuthError(new ProviderAuthError('apple', 'NATIVE_FAILURE'), 'apple').message)
    .toBe('Couldn’t open Apple sign-in. Please try again.');
});
