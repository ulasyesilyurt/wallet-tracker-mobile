import {apiRequest} from './client';
import {getSessionUser} from '../auth/session';
import type {Wallet, WalletTrackType} from '../types/wallet';

export type {Wallet, WalletTrackType} from '../types/wallet';

type WalletsResponse = {
  data: Wallet[];
};

type WalletResponse = {
  data: Wallet;
};

export type CreateWalletPayload = {
  chainId: string;
  address: string;
  label?: string;
  trackTypes: WalletTrackType[];
};

type UpdateWalletPayload = {
  address?: string;
  label?: string;
  trackTypes?: WalletTrackType[];
};

function requireAuthenticatedUserId() {
  const user = getSessionUser();

  if (!user) {
    throw new Error('Authenticated user is required');
  }

  return user.id;
}

export async function getWallets(): Promise<Wallet[]> {
  const response = await apiRequest<WalletsResponse>(
    '/users/' + requireAuthenticatedUserId() + '/wallets',
  );
  return response.data;
}

export async function getWalletById(walletId: string): Promise<Wallet | null> {
  const wallets = await getWallets();
  return wallets.find(wallet => wallet.id === walletId) ?? null;
}

export async function createWallet(payload: CreateWalletPayload): Promise<Wallet> {
  const response = await apiRequest<WalletResponse>(
    '/users/' + requireAuthenticatedUserId() + '/wallets',
    {
    method: 'POST',
    body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function updateWallet(walletId: string, payload: UpdateWalletPayload): Promise<Wallet> {
  const response = await apiRequest<WalletResponse>(
    '/users/' + requireAuthenticatedUserId() + '/wallets/' + walletId,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function deleteWallet(walletId: string): Promise<{id: string; deleted: boolean}> {
  const response = await apiRequest<{data: {id: string; deleted: boolean}}>(
    '/users/' + requireAuthenticatedUserId() + '/wallets/' + walletId,
    {
      method: 'DELETE',
    },
  );

  return response.data;
}
