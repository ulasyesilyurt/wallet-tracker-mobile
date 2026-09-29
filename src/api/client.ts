import {env} from '../config/env';
import {getSessionAccessToken, getSessionUser, setSessionAccessToken, setSessionUser} from '../auth/session';
import type {AuthUser} from '../types/auth';

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
};

let emailVerificationRequiredListener: (() => void) | null = null;
let sessionInvalidatedListener: (() => void) | null = null;
let sessionRefreshedListener: ((user: AuthUser) => void) | null = null;
let refreshFlight: {accessToken: string; promise: Promise<string | null>} | null = null;
let lastRotation: {previous: string; current: string} | null = null;

function loadAuthStorage(): typeof import('../auth/authStorage') {
  // Keep native storage out of API modules that never need a token refresh.
  return require('../auth/authStorage') as typeof import('../auth/authStorage');
}

export function subscribeToEmailVerificationRequired(listener: () => void): () => void {
  emailVerificationRequiredListener = listener;
  return () => {
    if (emailVerificationRequiredListener === listener) emailVerificationRequiredListener = null;
  };
}

export function subscribeToSessionInvalidated(listener: () => void): () => void {
  sessionInvalidatedListener = listener;
  return () => {
    if (sessionInvalidatedListener === listener) sessionInvalidatedListener = null;
  };
}

export function subscribeToSessionRefreshed(listener: (user: AuthUser) => void): () => void {
  sessionRefreshedListener = listener;
  return () => {
    if (sessionRefreshedListener === listener) sessionRefreshedListener = null;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isAlchemyWebhookSyncFailure(error: unknown): error is ApiError {
  return error instanceof ApiError &&
    error.status === 503 &&
    error.code === 'ALCHEMY_WEBHOOK_SYNC_FAILED';
}

function toApiError(status: number, data: unknown): ApiError {
  const envelope = data && typeof data === 'object' && 'error' in data
    ? data.error
    : null;
  const error = envelope && typeof envelope === 'object' ? envelope : null;
  const message = error && 'message' in error && typeof error.message === 'string' &&
    error.message.trim()
    ? error.message
    : `Request failed with status ${status}`;
  const code = error && 'code' in error && typeof error.code === 'string' &&
    error.code.trim()
    ? error.code
    : null;

  return new ApiError(status, message, code);
}

function isRefreshableAccessFailure(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401 &&
    (error.code === 'AUTH_TOKEN_EXPIRED' || error.code === 'AUTH_INVALID_TOKEN');
}

async function invalidateSessionIfCurrent(accessToken: string) {
  if (getSessionAccessToken() !== accessToken) return;
  setSessionAccessToken(null);
  setSessionUser(null);
  lastRotation = null;
  sessionInvalidatedListener?.();
  const {clearStoredAuthTokens} = loadAuthStorage();
  await clearStoredAuthTokens();
}

async function performRefresh(accessToken: string): Promise<string | null> {
  const {getStoredRefreshToken, storeAuthTokens} = loadAuthStorage();
  const refreshToken = await getStoredRefreshToken();
  if (getSessionAccessToken() !== accessToken) return null;
  if (!refreshToken) {
    await invalidateSessionIfCurrent(accessToken);
    return null;
  }

  // Deliberately use fetch directly: refresh has no Bearer token and cannot recurse.
  const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({refreshToken}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = toApiError(response.status, data);
    if (error.status === 401 && error.code === 'AUTH_INVALID_REFRESH_TOKEN') {
      await invalidateSessionIfCurrent(accessToken);
    }
    throw error;
  }

  const envelope = data && typeof data === 'object' && 'data' in data ? data.data : null;
  const tokens = envelope && typeof envelope === 'object' ? envelope : null;
  if (!tokens || !('accessToken' in tokens) || typeof tokens.accessToken !== 'string' ||
    !('refreshToken' in tokens) || typeof tokens.refreshToken !== 'string' ||
    !('user' in tokens) || !tokens.user || typeof tokens.user !== 'object') {
    await invalidateSessionIfCurrent(accessToken);
    throw new Error('Invalid refresh response.');
  }
  const nextUser = tokens.user as AuthUser;
  if (getSessionAccessToken() !== accessToken) return null;

  try {
    await storeAuthTokens(tokens.accessToken, tokens.refreshToken);
  } catch (error) {
    await invalidateSessionIfCurrent(accessToken);
    throw error;
  }
  if (getSessionAccessToken() !== accessToken) return null;
  setSessionAccessToken(tokens.accessToken);
  setSessionUser(nextUser);
  lastRotation = {previous: accessToken, current: tokens.accessToken};
  sessionRefreshedListener?.(nextUser);
  return tokens.accessToken;
}

function refreshOnce(accessToken: string): Promise<string | null> {
  if (refreshFlight) {
    if (refreshFlight.accessToken === accessToken) return refreshFlight.promise;
    return refreshFlight.promise.then(
      () => getSessionAccessToken() === accessToken ? refreshOnce(accessToken) : null,
      () => getSessionAccessToken() === accessToken ? refreshOnce(accessToken) : null,
    );
  }
  const promise = performRefresh(accessToken);
  refreshFlight = {accessToken, promise};
  promise.then(
    () => { if (refreshFlight?.promise === promise) refreshFlight = null; },
    () => { if (refreshFlight?.promise === promise) refreshFlight = null; },
  );
  return promise;
}

async function sendRequest<T>(path: string, options: RequestOptions, accessToken: string | null): Promise<T> {
  const fetchOptions = {...options};
  delete fetchOptions.skipAuthRefresh;
  const wasUnverifiedAtStart = getSessionUser()?.emailVerified === false;
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...fetchOptions,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? {Authorization: 'Bearer ' + accessToken} : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = toApiError(response.status, data);
    if (accessToken && getSessionAccessToken() === accessToken &&
      !(wasUnverifiedAtStart && getSessionUser()?.emailVerified === true) &&
      error.status === 403 && error.code === 'AUTH_EMAIL_VERIFICATION_REQUIRED') {
      emailVerificationRequiredListener?.();
    }
    throw error;
  }

  return data as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = getSessionAccessToken();
  try {
    return await sendRequest<T>(path, options, accessToken);
  } catch (error) {
    if (options.skipAuthRefresh || path === '/auth/refresh' || !accessToken) throw error;
    if (!isRefreshableAccessFailure(error)) {
      if (error instanceof ApiError && error.status === 401 && error.code === 'AUTH_USER_NOT_FOUND') {
        await invalidateSessionIfCurrent(accessToken);
      }
      throw error;
    }

    const currentToken = getSessionAccessToken();
    let retryToken: string | null = null;
    if (currentToken === accessToken) retryToken = await refreshOnce(accessToken);
    else if (lastRotation?.previous === accessToken && lastRotation.current === currentToken) retryToken = currentToken;
    if (!retryToken || getSessionAccessToken() !== retryToken) throw error;

    try {
      return await sendRequest<T>(path, options, retryToken);
    } catch (retryError) {
      if (isRefreshableAccessFailure(retryError)) await invalidateSessionIfCurrent(retryToken);
      throw retryError;
    }
  }
}
