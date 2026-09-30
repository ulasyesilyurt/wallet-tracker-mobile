import {Platform} from 'react-native';
import {env} from '../config/env';
import {ProviderAuthError, type ProviderSignInResult} from './providerAuth';

type GoogleCredential = {idToken: string};

let configured = false;

export async function requestGoogleIdentity(): Promise<ProviderSignInResult<GoogleCredential>> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new ProviderAuthError('google', 'UNSUPPORTED_PLATFORM');
  }

  const webClientId = env.googleWebClientId;
  const iosClientId = env.googleIosClientId;
  const iosReversedClientId = env.googleIosReversedClientId;
  if (!webClientId || (Platform.OS === 'ios' && (!iosClientId || !iosReversedClientId))) {
    throw new ProviderAuthError('google', 'CONFIGURATION_MISSING');
  }

  const {GoogleSignin, statusCodes} = require('@react-native-google-signin/google-signin') as
    typeof import('@react-native-google-signin/google-signin');
  try {
    if (!configured) {
      GoogleSignin.configure({
        webClientId,
        ...(Platform.OS === 'ios' ? {iosClientId} : {}),
        offlineAccess: false,
      });
      configured = true;
    }

    if (Platform.OS === 'android') {
      const available = await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      if (!available) throw new ProviderAuthError('google', 'PLAY_SERVICES_NOT_AVAILABLE');
    }

    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return {status: 'cancelled'};
    const idToken = response.data.idToken;
    if (!idToken?.trim()) throw new ProviderAuthError('google', 'MISSING_ID_TOKEN');
    return {status: 'success', credential: {idToken}};
  } catch (error) {
    const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code : 'PROVIDER_FAILURE';
    if (code === statusCodes.SIGN_IN_CANCELLED) return {status: 'cancelled'};
    if (error instanceof ProviderAuthError) throw error;
    throw new ProviderAuthError('google', code);
  }
}
