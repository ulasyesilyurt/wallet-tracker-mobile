import {ApiError} from '../api/client';
import {ProviderAuthError} from './providerAuth';

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

export type SocialProvider = 'apple' | 'google';

export type SocialAuthNotice = {
  message: string;
  kind: 'retry' | 'unavailable' | 'linkRequired' | 'emailRequired';
  tone: 'error' | 'neutral' | 'warning';
};

export function socialAuthError(error: unknown, provider: SocialProvider): SocialAuthNotice {
  const providerName = provider === 'apple' ? 'Apple' : 'Google';
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'AUTH_INVALID_PROVIDER_TOKEN':
        return {message: `We couldn’t verify your ${providerName} sign-in. Please try again.`, kind: 'retry', tone: 'error'};
      case 'AUTH_PROVIDER_UNAVAILABLE':
        return {message: `${providerName} sign-in is temporarily unavailable. Try again later or continue with email.`, kind: 'unavailable', tone: 'warning'};
      case 'AUTH_LINK_REQUIRED':
        return {message: 'An existing ChainBell account may be associated with this sign-in. Use your existing sign-in method.', kind: 'linkRequired', tone: 'neutral'};
      case 'AUTH_EMAIL_REQUIRED':
        return {message: 'This provider didn’t share a usable email address. Continue with email instead.', kind: 'emailRequired', tone: 'neutral'};
    }
  }
  if (classifyAuthError(error) === 'networkFailure') {
    return {message: 'Couldn’t connect. Check your connection and try again.', kind: 'retry', tone: 'error'};
  }
  if (error instanceof ProviderAuthError && (
    error.code === 'CONFIGURATION_MISSING' || error.code === 'PLAY_SERVICES_NOT_AVAILABLE' ||
    error.code === 'NONCE_UNAVAILABLE'
  )) {
    return {message: `${providerName} sign-in is unavailable right now. Continue with email or try later.`, kind: 'unavailable', tone: 'warning'};
  }
  if (classifyAuthError(error) === 'rateLimited') {
    return {message: 'Too many sign-in attempts. Wait a moment and try again.', kind: 'retry', tone: 'warning'};
  }
  if (classifyAuthError(error) === 'serverError') {
    return {message: 'ChainBell sign-in is temporarily unavailable. Try again later or continue with email.', kind: 'retry', tone: 'warning'};
  }
  if (error instanceof ProviderAuthError) {
    return {message: `Couldn’t open ${providerName} sign-in. Please try again.`, kind: 'retry', tone: 'error'};
  }
  return {message: `Couldn’t complete ${providerName} sign-in. Please try again or continue with email.`, kind: 'retry', tone: 'error'};
}
