import {apiRequest} from './client';
import {getSessionUser} from '../auth/session';

type DeviceTokenResponse = {
  data: {
    id: string;
    userId: string;
    fcmToken: string;
    platform: 'ios' | 'android';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

function requireAuthenticatedUserId() {
  const user = getSessionUser();

  if (!user) {
    throw new Error('Authenticated user is required for device token registration');
  }

  return user.id;
}

export async function registerDeviceToken(payload: {
  token: string;
  platform: 'ios' | 'android';
}) {
  const userId = requireAuthenticatedUserId();

  return apiRequest<DeviceTokenResponse>('/users/' + userId + '/device-tokens', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
