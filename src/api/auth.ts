import {apiRequest} from './client';
import type {AuthUser} from '../types/auth';

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

type AuthResponseEnvelope = {
  data: AuthResponse;
};

type MeResponseEnvelope = {
  data: {
    user: AuthUser;
  };
};

export async function registerWithEmail(payload: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponseEnvelope>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function loginWithEmail(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponseEnvelope>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function getAuthenticatedUser(): Promise<AuthUser> {
  const response = await apiRequest<MeResponseEnvelope>('/auth/me');
  return response.data.user;
}

type MessageEnvelope = {data: {message: string}};

export async function requestEmailVerificationCode(): Promise<void> {
  await apiRequest<MessageEnvelope>('/auth/email-verification/request', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function verifyEmailVerificationCode(code: string): Promise<AuthUser> {
  const response = await apiRequest<MeResponseEnvelope>('/auth/email-verification/verify', {
    method: 'POST',
    body: JSON.stringify({code}),
  });
  return response.data.user;
}

export async function requestPasswordResetCode(email: string): Promise<void> {
  await apiRequest<MessageEnvelope>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({email}),
  });
}

export async function resetPasswordWithCode(payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  await apiRequest<MessageEnvelope>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
