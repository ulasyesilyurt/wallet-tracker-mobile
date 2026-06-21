import {colors} from '../theme/colors';

const walletAccentPalette = [
  '#5E8EF5',
  '#30D17E',
  '#F5A65E',
  '#C084FC',
  '#56C7D9',
  '#F2545B',
];

type TokenIconTheme = {
  backgroundColor: string;
  textColor: string;
  label: string;
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getWalletAvatarTheme(address: string, label: string | null) {
  const accent = walletAccentPalette[hashString(address.toLowerCase()) % walletAccentPalette.length];

  return {
    backgroundColor: accent + '22',
    borderColor: accent + '55',
    textColor: accent,
    label: (label || 'W').slice(0, 1).toUpperCase(),
  };
}

export function getTokenIconTheme(symbol: string | null, name: string | null): TokenIconTheme {
  const normalized = (symbol || '').trim().toUpperCase();

  switch (normalized) {
    case 'ETH':
      return {backgroundColor: '#627EEA22', textColor: '#8AA2FF', label: 'Ξ'};
    case 'WETH':
      return {backgroundColor: '#4B6BFB22', textColor: '#7D96FF', label: 'W'};
    case 'UNI':
      return {backgroundColor: '#FF4FAE22', textColor: '#FF75C2', label: 'U'};
    case 'USDC':
      return {backgroundColor: '#2775CA22', textColor: '#63A8F0', label: 'C'};
    case 'USDT':
      return {backgroundColor: '#26A17B22', textColor: '#5DDBB0', label: 'T'};
    default: {
      const baseLabel = (normalized || name || '?').replace(/[^A-Za-z0-9]/g, '');
      return {
        backgroundColor: colors.elevated,
        textColor: colors.textPrimary,
        label: baseLabel.slice(0, 2).toUpperCase() || '?',
      };
    }
  }
}
