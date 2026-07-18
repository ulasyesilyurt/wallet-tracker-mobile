import {apiRequest} from './client';

export type WalletEvent = {
  id: string;
  walletId: string;
  walletLabel?: string | null;
  walletAddress?: string | null;
  chainId: string;
  transactionHash?: string | null;
  eventType: string;
  assetType?: string | null;
  assetSymbol: string | null;
  assetName?: string | null;
  assetContractAddress?: string | null;
  assetTokenId?: string | null;
  assetImageUrl?: string | null;
  assetDecimals?: number | null;
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
