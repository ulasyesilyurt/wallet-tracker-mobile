import {ApiError} from '../src/api/client';
import {classifyAuthError} from '../src/auth/authErrors';
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
