import {NativeModules} from 'react-native';
import {resolveApiBaseUrl} from './apiUrl';

type NativeApiConfig = {
  apiOrigin?: unknown;
  isRelease?: unknown;
  googleWebClientId?: unknown;
  googleIosClientId?: unknown;
  googleIosReversedClientId?: unknown;
};

function publicClientId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export const env = {
  get apiBaseUrl() {
    const nativeApiConfig = NativeModules.ApiConfig as NativeApiConfig | undefined;
    return resolveApiBaseUrl(
      nativeApiConfig?.apiOrigin,
      nativeApiConfig?.isRelease,
    );
  },
  get googleWebClientId() {
    const nativeApiConfig = NativeModules.ApiConfig as NativeApiConfig | undefined;
    return publicClientId(nativeApiConfig?.googleWebClientId);
  },
  get googleIosClientId() {
    const nativeApiConfig = NativeModules.ApiConfig as NativeApiConfig | undefined;
    return publicClientId(nativeApiConfig?.googleIosClientId);
  },
  get googleIosReversedClientId() {
    const nativeApiConfig = NativeModules.ApiConfig as NativeApiConfig | undefined;
    return publicClientId(nativeApiConfig?.googleIosReversedClientId);
  },
} as const;
