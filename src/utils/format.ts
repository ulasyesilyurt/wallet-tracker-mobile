export function shortenAddress(address: string) {
  if (address.length < 12) {
    return address;
  }

  return address.slice(0, 6) + '...' + address.slice(-4);
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
