import {NativeModules} from 'react-native';
import {resolveApiBaseUrl} from './apiUrl';

type NativeApiConfig = {
  apiOrigin?: unknown;
  isRelease?: unknown;
};

export const env = {
  get apiBaseUrl() {
    const nativeApiConfig = NativeModules.ApiConfig as NativeApiConfig | undefined;
    return resolveApiBaseUrl(
      nativeApiConfig?.apiOrigin,
      nativeApiConfig?.isRelease,
    );
  },
} as const;
