import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const ACCESS_TOKEN_STORAGE_KEY = 'wallet_tracker_access_token';
const ACCESS_TOKEN_KEYCHAIN_SERVICE = 'wallet_tracker_access_token';
const ACCESS_TOKEN_KEYCHAIN_USERNAME = 'access_token';

export async function getStoredAccessToken() {
  const credentials = await Keychain.getGenericPassword({
    service: ACCESS_TOKEN_KEYCHAIN_SERVICE,
  });

  if (credentials) {
    await AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return credentials.password;
  }

  const legacyAccessToken = await AsyncStorage.getItem(
    ACCESS_TOKEN_STORAGE_KEY,
  );

  if (!legacyAccessToken) {
    return null;
  }

  await storeAccessToken(legacyAccessToken);

  return legacyAccessToken;
}

export async function storeAccessToken(token: string) {
  const stored = await Keychain.setGenericPassword(
    ACCESS_TOKEN_KEYCHAIN_USERNAME,
    token,
    {service: ACCESS_TOKEN_KEYCHAIN_SERVICE},
  );

  if (!stored) {
    throw new Error('Unable to store access token securely');
  }

  await AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export async function clearStoredAccessToken() {
  await Promise.all([
    Keychain.resetGenericPassword({service: ACCESS_TOKEN_KEYCHAIN_SERVICE}),
    AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY),
  ]);
}
