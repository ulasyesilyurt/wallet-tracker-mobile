import {ApiError, apiRequest, isAlchemyWebhookSyncFailure, subscribeToEmailVerificationRequired} from '../src/api/client';
import {setSessionAccessToken, setSessionUser} from '../src/auth/session';
import {NativeModules} from 'react-native';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  NativeModules.ApiConfig = {apiOrigin: 'https://api.example.com', isRelease: true};
});

function mockResponse(status: number, body: unknown) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  setSessionAccessToken(null);
  setSessionUser(null);
  delete NativeModules.ApiConfig;
});

it('preserves safe structured backend error fields and message-only callers', async () => {
  setSessionAccessToken('session-token');
  mockResponse(503, {
    error: {
      code: 'ALCHEMY_WEBHOOK_SYNC_FAILED',
      message: 'Wallet change was saved',
      details: {secret: 'never expose this'},
    },
  });

  let received: unknown;
  try {
    await apiRequest('/wallets');
  } catch (error) {
    received = error;
  }

  expect(received).toBeInstanceOf(Error);
  expect(received).toBeInstanceOf(ApiError);
  expect(received).toMatchObject({
    status: 503,
    code: 'ALCHEMY_WEBHOOK_SYNC_FAILED',
    message: 'Wallet change was saved',
  });
  expect((received as Error).message).toBe('Wallet change was saved');
  expect(isAlchemyWebhookSyncFailure(received)).toBe(true);
  expect(JSON.stringify(received)).not.toContain('never expose this');
  expect(globalThis.fetch).toHaveBeenCalledWith(
    'https://api.example.com/api/v1/wallets',
    expect.objectContaining({
      headers: expect.objectContaining({Authorization: 'Bearer session-token'}),
    }),
  );
});

it('falls back safely for malformed and non-JSON error responses', async () => {
  mockResponse(502, {error: {code: {unexpected: true}, message: {secret: 'hidden'}}});
  await expect(apiRequest('/wallets')).rejects.toMatchObject({
    status: 502,
    code: null,
    message: 'Request failed with status 502',
  });

  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 503,
    json: jest.fn().mockRejectedValue(new SyntaxError('invalid JSON')),
  }) as typeof fetch;
  await expect(apiRequest('/wallets')).rejects.toMatchObject({
    status: 503,
    code: null,
    message: 'Request failed with status 503',
  });
});

it('matches only the exact structured sync failure, not other 503 errors', () => {
  expect(isAlchemyWebhookSyncFailure(new ApiError(503, 'failure'))).toBe(false);
  expect(isAlchemyWebhookSyncFailure(
    new ApiError(503, 'failure', 'OTHER_ERROR'),
  )).toBe(false);
  expect(isAlchemyWebhookSyncFailure(
    new ApiError(500, 'failure', 'ALCHEMY_WEBHOOK_SYNC_FAILED'),
  )).toBe(false);
});

it('signals only the exact authenticated verification-required response', async () => {
  const onVerificationRequired = jest.fn();
  const unsubscribe = subscribeToEmailVerificationRequired(onVerificationRequired);
  try {
    setSessionAccessToken('session-token');
    mockResponse(403, {error: {
      code: 'AUTH_EMAIL_VERIFICATION_REQUIRED',
      message: 'Verify your email before accessing this resource.',
    }});
    await expect(apiRequest('/wallets')).rejects.toMatchObject({status: 403, code: 'AUTH_EMAIL_VERIFICATION_REQUIRED'});
    expect(onVerificationRequired).toHaveBeenCalledTimes(1);

    mockResponse(403, {error: {code: 'OTHER_FORBIDDEN', message: 'Forbidden'}});
    await expect(apiRequest('/wallets')).rejects.toBeInstanceOf(ApiError);
    expect(onVerificationRequired).toHaveBeenCalledTimes(1);

    setSessionAccessToken(null);
    mockResponse(403, {error: {code: 'AUTH_EMAIL_VERIFICATION_REQUIRED', message: 'Forbidden'}});
    await expect(apiRequest('/wallets')).rejects.toBeInstanceOf(ApiError);
    expect(onVerificationRequired).toHaveBeenCalledTimes(1);
  } finally {
    unsubscribe();
  }
});

it('ignores a stale verification-required response from before successful verification', async () => {
  const onVerificationRequired = jest.fn();
  const unsubscribe = subscribeToEmailVerificationRequired(onVerificationRequired);
  try {
    setSessionAccessToken('session-token');
    setSessionUser({
      id: 'user-1', email: 'user@example.com', emailVerified: false,
      createdAt: '2026-09-28', updatedAt: '2026-09-28',
    });
    let resolveFetch!: (response: unknown) => void;
    globalThis.fetch = jest.fn().mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; })) as typeof fetch;
    const pendingRequest = apiRequest('/wallets');

    setSessionUser({
      id: 'user-1', email: 'user@example.com', emailVerified: true,
      createdAt: '2026-09-28', updatedAt: '2026-09-28',
    });
    resolveFetch({
      ok: false, status: 403,
      json: jest.fn().mockResolvedValue({error: {
        code: 'AUTH_EMAIL_VERIFICATION_REQUIRED', message: 'Verify your email before accessing this resource.',
      }}),
    });
    await expect(pendingRequest).rejects.toMatchObject({status: 403, code: 'AUTH_EMAIL_VERIFICATION_REQUIRED'});
    expect(onVerificationRequired).not.toHaveBeenCalled();
  } finally {
    unsubscribe();
  }
});
