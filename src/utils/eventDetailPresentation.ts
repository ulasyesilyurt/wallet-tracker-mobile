import type {
  TransactionActivityAsset,
  TransactionActivityItem,
  WalletEvent,
  WalletHistoryItem,
} from '../api/events';
import { isTransactionActivityItem } from '../api/events';
import {
  formatChainDisplayName,
  getDexscreenerTokenUrl,
  getOpenSeaItemUrl,
  getTransactionExplorerUrl,
} from './chains';
import {
  formatActivityAmount,
  formatEventUsdValue,
  formatUsd,
  isFungibleTokenEvent,
  isNftEvent,
  shortenAddress,
} from './format';
import {
  formatTransactionActivityUsdValue,
  getTransactionActivityDexscreenerUrl,
  getTransactionActivityOpenSeaUrl,
  isTransactionNftAsset,
} from './transactionActivities';
import {
  getActivityKind,
  resolveActivityRow,
  type ActivityKind,
} from './activityPresentation';

export type EventDetailStatus = 'failed' | 'pending' | null;
export type EventDetailTone = 'neutral' | 'incoming' | 'failed';

export type EventDetailLeg = {
  id: string;
  label: 'Sent' | 'Received';
  amount: string | null;
  assetName: string | null;
  usd: string | null;
  tone: EventDetailTone;
  struck: boolean;
};

export type EventDetailMeta =
  | {
      id: string;
      kind: 'wallet';
      label: 'Wallet';
      walletName: string;
      copyValue: string | null;
      accessibilityValue: string;
    }
  | {
      id: string;
      kind: 'network';
      label: 'Network';
      chainId: string;
      accessibilityValue: string;
    }
  | {
      id: string;
      kind: 'text';
      label: 'From' | 'To' | 'Contract' | 'Transaction';
      displayValue: string;
      fullValue: string;
      monospace: boolean;
      copyable: boolean;
    };

export type EventDetailLink = {
  id: 'explorer' | 'dexscreener' | 'opensea';
  label: string;
  url: string;
};

export type EventDetailViewModel = {
  id: string;
  kind: ActivityKind;
  title: string;
  timestamp: string;
  status: EventDetailStatus;
  value: string | null;
  result: { title: string; body: string } | null;
  legsTitle: 'Assets moved' | 'Attempted' | null;
  legs: EventDetailLeg[];
  meta: EventDetailMeta[];
  links: EventDetailLink[];
};

export function resolveEventDetail(
  event: WalletHistoryItem,
): EventDetailViewModel {
  return isTransactionActivityItem(event)
    ? resolveTransactionActivityDetail(event)
    : resolveRawEventDetail(event);
}

export function formatEventDetailTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} · ${time}`;
}

export function previewEventIdentifier(value: string) {
  return shortenAddress(value).replace('...', '…');
}

function resolveRawEventDetail(event: WalletEvent): EventDetailViewModel {
  const kind = getActivityKind(event);
  const status: EventDetailStatus =
    kind === 'failed' ? 'failed' : kind === 'pending' ? 'pending' : null;
  const title = resolveActivityRow(event).title;
  const transactionHash = trimmed(event.transactionHash);
  const explorerUrl = getTransactionExplorerUrl(event.chainId, transactionHash);
  const nft = isNftEvent(event.eventType, event.assetType);
  const fungible = isFungibleTokenEvent(event.eventType, event.assetType);
  const contextualLinks = status === 'failed' ? [] : [
    fungible
      ? link(
          'dexscreener',
          'View on Dexscreener',
          getDexscreenerTokenUrl(event.chainId, event.assetContractAddress),
        )
      : null,
    nft
      ? link(
          'opensea',
          'View on OpenSea',
          getOpenSeaItemUrl(
            event.chainId,
            event.assetContractAddress,
            event.assetTokenId,
          ),
        )
      : null,
  ];
  const legs = status === 'pending' ? [] : resolveRawEventLegs(event, kind, nft);

  return {
    id: event.id,
    kind,
    title,
    timestamp: formatEventDetailTimestamp(event.occurredAt),
    status,
    value:
      status == null
        ? formatEventUsdValue({
            usdValue: event.usdValue,
            usdValueStatus: event.usdValueStatus,
            eventType: event.eventType,
            assetType: event.assetType,
          })
        : null,
    result: resolveResult(status),
    legsTitle:
      legs.length === 0 ? null : status === 'failed' ? 'Attempted' : 'Assets moved',
    legs,
    meta: resolveRawMeta(event, transactionHash),
    links: compact([
      link('explorer', 'View on block explorer', explorerUrl),
      ...contextualLinks,
    ]),
  };
}

function resolveTransactionActivityDetail(
  activity: TransactionActivityItem,
): EventDetailViewModel {
  const transactionHash = trimmed(activity.transactionHash);
  const legs = [
    ...resolveTransactionLegs(activity.sentAssets, 'Sent'),
    ...resolveTransactionLegs(activity.receivedAssets, 'Received'),
  ];

  return {
    id: activity.id,
    kind: 'nft',
    title:
      activity.activityType === 'nft_purchase'
        ? 'NFT purchase'
        : activity.activityType === 'nft_sale'
        ? 'NFT sale'
        : 'NFT mint',
    timestamp: formatEventDetailTimestamp(activity.occurredAt),
    status: null,
    value: formatTransactionActivityUsdValue(activity),
    result: null,
    legsTitle: legs.length > 0 ? 'Assets moved' : null,
    legs,
    meta: resolveSharedMeta(activity, transactionHash),
    links: compact([
      link(
        'explorer',
        'View on block explorer',
        getTransactionExplorerUrl(activity.chainId, transactionHash),
      ),
      link(
        'dexscreener',
        'View payment token on Dexscreener',
        getTransactionActivityDexscreenerUrl(activity),
      ),
      link(
        'opensea',
        'View NFT on OpenSea',
        getTransactionActivityOpenSeaUrl(activity),
      ),
    ]),
  };
}

function resolveRawEventLegs(
  event: WalletEvent,
  kind: ActivityKind,
  nft: boolean,
): EventDetailLeg[] {
  if (kind === 'approval') return [];
  if (event.direction !== 'incoming' && event.direction !== 'outgoing') return [];

  const amountValue = trimmed(event.amount);
  const assetName = resolveRawAssetName(event, nft);
  if (!amountValue && !assetName) return [];

  const received = event.direction === 'incoming';
  const amount = amountValue
    ? formatLegAmount(
        amountValue,
        nft ? null : event.assetSymbol,
        nft ? 'NFT' : event.assetName ?? null,
        received,
        nft,
      )
    : null;

  return [
    {
      id: event.id,
      label: received ? 'Received' : 'Sent',
      amount,
      assetName,
      usd:
        kind === 'failed' || nft
          ? null
          : formatLegUsd(event.usdValue, event.usdValueStatus),
      tone: kind === 'failed' ? 'failed' : received ? 'incoming' : 'neutral',
      struck: kind === 'failed',
    },
  ];
}

function resolveTransactionLegs(
  assets: TransactionActivityAsset[] | null | undefined,
  label: 'Sent' | 'Received',
) {
  if (!Array.isArray(assets)) return [];

  return assets.flatMap((asset, index): EventDetailLeg[] => {
    const nft = isTransactionNftAsset(asset);
    const amountValue = trimmed(asset.amount);
    const assetName = resolveTransactionAssetName(asset, nft);
    if (!amountValue && !assetName) return [];

    return [
      {
        id: `${asset.sourceEventId ?? asset.assetContractAddress ?? label}:${
          asset.assetTokenId ?? index
        }`,
        label,
        amount: amountValue
          ? formatLegAmount(
              amountValue,
              nft ? null : asset.assetSymbol ?? null,
              nft ? 'NFT' : asset.assetName ?? null,
              label === 'Received',
              nft,
            )
          : null,
        assetName,
        usd: nft ? null : formatLegUsd(asset.usdValue, asset.usdValueStatus),
        tone: label === 'Received' ? 'incoming' : 'neutral',
        struck: false,
      },
    ];
  });
}

function resolveRawMeta(
  event: WalletEvent,
  transactionHash: string | null,
): EventDetailMeta[] {
  const shared = resolveSharedMeta(event, null);
  const from = trimmed(event.fromAddress);
  const to = trimmed(event.toAddress);
  const counterparties =
    event.direction === 'incoming'
      ? compact([textMeta('from', 'From', from, true)])
      : event.direction === 'outgoing'
      ? compact([textMeta('to', 'To', to, true)])
      : compact([
          textMeta('from', 'From', from, true),
          textMeta('to', 'To', to, true),
        ]);
  const contract = textMeta(
    'contract',
    'Contract',
    trimmed(event.assetContractAddress),
    true,
  );
  const transaction = textMeta(
    'transaction',
    'Transaction',
    transactionHash,
    true,
  );

  return compact([...shared, ...counterparties, contract, transaction]);
}

function resolveSharedMeta(
  event: Pick<
    WalletHistoryItem,
    'walletLabel' | 'walletAddress' | 'chainId'
  >,
  transactionHash: string | null,
): EventDetailMeta[] {
  const walletName = trimmed(event.walletLabel);
  const walletAddress = trimmed(event.walletAddress);
  const chainId = trimmed(event.chainId);
  const wallet: EventDetailMeta | null = walletName
    ? {
        id: 'wallet',
        kind: 'wallet',
        label: 'Wallet',
        walletName,
        copyValue: walletAddress,
        accessibilityValue: walletAddress
          ? `${walletName}, ${walletAddress}`
          : walletName,
      }
    : null;
  const network: EventDetailMeta | null = chainId
    ? {
        id: 'network',
        kind: 'network',
        label: 'Network',
        chainId,
        accessibilityValue: formatChainDisplayName(chainId),
      }
    : null;
  const transaction = textMeta(
    'transaction',
    'Transaction',
    transactionHash,
    true,
  );

  return compact([wallet, network, transaction]);
}

function textMeta(
  id: string,
  label: 'From' | 'To' | 'Contract' | 'Transaction',
  value: string | null,
  copyable: boolean,
): EventDetailMeta | null {
  if (!value) return null;
  return {
    id,
    kind: 'text',
    label,
    displayValue: previewEventIdentifier(value),
    fullValue: value,
    monospace: true,
    copyable,
  };
}

function resolveRawAssetName(event: WalletEvent, nft: boolean) {
  const name = trimmed(event.assetName) ?? trimmed(event.assetSymbol);
  const tokenId = trimmed(event.assetTokenId);
  if (nft) return compact([name, tokenId ? `#${tokenId}` : null]).join(' ') || null;
  const symbol = trimmed(event.assetSymbol);
  return name && name !== symbol ? name : null;
}

function resolveTransactionAssetName(
  asset: TransactionActivityAsset,
  nft: boolean,
) {
  const name = trimmed(asset.assetName) ?? trimmed(asset.assetSymbol);
  const tokenId = trimmed(asset.assetTokenId);
  if (nft) return compact([name, tokenId ? `#${tokenId}` : null]).join(' ') || null;
  const symbol = trimmed(asset.assetSymbol);
  return name && name !== symbol ? name : null;
}

function formatLegAmount(
  rawAmount: string,
  symbol: string | null | undefined,
  name: string | null,
  received: boolean,
  nft: boolean,
) {
  const unsigned = rawAmount.replace(/^[+-]/, '');
  if (nft) return `${formatActivityAmount(unsigned, null, null)} NFT`;
  const formatted = formatActivityAmount(unsigned, symbol ?? null, name);
  return `${received ? '+' : '−'}${formatted}`;
}

function formatLegUsd(
  usdValue: number | string | null | undefined,
  usdValueStatus: string | null | undefined,
) {
  if (!usdValueStatus?.startsWith('priced_') || usdValue == null) return null;
  if (typeof usdValue === 'string' && usdValue.trim().length === 0) return null;
  const numeric = typeof usdValue === 'number' ? usdValue : Number(usdValue);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (numeric < 0.01) return '<$0.01';
  return formatUsd(numeric);
}

function resolveResult(status: EventDetailStatus) {
  if (status === 'failed') {
    return {
      title: 'Reverted on-chain',
      body: 'No assets left the wallet. The network fee was still spent.',
    };
  }
  if (status === 'pending') {
    return {
      title: 'Not yet confirmed',
      body: 'Nothing has moved on-chain yet.',
    };
  }
  return null;
}

function link(
  id: EventDetailLink['id'],
  label: string,
  url: string | null,
): EventDetailLink | null {
  return url ? { id, label, url } : null;
}

function trimmed(value: string | null | undefined) {
  const next = value?.trim();
  return next ? next : null;
}

function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value != null);
}
