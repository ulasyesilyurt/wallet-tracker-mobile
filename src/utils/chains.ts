import {colors} from '../theme/colors';

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  'ethereum-mainnet': 'Ethereum',
  'base-mainnet': 'Base',
  'arbitrum-mainnet': 'Arbitrum',
  'polygon-mainnet': 'Polygon',
};

const CHAIN_TRANSACTION_EXPLORER_BASE_URLS: Record<string, string> = {
  'ethereum-mainnet': 'https://etherscan.io/tx/',
  'base-mainnet': 'https://basescan.org/tx/',
};

const CANONICAL_PROTECTED_TOKEN_ADDRESSES_BY_CHAIN: Record<string, string[]> = {
  'ethereum-mainnet': [
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    '0x6b175474e89094c44da98b954eedeac495271d0f',
  ],
  'base-mainnet': [
    '0x4200000000000000000000000000000000000006',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
  ],
};

export const SUPPORTED_WALLET_CHAIN_OPTIONS = [
  {chainId: 'ethereum-mainnet', label: 'Ethereum'},
  {chainId: 'base-mainnet', label: 'Base'},
] as const;

export function formatChainDisplayName(chainId: string | null | undefined): string {
  if (typeof chainId !== 'string' || chainId.length === 0) {
    return '';
  }

  return CHAIN_DISPLAY_NAMES[chainId] ?? chainId;
}

export function getWalletEnabledChains(chainId: string | null | undefined, enabledChains?: string[]): string[] {
  if (Array.isArray(enabledChains) && enabledChains.length > 0) {
    return [...new Set(enabledChains.filter(Boolean))];
  }

  return chainId ? [chainId] : [];
}

export function formatWalletChainsLabel(chainId: string | null | undefined, enabledChains?: string[]): string {
  return getWalletEnabledChains(chainId, enabledChains)
    .map(formatChainDisplayName)
    .filter(Boolean)
    .join(', ');
}

export function getChainBadgeTheme(chainId: string | null | undefined) {
  switch (chainId) {
    case 'ethereum-mainnet':
      return {
        backgroundColor: 'rgba(98, 126, 234, 0.18)',
        borderColor: 'rgba(129, 153, 255, 0.45)',
        textColor: '#B8C7FF',
      };
    case 'base-mainnet':
      return {
        backgroundColor: 'rgba(0, 82, 255, 0.18)',
        borderColor: 'rgba(73, 138, 255, 0.42)',
        textColor: '#9CC0FF',
      };
    default:
      return {
        backgroundColor: colors.elevated,
        borderColor: colors.border,
        textColor: colors.textSecondary,
      };
  }
}

export function getTransactionExplorerUrl(
  chainId: string | null | undefined,
  transactionHash: string | null | undefined,
): string | null {
  if (
    typeof chainId !== 'string' ||
    chainId.length === 0 ||
    typeof transactionHash !== 'string' ||
    transactionHash.length === 0
  ) {
    return null;
  }

  const baseUrl = CHAIN_TRANSACTION_EXPLORER_BASE_URLS[chainId];

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}${transactionHash}`;
}

export function isCanonicalProtectedTokenAddress(
  chainId: string | null | undefined,
  tokenAddress: string | null | undefined,
): boolean {
  if (
    typeof chainId !== 'string' ||
    chainId.length === 0 ||
    typeof tokenAddress !== 'string' ||
    tokenAddress.length === 0
  ) {
    return false;
  }

  const normalizedAddress = tokenAddress.toLowerCase();
  return CANONICAL_PROTECTED_TOKEN_ADDRESSES_BY_CHAIN[chainId]?.includes(normalizedAddress) ?? false;
}
