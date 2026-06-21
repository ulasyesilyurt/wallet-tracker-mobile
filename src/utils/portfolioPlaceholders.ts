export type WalletChangePlaceholder = {
  percentageText: string;
  isPositive: boolean;
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getWalletChangePlaceholder(walletId: string): WalletChangePlaceholder {
  const hash = hashString(walletId);
  const rawBasisPoints = (hash % 760) + 20;
  const isPositive = hash % 2 === 0;
  const percentage = (rawBasisPoints / 100).toFixed(2);

  return {
    percentageText: `${isPositive ? '+' : '-'}${percentage}%`,
    isPositive,
  };
}
