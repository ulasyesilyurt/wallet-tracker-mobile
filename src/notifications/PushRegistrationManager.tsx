import {useEffect} from 'react';
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

    let cancelled = false;

    async function registerCurrentToken() {
      try {
        const token = await messaging().getToken();

        console.log('[notifications] token acquisition for authenticated user', {
          acquired: true,
        });

        console.log('[notifications] token registration request', {
          hasAuthorizationHeader: true,
          platform: getCurrentPlatform(),
        });

        await registerDeviceTokenRequest({
          token,
          platform: getCurrentPlatform(),
        });

        if (!cancelled) {
          console.log('[notifications] backend device token save result', {
            saved: true,
          });
        }
      } catch {
        console.log('[notifications] authenticated device token registration failed', {
          failed: true,
        });
      }
    }

    void registerCurrentToken();

    const unsubscribe = messaging().onTokenRefresh(token => {
      console.log('[notifications] token refresh acquired for authenticated user', {
        acquired: true,
      });

      void registerDeviceTokenRequest({
        token,
        platform: getCurrentPlatform(),
      })
        .then(() => {
          console.log('[notifications] backend device token save result', {
            saved: true,
            source: 'token_refresh',
          });
        })
        .catch(() => {
          console.log('[notifications] token refresh registration failed', {
            failed: true,
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
