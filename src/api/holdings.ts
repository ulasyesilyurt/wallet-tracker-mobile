import {apiRequest} from './client';

export type TokenHolding = {
  tokenAddress: string | null;
  symbol: string | null;
  name: string | null;
  balance: string;
  decimals: number;
  logoUrl?: string | null;
  balanceUsd?: number | null;
  isSuspicious: boolean;
  suspicionReasons: string[];
};

export type WalletHoldings = {
  walletId: string;
  chainId: string;
  totalBalanceUsd: number | null;
  holdings: TokenHolding[];
  tokenBalancesAvailable?: boolean;
  tokenBalancesReason?: string | null;
};

type WalletHoldingsResponse = {
  data: WalletHoldings;
};

export async function getWalletHoldings(walletId: string): Promise<WalletHoldings> {
  const response = await apiRequest<WalletHoldingsResponse>('/wallets/' + walletId + '/holdings');
  return response.data;
}
