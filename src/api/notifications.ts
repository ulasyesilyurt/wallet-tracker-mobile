import {apiRequest} from './client';

export type NotificationHistoryItem = {
  id: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  walletEvent: {
    id: string;
    walletId: string;
    walletLabel: string | null;
    walletAddress: string | null;
    transactionHash: string;
    eventType: string;
    direction: string | null;
    assetSymbol: string | null;
    amount: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    chainId: string;
    createdAt: string;
    occurredAt: string;
  };
};

export type NotificationHistoryResponse = {
  items: NotificationHistoryItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

type NotificationHistoryApiResponse = {
  data: NotificationHistoryResponse;
};

export async function getNotificationHistory(limit = 50, offset = 0): Promise<NotificationHistoryResponse> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await apiRequest<NotificationHistoryApiResponse>(
    `/notifications?${searchParams.toString()}`,
  );

  return response.data;
}
