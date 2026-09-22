import {env} from '../config/env';
import {getSessionAccessToken} from '../auth/session';

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = getSessionAccessToken();
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? {Authorization: 'Bearer ' + accessToken} : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiError(response.status, data);
  }

  return data as T;
}
