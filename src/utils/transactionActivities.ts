import type {
  TransactionActivityAsset,
  TransactionActivityItem,
  TransactionActivityType,
} from '../api/events';
import {getDexscreenerTokenUrl, getOpenSeaItemUrl} from './chains';
import {
  formatActivityAmount,
  formatUsd,
  isFungibleTokenEvent,
  isNftEvent,
} from './format';

export function getTransactionActivityTitle(activityType: TransactionActivityType) {
  switch (activityType) {
    case 'nft_purchase':
      return 'NFT Purchase';
    case 'nft_sale':
      return 'NFT Sale';
    case 'nft_mint':
      return 'NFT Mint';
  }

  return 'NFT Activity';
}

export function isTransactionNftAsset(asset: TransactionActivityAsset) {
  return (
    isNftEvent(asset.eventType, asset.assetType) ||
    (typeof asset.assetTokenId === 'string' && asset.assetTokenId.trim().length > 0)
  );
}

function formatNftAssetLabel(asset: TransactionActivityAsset) {
  const name = asset.assetName || asset.assetSymbol || 'NFT';
  const tokenId = asset.assetTokenId?.trim();
  const itemLabel = tokenId ? `${name} #${tokenId}` : name;
  const amount = asset.amount?.trim();

  if (!amount || amount === '1') {
    return itemLabel;
  }

  return `${formatActivityAmount(amount, null, null)} × ${itemLabel}`;
}

export function formatTransactionAsset(asset: TransactionActivityAsset) {
  if (isTransactionNftAsset(asset)) {
    return formatNftAssetLabel(asset);
  }

  return formatActivityAmount(
    asset.amount ?? null,
    asset.assetSymbol ?? null,
    asset.assetName ?? null,
  );
}

export function formatTransactionAssetSummary(
  assets: TransactionActivityAsset[] | null | undefined,
) {
  if (!Array.isArray(assets) || assets.length === 0) {
    return '—';
  }

  const visibleAssets = assets.slice(0, 2).map(formatTransactionAsset);
  const remainingCount = assets.length - visibleAssets.length;

  return remainingCount > 0
    ? `${visibleAssets.join(' + ')} + ${remainingCount} more`
    : visibleAssets.join(' + ');
}

export function getTransactionActivitySummaries(activity: TransactionActivityItem) {
  return {
    sent: formatTransactionAssetSummary(activity.sentAssets),
    received: formatTransactionAssetSummary(activity.receivedAssets),
  };
}

export function formatTransactionActivityUsdValue({
  usdValue,
  usdValueStatus,
}: Pick<TransactionActivityItem, 'usdValue' | 'usdValueStatus'>) {
  if (
    typeof usdValueStatus !== 'string' ||
    !usdValueStatus.startsWith('priced_') ||
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

function getAllActivityAssets(activity: TransactionActivityItem) {
  return [
    ...(Array.isArray(activity.receivedAssets) ? activity.receivedAssets : []),
    ...(Array.isArray(activity.sentAssets) ? activity.sentAssets : []),
  ];
}

export function getTransactionActivityOpenSeaUrl(activity: TransactionActivityItem) {
  for (const asset of getAllActivityAssets(activity)) {
    if (!isTransactionNftAsset(asset)) {
      continue;
    }

    const url = getOpenSeaItemUrl(
      activity.chainId,
      asset.assetContractAddress,
      asset.assetTokenId,
    );

    if (url) {
      return url;
    }
  }

  return null;
}

export function getTransactionActivityDexscreenerUrl(activity: TransactionActivityItem) {
  for (const asset of getAllActivityAssets(activity)) {
    if (
      isTransactionNftAsset(asset) ||
      !isFungibleTokenEvent(asset.eventType, asset.assetType)
    ) {
      continue;
    }

    const url = getDexscreenerTokenUrl(activity.chainId, asset.assetContractAddress);

    if (url) {
      return url;
    }
  }

  return null;
}
