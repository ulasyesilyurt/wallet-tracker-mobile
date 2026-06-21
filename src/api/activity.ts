import {apiRequest} from './client';
import type {WalletEvent} from './events';

export type GlobalActivityResponse = {
  items: WalletEvent[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

type ActivityApiResponse = {
  data: GlobalActivityResponse;
};

export async function getGlobalActivity(limit = 50, offset = 0): Promise<GlobalActivityResponse> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await apiRequest<ActivityApiResponse>(`/activity?${searchParams.toString()}`);
  return response.data;
}
