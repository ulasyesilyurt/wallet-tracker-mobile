import {apiRequest} from './client';

export type WalletEvent = {
  id: string;
  walletId: string;
  walletLabel?: string | null;
  walletAddress?: string | null;
  chainId: string;
  transactionHash: string;
  eventType: string;
  assetType?: string;
  assetSymbol: string | null;
  assetName?: string | null;
  amount: string | null;
  usdValue?: number | string | null;
  usdValueStatus?: string | null;
  usdValueSource?: string | null;
  usdValueCalculatedAt?: string | null;
  direction: string | null;
  occurredAt: string;
  createdAt?: string;
  fromAddress?: string | null;
  toAddress?: string | null;
};

type WalletEventsResponse = {
  data: WalletEvent[];
};

export async function getWalletEvents(walletId: string): Promise<WalletEvent[]> {
  const response = await apiRequest<WalletEventsResponse>(`/wallets/${walletId}/events`);

  return [...response.data].sort((left, right) => {
    return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
  });
}
