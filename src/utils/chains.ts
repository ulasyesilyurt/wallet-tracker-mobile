const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  'ethereum-mainnet': 'Ethereum',
  'base-mainnet': 'Base',
  'arbitrum-mainnet': 'Arbitrum',
  'polygon-mainnet': 'Polygon',
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
