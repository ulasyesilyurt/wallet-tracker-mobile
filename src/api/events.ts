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

export type WalletEventsPagination = {
  limit: number;
  offset: number;
  hasMore: boolean;
};

type WalletEventsApiResponse = {
  data: WalletHistoryItem[];
  pagination?: Partial<WalletEventsPagination>;
};

export type WalletEventsPage = {
  items: WalletHistoryItem[];
  pagination: WalletEventsPagination;
};

export async function getWalletEvents(
  walletId: string,
  limit = 50,
  offset = 0,
): Promise<WalletEventsPage> {
  const searchParams = new URLSearchParams({
    groupTransactions: 'true',
    limit: String(limit),
    offset: String(offset),
  });
  const response = await apiRequest<WalletEventsApiResponse>(
    `/wallets/${walletId}/events?${searchParams.toString()}`,
  );

  return {
    items: [...response.data].sort((left, right) => {
      return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    }),
    pagination: {
      limit:
        typeof response.pagination?.limit === 'number'
          ? response.pagination.limit
          : limit,
      offset:
        typeof response.pagination?.offset === 'number'
          ? response.pagination.offset
          : offset,
      hasMore:
        typeof response.pagination?.hasMore === 'boolean'
          ? response.pagination.hasMore
          : false,
    },
  };
}
