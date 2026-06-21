import {apiRequest} from './client';

export type WalletPosition = {
  protocolName: string;
  positionType: string;
  assetName: string;
  assetSymbol: string;
  amount: string;
  valueUsd: number | null;
};

export type WalletPositions = {
  walletId: string;
  chainId: string;
  positions: WalletPosition[];
};

type WalletPositionsResponse = {
  data: WalletPositions;
};

export async function getWalletPositions(walletId: string): Promise<WalletPositions> {
  const response = await apiRequest<WalletPositionsResponse>('/wallets/' + walletId + '/positions');
  return response.data;
}
