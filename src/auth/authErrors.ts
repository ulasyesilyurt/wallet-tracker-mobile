import {ApiError} from '../api/client';

export type AuthErrorKind =
  | 'invalidCode'
  | 'verificationRequestLimited'
  | 'rateLimited'
  | 'invalidCredentials'
  | 'accountExists'
  | 'emailVerificationRequired'
  | 'networkFailure'
  | 'serverError'
  | 'unknown';

const NETWORK_ERROR_MESSAGES = new Set([
  'Network request failed',
  'Failed to fetch',
  'Load failed',
]);

// Only the existing ApiError fields are available; no response headers or timer data.
export function classifyAuthError(error: unknown): AuthErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 400 && error.code === 'AUTH_INVALID_CODE') return 'invalidCode';
    if (error.status === 429 && error.code === 'AUTH_CODE_REQUEST_LIMITED') return 'verificationRequestLimited';
    if (error.status === 429) return 'rateLimited';
    if (error.status === 401 && error.code === 'AUTH_INVALID_CREDENTIALS') return 'invalidCredentials';
    if (error.status === 409 && error.code === 'AUTH_EMAIL_IN_USE') return 'accountExists';
    if (error.status === 403 && error.code === 'AUTH_EMAIL_VERIFICATION_REQUIRED') return 'emailVerificationRequired';
    if (error.status >= 500) return 'serverError';
    return 'unknown';
  }

  if (error instanceof TypeError && NETWORK_ERROR_MESSAGES.has(error.message.trim())) {
    return 'networkFailure';
  }

  return 'unknown';
}
