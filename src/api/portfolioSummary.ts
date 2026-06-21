import {apiRequest} from './client';

export type WalletPortfolioSummary = {
  walletId: string;
  chainId: string;
  holdingsTotalUsd: number | null;
  positionsTotalUsd: number | null;
  totalPortfolioUsd: number | null;
  holdingsValuationAvailable: boolean;
  positionsValuationAvailable: boolean;
  isPartial: boolean;
  reason: string | null;
};

type WalletPortfolioSummaryResponse = {
  data: WalletPortfolioSummary;
};

export async function getWalletPortfolioSummary(
  walletId: string,
  options?: {
    includePositions?: boolean;
  },
): Promise<WalletPortfolioSummary> {
  const includePositionsQuery =
    typeof options?.includePositions === 'boolean'
      ? `?includePositions=${options.includePositions ? 'true' : 'false'}`
      : '';
  const response = await apiRequest<WalletPortfolioSummaryResponse>(
    '/wallets/' + walletId + '/portfolio-summary' + includePositionsQuery,
  );
  return response.data;
}
