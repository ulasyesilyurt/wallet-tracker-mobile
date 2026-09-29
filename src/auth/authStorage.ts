import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const ACCESS_TOKEN_STORAGE_KEY = 'wallet_tracker_access_token';
const ACCESS_TOKEN_KEYCHAIN_SERVICE = 'wallet_tracker_access_token';
const ACCESS_TOKEN_KEYCHAIN_USERNAME = 'access_token';
const REFRESH_TOKEN_KEYCHAIN_SERVICE = 'chainbell_refresh_token';
const REFRESH_TOKEN_KEYCHAIN_USERNAME = 'refresh_token';

let storageWriteTail: Promise<void> = Promise.resolve();

function queueStorageWrite(work: () => Promise<void>): Promise<void> {
  const operation = storageWriteTail.then(work, work);
  storageWriteTail = operation.then(() => undefined, () => undefined);
  return operation;
}

async function writeAccessToken(token: string) {
  const stored = await Keychain.setGenericPassword(
    ACCESS_TOKEN_KEYCHAIN_USERNAME,
    token,
    {service: ACCESS_TOKEN_KEYCHAIN_SERVICE},
  );

  if (!stored) throw new Error('Unable to store access token securely');
  await AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

async function writeRefreshToken(token: string) {
  const stored = await Keychain.setGenericPassword(
    REFRESH_TOKEN_KEYCHAIN_USERNAME,
    token,
    {service: REFRESH_TOKEN_KEYCHAIN_SERVICE},
  );

  if (!stored) throw new Error('Unable to store refresh token securely');
}

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
  await queueStorageWrite(() => writeAccessToken(token));
}

export async function clearStoredAccessToken() {
  await queueStorageWrite(async () => {
    await Promise.all([
      Keychain.resetGenericPassword({service: ACCESS_TOKEN_KEYCHAIN_SERVICE}),
      AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY),
    ]);
  });
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({service: REFRESH_TOKEN_KEYCHAIN_SERVICE});
  return credentials ? credentials.password : null;
}

export async function storeRefreshToken(token: string) {
  await queueStorageWrite(() => writeRefreshToken(token));
}

export async function clearStoredRefreshToken() {
  await queueStorageWrite(async () => {
    await Keychain.resetGenericPassword({service: REFRESH_TOKEN_KEYCHAIN_SERVICE});
  });
}

export async function storeAuthTokens(accessToken: string, refreshToken: string | null) {
  await queueStorageWrite(async () => {
    if (refreshToken) await writeRefreshToken(refreshToken);
    else await Keychain.resetGenericPassword({service: REFRESH_TOKEN_KEYCHAIN_SERVICE});
    await writeAccessToken(accessToken);
  });
}

export async function clearStoredAuthTokens() {
  await queueStorageWrite(async () => {
    await Promise.all([
      Keychain.resetGenericPassword({service: ACCESS_TOKEN_KEYCHAIN_SERVICE}),
      Keychain.resetGenericPassword({service: REFRESH_TOKEN_KEYCHAIN_SERVICE}),
      AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY),
    ]);
  });
}
