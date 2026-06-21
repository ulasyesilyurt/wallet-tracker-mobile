import React, {useEffect} from 'react';
import {Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {useAuth} from '../auth/AuthContext';
import {registerDeviceToken as registerDeviceTokenRequest} from '../api/deviceTokens';

function getCurrentPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function PushRegistrationManager() {
  const {user} = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    const authenticatedUser = user;

    let cancelled = false;

    async function registerCurrentToken() {
      try {
        const token = await messaging().getToken();

        console.log('[notifications] token acquisition for authenticated user', {
          userId: authenticatedUser.id,
          tokenPreview: token.slice(0, 12),
        });

        console.log('[notifications] token registration request', {
          userId: authenticatedUser.id,
          hasAuthorizationHeader: true,
          platform: getCurrentPlatform(),
        });

        const response = await registerDeviceTokenRequest({
          token,
          platform: getCurrentPlatform(),
        });

        if (!cancelled) {
          console.log('[notifications] backend device token save result', {
            userId: authenticatedUser.id,
            deviceTokenId: response.data.id,
            savedForUserId: response.data.userId,
          });
        }
      } catch (error) {
        console.log('[notifications] authenticated device token registration failed', {
          userId: authenticatedUser.id,
          error,
        });
      }
    }

    void registerCurrentToken();

    const unsubscribe = messaging().onTokenRefresh(token => {
      console.log('[notifications] token refresh acquired for authenticated user', {
        userId: authenticatedUser.id,
        tokenPreview: token.slice(0, 12),
      });

      void registerDeviceTokenRequest({
        token,
        platform: getCurrentPlatform(),
      })
        .then(response => {
          console.log('[notifications] backend device token save result', {
            userId: authenticatedUser.id,
            deviceTokenId: response.data.id,
            savedForUserId: response.data.userId,
            source: 'token_refresh',
          });
        })
        .catch(error => {
          console.log('[notifications] token refresh registration failed', {
            userId: authenticatedUser.id,
            error,
          });
        });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  return null;
}
