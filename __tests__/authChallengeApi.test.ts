import {apiRequest} from '../src/api/client';
import {
  loginWithEmail,
  logoutCurrentSession,
  registerWithEmail,
  requestEmailVerificationCode,
  verifyEmailVerificationCode,
  requestPasswordResetCode,
  resetPasswordWithCode,
} from '../src/api/auth';

jest.mock('../src/api/client', () => ({apiRequest: jest.fn()}));

const request = jest.mocked(apiRequest);

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({data: {message: 'Accepted'}});
});

it('opts login and registration into refresh tokens without changing their response shape', async () => {
  const data = {user: {id: 'user-1', email: 'user@example.com'}, accessToken: 'access', refreshToken: 'refresh'};
  request.mockResolvedValue({data});
  await expect(loginWithEmail({email: 'user@example.com', password: 'password123'})).resolves.toEqual(data);
  expect(request).toHaveBeenLastCalledWith('/auth/login', {
    method: 'POST', headers: {'X-Auth-Refresh': 'true'},
    body: JSON.stringify({email: 'user@example.com', password: 'password123'}),
  });
  await expect(registerWithEmail({email: 'user@example.com', password: 'password123'})).resolves.toEqual(data);
  expect(request).toHaveBeenLastCalledWith('/auth/register', {
    method: 'POST', headers: {'X-Auth-Refresh': 'true'},
    body: JSON.stringify({email: 'user@example.com', password: 'password123'}),
  });

  request.mockResolvedValueOnce({data: {user: data.user, accessToken: data.accessToken}});
  await expect(loginWithEmail({email: 'user@example.com', password: 'password123'})).resolves.toEqual({
    user: data.user, accessToken: data.accessToken,
  });
});

it('sends backend logout without automatic refresh', async () => {
  await logoutCurrentSession();
  expect(request).toHaveBeenCalledWith('/auth/logout', {
    method: 'POST', body: '{}', skipAuthRefresh: true,
  });
});

it('uses the protected verification request and verify contracts', async () => {
  await requestEmailVerificationCode();
  expect(request).toHaveBeenLastCalledWith('/auth/email-verification/request', {
    method: 'POST', body: '{}',
  });

  const user = {id: 'user-1', email: 'user@example.com', emailVerified: true};
  request.mockResolvedValueOnce({data: {user}});
  await expect(verifyEmailVerificationCode('012345')).resolves.toEqual(user);
  expect(request).toHaveBeenLastCalledWith('/auth/email-verification/verify', {
    method: 'POST', body: JSON.stringify({code: '012345'}),
  });
});

it('uses the neutral forgot-password request and exact reset payload', async () => {
  await requestPasswordResetCode('user@example.com');
  expect(request).toHaveBeenLastCalledWith('/auth/forgot-password', {
    method: 'POST', body: JSON.stringify({email: 'user@example.com'}),
  });

  await resetPasswordWithCode({email: 'user@example.com', code: '123456', newPassword: 'new-password'});
  expect(request).toHaveBeenLastCalledWith('/auth/reset-password', {
    method: 'POST', body: JSON.stringify({email: 'user@example.com', code: '123456', newPassword: 'new-password'}),
  });
});
