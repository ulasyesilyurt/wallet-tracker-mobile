import {apiRequest} from './client';

export type PortfolioPerformance = {
  currentValue: number | null;
  value24hAgo: number | null;
  change: number | null;
  changePercent: number | null;
  isAvailable: boolean;
  isPartial: boolean;
  reason: string | null;
};

type PerformanceResponse = {
  data: PortfolioPerformance;
};

export async function getWalletPerformance(walletId: string): Promise<PortfolioPerformance> {
  const response = await apiRequest<PerformanceResponse>(`/wallets/${walletId}/performance`);
  return response.data;
}

export async function getPortfolioPerformance(): Promise<PortfolioPerformance> {
  const response = await apiRequest<PerformanceResponse>('/portfolio/performance');
  return response.data;
}
