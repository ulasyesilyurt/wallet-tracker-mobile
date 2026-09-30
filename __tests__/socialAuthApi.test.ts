import {loginWithApple, loginWithGoogle} from '../src/api/auth';
import {apiRequest} from '../src/api/client';

jest.mock('../src/api/client', () => ({apiRequest: jest.fn()}));

const user = {
  id: 'social-user', email: 'user@example.com', emailVerified: true,
  createdAt: '2026-09-30', updatedAt: '2026-09-30',
};
const data = {user, accessToken: 'chainbell-access', refreshToken: 'chainbell-refresh'};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiRequest).mockResolvedValue({data});
});

it('sends only the Google ID token and requests a refresh credential', async () => {
  await expect(loginWithGoogle('google-id-token')).resolves.toEqual(data);
  expect(apiRequest).toHaveBeenCalledWith('/auth/google', {
    method: 'POST',
    headers: {'X-Auth-Refresh': 'true'},
    body: JSON.stringify({idToken: 'google-id-token'}),
  });
});

it('sends the Apple identity token and signed nonce value', async () => {
  const payload = {identityToken: 'apple-id-token', expectedNonce: 'nonce-hash'};
  await expect(loginWithApple(payload)).resolves.toEqual(data);
  expect(apiRequest).toHaveBeenCalledWith('/auth/apple', {
    method: 'POST',
    headers: {'X-Auth-Refresh': 'true'},
    body: JSON.stringify(payload),
  });
});
