import {ApiError, apiRequest, isAlchemyWebhookSyncFailure, subscribeToEmailVerificationRequired, subscribeToSessionInvalidated} from '../src/api/client';
import {getSessionAccessToken, setSessionAccessToken, setSessionUser} from '../src/auth/session';
import {clearStoredAuthTokens, getStoredRefreshToken, storeAuthTokens} from '../src/auth/authStorage';
import {NativeModules} from 'react-native';

jest.mock('../src/auth/authStorage', () => ({
  getStoredRefreshToken: jest.fn(),
  storeAuthTokens: jest.fn(),
  clearStoredAuthTokens: jest.fn(),
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  NativeModules.ApiConfig = {apiOrigin: 'https://api.example.com', isRelease: true};
  jest.clearAllMocks();
  jest.mocked(getStoredRefreshToken).mockResolvedValue(null);
  jest.mocked(storeAuthTokens).mockResolvedValue(undefined);
  jest.mocked(clearStoredAuthTokens).mockResolvedValue(undefined);
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

const refreshedUser = {
  id: 'user-1', email: 'user@example.com', emailVerified: true,
  createdAt: '2026-09-28', updatedAt: '2026-09-28',
};

function response(status: number, body: unknown) {
  return {ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body)};
}

it('refreshes an expired access token once, stores both rotated credentials, and retries with the new access token', async () => {
  setSessionAccessToken('expired-access');
  setSessionUser(refreshedUser);
  jest.mocked(getStoredRefreshToken).mockResolvedValue('old-refresh');
  globalThis.fetch = jest.fn().mockImplementation((url: string, options: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return Promise.resolve(response(200, {data: {
      user: refreshedUser, accessToken: 'new-access', refreshToken: 'new-refresh',
    }}));
    if ((options.headers as Record<string, string>).Authorization === 'Bearer expired-access') {
      return Promise.resolve(response(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}}));
    }
    return Promise.resolve(response(200, {data: {ok: true}}));
  }) as typeof fetch;

  await expect(apiRequest('/wallets')).resolves.toEqual({data: {ok: true}});
  expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  expect(globalThis.fetch).toHaveBeenNthCalledWith(2,
    'https://api.example.com/api/v1/auth/refresh',
    expect.objectContaining({method: 'POST', body: JSON.stringify({refreshToken: 'old-refresh'})}),
  );
  expect((jest.mocked(globalThis.fetch).mock.calls[1][1] as RequestInit).headers).not.toHaveProperty('Authorization');
  expect(jest.mocked(globalThis.fetch).mock.calls[2][1]).toEqual(expect.objectContaining({
    headers: expect.objectContaining({Authorization: 'Bearer new-access'}),
  }));
  expect(storeAuthTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
  expect(getSessionAccessToken()).toBe('new-access');
});

it('shares one refresh flight across simultaneous expired requests', async () => {
  setSessionAccessToken('parallel-old');
  jest.mocked(getStoredRefreshToken).mockResolvedValue('parallel-refresh');
  let resolveRefresh!: (value: ReturnType<typeof response>) => void;
  const pendingRefresh = new Promise<ReturnType<typeof response>>(resolve => { resolveRefresh = resolve; });
  globalThis.fetch = jest.fn().mockImplementation((url: string, options: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return pendingRefresh;
    if ((options.headers as Record<string, string>).Authorization === 'Bearer parallel-old') {
      return Promise.resolve(response(401, {error: {code: 'AUTH_INVALID_TOKEN', message: 'Invalid.'}}));
    }
    return Promise.resolve(response(200, {data: {ok: true}}));
  }) as typeof fetch;

  const requests = [apiRequest('/wallets'), apiRequest('/events'), apiRequest('/notifications')];
  await new Promise<void>(resolve => setImmediate(() => resolve()));
  expect(jest.mocked(globalThis.fetch).mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
  resolveRefresh(response(200, {data: {
    user: refreshedUser, accessToken: 'parallel-new', refreshToken: 'parallel-next',
  }}));
  await expect(Promise.all(requests)).resolves.toHaveLength(3);
  expect(storeAuthTokens).toHaveBeenCalledTimes(1);
  expect(jest.mocked(globalThis.fetch).mock.calls.filter(([, options]) =>
    (options as RequestInit).headers && (options as RequestInit).headers &&
    ((options as RequestInit).headers as Record<string, string>).Authorization === 'Bearer parallel-new')).toHaveLength(3);
});

it('clears credentials after password-reset revocation rejects the refresh credential', async () => {
  setSessionAccessToken('revoked-access');
  jest.mocked(getStoredRefreshToken).mockResolvedValue('revoked-refresh');
  const invalidated = jest.fn();
  const unsubscribe = subscribeToSessionInvalidated(invalidated);
  globalThis.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(url.endsWith('/auth/refresh')
    ? response(401, {error: {code: 'AUTH_INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.'}})
    : response(401, {error: {code: 'AUTH_INVALID_TOKEN', message: 'Invalid access token.'}}))) as typeof fetch;
  try {
    await expect(apiRequest('/wallets')).rejects.toMatchObject({status: 401, code: 'AUTH_INVALID_REFRESH_TOKEN'});
    expect(clearStoredAuthTokens).toHaveBeenCalledTimes(1);
    expect(getSessionAccessToken()).toBeNull();
    expect(invalidated).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  } finally {
    unsubscribe();
  }
});

it('does not loop when refresh is unavailable or the retried request also fails', async () => {
  setSessionAccessToken('missing-refresh-access');
  mockResponse(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}});
  await expect(apiRequest('/wallets')).rejects.toMatchObject({status: 401, code: 'AUTH_TOKEN_EXPIRED'});
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(clearStoredAuthTokens).toHaveBeenCalledTimes(1);

  jest.clearAllMocks();
  setSessionAccessToken('retry-old');
  jest.mocked(getStoredRefreshToken).mockResolvedValue('retry-refresh');
  jest.mocked(storeAuthTokens).mockResolvedValue(undefined);
  jest.mocked(clearStoredAuthTokens).mockResolvedValue(undefined);
  globalThis.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(url.endsWith('/auth/refresh')
    ? response(200, {data: {user: refreshedUser, accessToken: 'retry-new', refreshToken: 'retry-next'}})
    : response(401, {error: {code: 'AUTH_INVALID_TOKEN', message: 'Invalid.'}}))) as typeof fetch;
  await expect(apiRequest('/wallets')).rejects.toMatchObject({status: 401, code: 'AUTH_INVALID_TOKEN'});
  expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  expect(getSessionAccessToken()).toBeNull();
});

it('preserves stored credentials on a transient refresh network failure', async () => {
  setSessionAccessToken('network-old');
  jest.mocked(getStoredRefreshToken).mockResolvedValue('network-refresh');
  globalThis.fetch = jest.fn().mockImplementation((url: string) => url.endsWith('/auth/refresh')
    ? Promise.reject(new TypeError('Network request failed'))
    : Promise.resolve(response(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}}))) as typeof fetch;
  await expect(apiRequest('/wallets')).rejects.toThrow('Network request failed');
  expect(clearStoredAuthTokens).not.toHaveBeenCalled();
  expect(getSessionAccessToken()).toBe('network-old');
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
});

it.each([429, 503])('retains credentials when refresh returns HTTP %i', async status => {
  setSessionAccessToken(`temporary-${status}`);
  jest.mocked(getStoredRefreshToken).mockResolvedValue('still-valid-refresh');
  globalThis.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(url.endsWith('/auth/refresh')
    ? response(status, {error: {code: 'TEMPORARY_ERROR', message: 'Try again later.'}})
    : response(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}}))) as typeof fetch;
  await expect(apiRequest('/wallets')).rejects.toMatchObject({status});
  expect(clearStoredAuthTokens).not.toHaveBeenCalled();
  expect(getSessionAccessToken()).toBe(`temporary-${status}`);
});

it('does not restore credentials when refresh completes after local sign-out', async () => {
  setSessionAccessToken('late-old');
  jest.mocked(getStoredRefreshToken).mockResolvedValue('late-refresh');
  let resolveRefresh!: (value: ReturnType<typeof response>) => void;
  const pendingRefresh = new Promise<ReturnType<typeof response>>(resolve => { resolveRefresh = resolve; });
  globalThis.fetch = jest.fn().mockImplementation((url: string) => url.endsWith('/auth/refresh')
    ? pendingRefresh
    : Promise.resolve(response(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}}))) as typeof fetch;
  const request = apiRequest('/wallets');
  await new Promise<void>(resolve => setImmediate(() => resolve()));
  setSessionAccessToken(null);
  setSessionUser(null);
  resolveRefresh(response(200, {data: {
    user: refreshedUser, accessToken: 'late-new', refreshToken: 'late-rotated',
  }}));
  await expect(request).rejects.toMatchObject({status: 401, code: 'AUTH_TOKEN_EXPIRED'});
  expect(storeAuthTokens).not.toHaveBeenCalled();
  expect(getSessionAccessToken()).toBeNull();
});

it('does not refresh permission failures, verification 403, or the refresh endpoint itself', async () => {
  setSessionAccessToken('no-refresh-access');
  jest.mocked(getStoredRefreshToken).mockResolvedValue('available-refresh');
  mockResponse(403, {error: {code: 'AUTH_EMAIL_VERIFICATION_REQUIRED', message: 'Verify email.'}});
  await expect(apiRequest('/wallets')).rejects.toMatchObject({status: 403, code: 'AUTH_EMAIL_VERIFICATION_REQUIRED'});
  expect(getStoredRefreshToken).not.toHaveBeenCalled();
  mockResponse(403, {error: {code: 'OTHER_FORBIDDEN', message: 'Forbidden.'}});
  await expect(apiRequest('/wallets')).rejects.toMatchObject({status: 403});
  expect(getStoredRefreshToken).not.toHaveBeenCalled();
  mockResponse(400, {error: {code: 'VALIDATION_ERROR', message: 'Invalid request.'}});
  await expect(apiRequest('/wallets')).rejects.toMatchObject({status: 400});
  expect(getStoredRefreshToken).not.toHaveBeenCalled();
  mockResponse(401, {error: {code: 'AUTH_TOKEN_EXPIRED', message: 'Expired.'}});
  await expect(apiRequest('/auth/refresh')).rejects.toMatchObject({status: 401});
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(getStoredRefreshToken).not.toHaveBeenCalled();
});
