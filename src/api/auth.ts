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
