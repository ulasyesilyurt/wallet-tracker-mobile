export function shortenAddress(address: string) {
  if (address.length < 12) {
    return address;
  }

  return address.slice(0, 6) + '...' + address.slice(-4);
}

export function getEventDayKey(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatEventDayLabel(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTargetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const dayDifference = Math.round(
    (startOfToday.getTime() - startOfTargetDay.getTime()) / millisecondsPerDay,
  );

  if (dayDifference === 0) {
    return 'Today';
  }

  if (dayDifference === 1) {
    return 'Yesterday';
  }

  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatUsd(value: number | null | undefined, fallback = 'Unavailable') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type EventUsdValueInput = {
  usdValue?: number | string | null;
  usdValueStatus?: string | null;
  eventType?: string | null;
  assetType?: string | null;
};

export function isNftEvent(eventType?: string | null, assetType?: string | null) {
  const normalizedEventType = (eventType ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedAssetType = (assetType ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nftClassifiers = ['nft', 'erc721', 'erc1155'];

  return nftClassifiers.some(classifier => {
    return normalizedEventType.includes(classifier) || normalizedAssetType.includes(classifier);
  });
}

export function isFungibleTokenEvent(
  eventType?: string | null,
  assetType?: string | null,
) {
  if (isNftEvent(eventType, assetType)) {
    return false;
  }

  const normalizedEventType = (eventType ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedAssetType = (assetType ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    normalizedEventType.includes('tokentransfer') ||
    normalizedEventType.includes('erc20transfer') ||
    normalizedAssetType.includes('erc20') ||
    normalizedAssetType.includes('fungible') ||
    normalizedAssetType === 'token'
  );
}

export function getEventDetailTitle({
  eventType,
  assetType,
  direction,
}: {
  eventType?: string | null;
  assetType?: string | null;
  direction?: string | null;
}) {
  if (isNftEvent(eventType, assetType)) {
    return 'NFT Transfer';
  }

  if (direction === 'outgoing') {
    return 'Send';
  }

  if (direction === 'incoming') {
    return 'Receive';
  }

  if (isFungibleTokenEvent(eventType, assetType)) {
    return 'Token Transfer';
  }

  return 'Activity';
}

export function formatEventUsdValue({
  usdValue,
  usdValueStatus,
  eventType,
  assetType,
}: EventUsdValueInput) {
  if (
    typeof usdValueStatus !== 'string' ||
    !usdValueStatus.startsWith('priced_') ||
    isNftEvent(eventType, assetType) ||
    usdValue == null ||
    (typeof usdValue === 'string' && usdValue.trim().length === 0)
  ) {
    return null;
  }

  const numericValue = typeof usdValue === 'number' ? usdValue : Number(usdValue);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  if (numericValue < 0.01) {
    return '≈ <$0.01';
  }

  return `≈ ${formatUsd(numericValue)}`;
}

export function formatUsdCompact(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (value >= 1000000) {
    return '$' + (value / 1000000).toFixed(value >= 10000000 ? 0 : 1) + 'M';
  }

  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(value >= 10000 ? 0 : 1) + 'K';
  }

  return formatUsd(value);
}

export function formatTokenAmount(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  if (numericValue === 0) {
    return '0';
  }

  if (numericValue >= 1000) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numericValue);
  }

  if (numericValue >= 1) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(numericValue);
  }

  if (numericValue >= 0.01) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(numericValue);
  }

  if (numericValue >= 0.0001) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(numericValue);
  }

  return '<0.0001';
}

export function formatPositionTokenAmount(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  if (numericValue === 0) {
    return '0';
  }

  const absoluteValue = Math.abs(numericValue);
  const maximumFractionDigits = absoluteValue >= 1 ? 2 : 6;
  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(numericValue);

  return formattedValue;
}

function formatLargeIntegerWithAssumed18Decimals(value: string) {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  const padded = digits.padStart(19, '0');
  const integerPart = padded.slice(0, -18).replace(/^0+/, '') || '0';
  const fractionPart = padded.slice(-18).replace(/0+$/, '');
  const trimmedFraction = fractionPart.slice(0, 4);
  const formattedInteger = new Intl.NumberFormat('en-US').format(Number(integerPart));
  const prefix = negative ? '-' : '';

  if (trimmedFraction.length === 0) {
    return prefix + formattedInteger;
  }

  return prefix + formattedInteger + '.' + trimmedFraction;
}

export function formatActivityAmount(value: string | null, assetSymbol: string | null, assetName: string | null) {
  if (value == null || value === '') {
    return assetSymbol || assetName || '-';
  }

  const normalized = value.trim();
  const label = assetSymbol || assetName || '';
  let formattedAmount = normalized;

  if (/^-?\d+$/.test(normalized) && normalized.replace('-', '').length >= 15) {
    formattedAmount = formatLargeIntegerWithAssumed18Decimals(normalized) ?? normalized;
  } else {
    formattedAmount = formatTokenAmount(normalized);
  }

  return label ? formattedAmount + ' ' + label : formattedAmount;
}

export function formatSignedEventAmount(
  value: string | null,
  assetSymbol: string | null,
  assetName: string | null,
  direction: string | null,
) {
  if (value == null || value.trim().length === 0) {
    return formatActivityAmount(value, assetSymbol, assetName);
  }

  const normalized = value.trim();

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return formatActivityAmount(normalized, assetSymbol, assetName);
  }

  const unsignedValue = normalized.replace(/^[+-]/, '');
  const amountLabel = formatActivityAmount(unsignedValue, assetSymbol, assetName);

  if (direction === 'incoming') {
    return `+${amountLabel}`;
  }

  if (direction === 'outgoing') {
    return `−${amountLabel}`;
  }

  return normalized.startsWith('-') ? `−${amountLabel}` : amountLabel;
}
