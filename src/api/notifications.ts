import { apiRequest } from './client';

export type NotificationHistoryItem = {
  id: string;
  walletId: string;
  chainId: string;
  type: string;
  category: string;
  severity: string;
  title: string;
  body: string;
  readAt: string | null;
  isRead: boolean;
  relatedEventId: string | null;
  transactionHash: string | null;
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

type NotificationUnreadCountApiResponse = {
  data: {
    unreadCount: number;
  };
};

export type NotificationReadResult = {
  id: string;
  readAt: string;
  isRead: true;
};

type NotificationReadApiResponse = {
  data: NotificationReadResult;
};

type NotificationsReadAllApiResponse = {
  data: {
    updatedCount: number;
  };
};

export async function getNotificationHistory(
  limit = 50,
  offset = 0,
): Promise<NotificationHistoryResponse> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await apiRequest<NotificationHistoryApiResponse>(
    `/notifications?${searchParams.toString()}`,
  );

  return response.data;
}

export async function getNotificationUnreadCount(): Promise<number> {
  const response = await apiRequest<NotificationUnreadCountApiResponse>(
    '/notifications/unread-count',
  );

  return response.data.unreadCount;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationReadResult> {
  const response = await apiRequest<NotificationReadApiResponse>(
    `/notifications/${notificationId}/read`,
    { method: 'PATCH' },
  );

  return response.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiRequest<NotificationsReadAllApiResponse>(
    '/notifications/read-all',
    { method: 'PATCH' },
  );

  return response.data.updatedCount;
}
