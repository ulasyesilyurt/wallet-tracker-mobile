export type ProviderSignInResult<T> =
  | {status: 'cancelled'}
  | {status: 'success'; credential: T};

export class ProviderAuthError extends Error {
  readonly provider: 'google' | 'apple';
  readonly code: string;

  constructor(provider: 'google' | 'apple', code: string) {
    super(`${provider} sign-in failed`);
    this.name = 'ProviderAuthError';
    this.provider = provider;
    this.code = code;
  }
}
