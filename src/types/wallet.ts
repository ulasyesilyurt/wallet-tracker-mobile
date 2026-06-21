export type WalletTrackType = 'token_transfer' | 'native_transfer' | 'nft_transfer';

export type Wallet = {
  id: string;
  userId: string;
  chainId: string;
  enabledChains?: string[];
  address: string;
  label: string | null;
  status: string;
  trackTypes: WalletTrackType[];
  createdAt: string;
  updatedAt: string;
};
