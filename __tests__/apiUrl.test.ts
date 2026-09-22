import {resolveApiBaseUrl} from '../src/config/apiUrl';

describe('API base URL resolution', () => {
  it('accepts Android emulator and iOS simulator development URLs', () => {
    expect(resolveApiBaseUrl('http://10.0.2.2:3000', false))
      .toBe('http://10.0.2.2:3000/api/v1');
    expect(resolveApiBaseUrl('http://localhost:3000', false))
      .toBe('http://localhost:3000/api/v1');
  });

  it('accepts a deployed HTTPS release origin', () => {
    expect(resolveApiBaseUrl('https://api.example.com', true))
      .toBe('https://api.example.com/api/v1');
  });

  it.each([undefined, '', '  '])('rejects missing release URL %s', value => {
    expect(() => resolveApiBaseUrl(value, true)).toThrow('Release API URL is required.');
  });

  it('rejects malformed URLs without exposing their content', () => {
    expect(() => resolveApiBaseUrl('not-a-url', true)).toThrow('API URL is malformed.');
    expect(() => resolveApiBaseUrl('https://user:secret@api.example.com', true))
      .toThrow('API URL is malformed.');
    expect(() => resolveApiBaseUrl('https://api.example.com?secret=value', true))
      .toThrow('API URL is malformed.');
  });

  it('rejects non-HTTPS release URLs', () => {
    expect(() => resolveApiBaseUrl('http://api.example.com', true))
      .toThrow('Release API URL must use HTTPS.');
  });

  it.each([
    'https://localhost:3000',
    'https://localhost.:3000',
    'https://127.0.0.1:3000',
    'https://127.1:3000',
    'https://10.0.2.2:3000',
    'https://192.168.1.10:3000',
    'https://wallet.local',
    'https://example.ngrok-free.app',
    'https://localtest.me',
  ])('rejects local or temporary release host %s', value => {
    expect(() => resolveApiBaseUrl(value, true))
      .toThrow('Release API URL must use a deployed, non-local host.');
  });

  it('normalizes trailing slashes and appends /api/v1 exactly once', () => {
    expect(resolveApiBaseUrl('https://api.example.com///', true))
      .toBe('https://api.example.com/api/v1');
    expect(resolveApiBaseUrl('https://api.example.com/api/v1/', true))
      .toBe('https://api.example.com/api/v1');
    expect(resolveApiBaseUrl('https://api.example.com/mobile/', true))
      .toBe('https://api.example.com/mobile/api/v1');
    expect(() => resolveApiBaseUrl('https://api.example.com/api/v1/api/v1', true))
      .toThrow('API URL must contain /api/v1 at most once.');
    expect(() => resolveApiBaseUrl('https://api.example.com/api/v1/extra', true))
      .toThrow('API URL must contain /api/v1 at most once.');
  });

  it('fails closed if native build configuration is unavailable', () => {
    expect(() => resolveApiBaseUrl('http://10.0.2.2:3000', undefined))
      .toThrow('API build configuration is unavailable.');
  });
});
