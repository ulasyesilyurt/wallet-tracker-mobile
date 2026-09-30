import {NativeModules, Platform} from 'react-native';
import {ProviderAuthError, type ProviderSignInResult} from './providerAuth';

type AppleNoncePair = {rawNonce: string; expectedNonce: string};
type AppleNonceModule = {generate: () => Promise<AppleNoncePair>};
type AppleCredential = {identityToken: string; expectedNonce: string};

function isCancellation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === '1001';
}

export async function requestAppleIdentity(): Promise<ProviderSignInResult<AppleCredential>> {
  if (Platform.OS !== 'ios') throw new ProviderAuthError('apple', 'UNSUPPORTED_PLATFORM');

  const nonceModule = NativeModules.AppleNonce as AppleNonceModule | undefined;
  if (!nonceModule?.generate) throw new ProviderAuthError('apple', 'NONCE_UNAVAILABLE');

  try {
    // Security.framework generates 32 random bytes; CommonCrypto hashes their hex string.
    const {rawNonce, expectedNonce} = await nonceModule.generate();
    if (!/^[0-9a-f]{64}$/.test(rawNonce) || !/^[0-9a-f]{64}$/.test(expectedNonce)) {
      throw new ProviderAuthError('apple', 'NONCE_INVALID');
    }

    const {appleAuth} = require('@invertase/react-native-apple-authentication') as
      typeof import('@invertase/react-native-apple-authentication');
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      // The package hashes this raw value before sending it to Apple.
      nonce: rawNonce,
    });
    if (!response.identityToken) throw new ProviderAuthError('apple', 'MISSING_IDENTITY_TOKEN');
    return {status: 'success', credential: {identityToken: response.identityToken, expectedNonce}};
  } catch (error) {
    if (isCancellation(error)) return {status: 'cancelled'};
    if (error instanceof ProviderAuthError) throw error;
    const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code : 'PROVIDER_FAILURE';
    throw new ProviderAuthError('apple', code);
  }
}
