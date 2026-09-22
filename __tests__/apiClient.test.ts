import {ApiError, apiRequest, isAlchemyWebhookSyncFailure} from '../src/api/client';
import {setSessionAccessToken} from '../src/auth/session';

const originalFetch = globalThis.fetch;

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
    expect.any(String),
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
