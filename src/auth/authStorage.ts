import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_STORAGE_KEY = 'wallet_tracker_access_token';

export async function getStoredAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export async function storeAccessToken(token: string) {
  await AsyncStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export async function clearStoredAccessToken() {
  await AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}
