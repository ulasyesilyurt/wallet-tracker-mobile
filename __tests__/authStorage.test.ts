import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {
  clearStoredAuthTokens,
  clearStoredRefreshToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeAuthTokens,
  storeRefreshToken,
} from '../src/auth/authStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {getItem: jest.fn(), removeItem: jest.fn()},
}));
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

const accessService = 'wallet_tracker_access_token';
const refreshService = 'chainbell_refresh_token';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Keychain.getGenericPassword).mockResolvedValue(false);
  jest.mocked(Keychain.setGenericPassword).mockResolvedValue({service: 'mock', storage: 'mock'} as unknown as Awaited<ReturnType<typeof Keychain.setGenericPassword>>);
  jest.mocked(Keychain.resetGenericPassword).mockResolvedValue(true);
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.removeItem).mockResolvedValue(undefined);
});

it('stores access and refresh credentials in distinct Keychain services and clears both', async () => {
  await storeAuthTokens('access-value', 'refresh-value');
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith('access_token', 'access-value', {service: accessService});
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith('refresh_token', 'refresh-value', {service: refreshService});
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(accessService);
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();

  await clearStoredAuthTokens();
  expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({service: accessService});
  expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({service: refreshService});
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(accessService);
});

it('reads and clears refresh tokens only through the refresh Keychain service', async () => {
  jest.mocked(Keychain.getGenericPassword).mockResolvedValueOnce({
    username: 'refresh_token', password: 'refresh-value', service: refreshService, storage: 'mock',
  } as unknown as Awaited<ReturnType<typeof Keychain.getGenericPassword>>);
  await expect(getStoredRefreshToken()).resolves.toBe('refresh-value');
  expect(Keychain.getGenericPassword).toHaveBeenCalledWith({service: refreshService});
  await storeRefreshToken('rotated-value');
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith('refresh_token', 'rotated-value', {service: refreshService});
  await clearStoredRefreshToken();
  expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({service: refreshService});
});

it('preserves legacy access-token migration without writing refresh tokens to AsyncStorage', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('legacy-access');
  await expect(getStoredAccessToken()).resolves.toBe('legacy-access');
  expect(Keychain.getGenericPassword).toHaveBeenCalledWith({service: accessService});
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith('access_token', 'legacy-access', {service: accessService});
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(accessService);
  expect(Keychain.setGenericPassword).not.toHaveBeenCalledWith('refresh_token', expect.anything(), expect.anything());
});

it('queues logout clearing after an in-progress credential write', async () => {
  let finishWrite!: (value: Awaited<ReturnType<typeof Keychain.setGenericPassword>>) => void;
  jest.mocked(Keychain.setGenericPassword).mockImplementationOnce(() => new Promise(resolve => { finishWrite = resolve; }));
  const storing = storeAuthTokens('access-value', 'refresh-value');
  const clearing = clearStoredAuthTokens();
  await Promise.resolve();
  expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
  finishWrite({service: refreshService, storage: 'mock'} as unknown as Awaited<ReturnType<typeof Keychain.setGenericPassword>>);
  await Promise.all([storing, clearing]);
  expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({service: accessService});
  expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({service: refreshService});
  expect(jest.mocked(Keychain.resetGenericPassword).mock.invocationCallOrder[0]).toBeGreaterThan(
    jest.mocked(Keychain.setGenericPassword).mock.invocationCallOrder[1],
  );
});
