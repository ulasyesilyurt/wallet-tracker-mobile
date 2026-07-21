import {apiRequest} from './client';

type WalletEventFields = {
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
  sourceEventIds?: string[];
};

export type WalletEventItem = WalletEventFields & {
  itemType: 'event';
};

export type LegacyWalletEventItem = WalletEventFields & {
  itemType?: undefined;
};

export type WalletEvent = WalletEventItem | LegacyWalletEventItem;

export type TransactionActivityType = 'nft_purchase' | 'nft_sale' | 'nft_mint';

export type TransactionActivityAsset = {
  sourceEventId?: string | null;
  eventType?: string | null;
  assetType?: string | null;
  assetSymbol?: string | null;
  assetName?: string | null;
  assetContractAddress?: string | null;
  assetTokenId?: string | null;
  assetImageUrl?: string | null;
  assetDecimals?: number | null;
  amount?: string | null;
  usdValue?: number | string | null;
  usdValueStatus?: string | null;
};

export type TransactionActivityItem = {
  itemType: 'transaction';
  activityType: TransactionActivityType;
  id: string;
  walletId: string;
  walletLabel?: string | null;
  walletAddress?: string | null;
  chainId: string;
  transactionHash?: string | null;
  occurredAt: string;
  sourceEventIds?: string[];
  usdValue?: number | string | null;
  usdValueStatus?: string | null;
  sentAssets?: TransactionActivityAsset[] | null;
  receivedAssets?: TransactionActivityAsset[] | null;
};

export type WalletHistoryItem = WalletEvent | TransactionActivityItem;

export function isTransactionActivityItem(
  item: WalletHistoryItem,
): item is TransactionActivityItem {
  return item.itemType === 'transaction';
}

type WalletEventsResponse = {
  data: WalletHistoryItem[];
};

export async function getWalletEvents(walletId: string): Promise<WalletHistoryItem[]> {
  const response = await apiRequest<WalletEventsResponse>(
    `/wallets/${walletId}/events?groupTransactions=true`,
  );

  return [...response.data].sort((left, right) => {
    return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
  });
}
