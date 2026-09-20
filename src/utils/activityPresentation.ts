import type { WalletEvent } from '../api/events';
import {
  formatActivityAmount,
  getEventDayKey,
  isNftEvent,
  shortenAddress,
} from './format';

export type ActivityFilter = 'all' | 'in' | 'out' | 'other';
export type ActivityKind =
  | 'incoming'
  | 'outgoing'
  | 'swap'
  | 'nft'
  | 'approval'
  | 'other'
  | 'failed'
  | 'pending';

export type ActivityFilterOption = {
  id: ActivityFilter;
  label: string;
  count: number | null;
};

export type ActivityRowViewModel = {
  id: string;
  kind: ActivityKind;
  title: string;
  amount: string | null;
  factPrefix: string | null;
  factAddress: string | null;
  usd: string | null;
  walletName: string;
  chainId: string;
  timestamp: string;
  accessibilityLabel: string;
};

export type ActivitySection = {
  key: string;
  title: string;
  meta: string | null;
  dimmed: boolean;
  data: WalletEvent[];
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function sortActivityChronologically(events: WalletEvent[]) {
  return events
    .map((event, apiIndex) => ({ event, apiIndex }))
    .sort((left, right) => {
      const timeDifference = eventTime(right.event) - eventTime(left.event);
      return timeDifference || left.apiIndex - right.apiIndex;
    })
    .map(entry => entry.event);
}

export function isActivityWithinDays(
  event: WalletEvent,
  days: number,
  now = new Date(),
) {
  const timestamp = eventTime(event);
  return (
    Number.isFinite(timestamp) && timestamp >= now.getTime() - days * 86400000
  );
}

export function getActivityKind(event: WalletEvent): ActivityKind {
  const type = normalized(event.eventType);
  if (type.includes('failed') || type.includes('revert')) return 'failed';
  if (type.includes('pending')) return 'pending';
  if (isNftEvent(event.eventType, event.assetType)) return 'nft';
  if (type.includes('swap')) return 'swap';
  if (type.includes('approval') || type.includes('approve')) return 'approval';
  if (event.direction === 'incoming') return 'incoming';
  if (event.direction === 'outgoing') return 'outgoing';
  return 'other';
}

export function getActivityFilterOptions(
  events: WalletEvent[],
  now = new Date(),
): ActivityFilterOption[] {
  const recent = events.filter(event => isActivityWithinDays(event, 7, now));
  const count = (filter: ActivityFilter) =>
    recent.filter(event => eventMatchesActivityFilter(event, filter)).length;

  return [
    { id: 'all', label: 'All', count: recent.length || null },
    { id: 'in', label: 'In', count: count('in') || null },
    { id: 'out', label: 'Out', count: count('out') || null },
    { id: 'other', label: 'Other', count: count('other') || null },
  ];
}

export function filterActivityEvents(
  events: WalletEvent[],
  filter: ActivityFilter,
) {
  return filter === 'all'
    ? events
    : events.filter(event => eventMatchesActivityFilter(event, filter));
}

export function resolveActivityRow(
  event: WalletEvent,
  now = new Date(),
): ActivityRowViewModel {
  const kind = getActivityKind(event);
  const assetLabel =
    event.assetSymbol?.trim() || event.assetName?.trim() || null;
  const amount = resolveAmount(event, kind);
  const counterparty = getCounterparty(event);
  const fact = resolveFact(event, kind, counterparty);
  const title = resolveTitle(event, kind, assetLabel);
  const walletName =
    event.walletLabel?.trim() ||
    (event.walletAddress
      ? shortenAddress(event.walletAddress).replace('...', '…')
      : '') ||
    'Tracked wallet';
  const usd = resolveActivityUsd(event, kind);

  return {
    id: event.id,
    kind,
    title,
    amount,
    factPrefix: fact.prefix,
    factAddress: fact.address,
    usd,
    walletName,
    chainId: event.chainId,
    timestamp: formatActivityTimestamp(event.occurredAt, now),
    accessibilityLabel: [title, amount, walletName].filter(Boolean).join(', '),
  };
}

export function groupActivityEvents(
  allEvents: WalletEvent[],
  visibleEvents: WalletEvent[],
  quiet: boolean,
  now = new Date(),
): ActivitySection[] {
  if (quiet) {
    if (visibleEvents.length === 0) return [];
    return [
      {
        key: 'earlier',
        title: 'Earlier',
        meta: formatActivityDay(visibleEvents[0].occurredAt, now, false),
        dimmed: true,
        data: visibleEvents,
      },
    ];
  }

  const sections: ActivitySection[] = [];
  const allByDay = new Map<string, WalletEvent[]>();
  allEvents.forEach(event => {
    const key = getEventDayKey(event.occurredAt);
    const day = allByDay.get(key);
    if (day) day.push(event);
    else allByDay.set(key, [event]);
  });

  visibleEvents.forEach(event => {
    const older = eventTime(event) < now.getTime() - THIRTY_DAYS_MS;
    const dayKey = getEventDayKey(event.occurredAt);
    const key = older ? 'earlier' : dayKey;
    const existing = sections.find(section => section.key === key);
    if (existing) {
      existing.data.push(event);
      return;
    }

    sections.push({
      key,
      title: older ? 'Earlier' : formatActivityDay(event.occurredAt, now, true),
      meta: older ? null : calculateActivityDayNet(allByDay.get(dayKey) ?? []),
      dimmed: false,
      data: [event],
    });
  });

  return sections;
}

export function calculateActivityDayNet(events: WalletEvent[]) {
  const eligible = events.filter(event => {
    const kind = getActivityKind(event);
    return kind === 'incoming' || kind === 'outgoing';
  });
  if (eligible.length === 0) return null;

  let net = 0;
  for (const event of eligible) {
    const value = getNumericUsd(event);
    if (value == null) return null;
    net += getActivityKind(event) === 'incoming' ? value : -value;
  }

  const absolute = Math.abs(net);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absolute);
  return `${net < 0 ? '−' : '+'}${formatted}`;
}

export function getActivityQuietState(events: WalletEvent[], now = new Date()) {
  return events.every(event => !isActivityWithinDays(event, 7, now));
}

export function getMostRecentActivityLabel(
  events: WalletEvent[],
  now = new Date(),
) {
  return events[0] ? formatActivityTimestamp(events[0].occurredAt, now) : null;
}

function eventMatchesActivityFilter(
  event: WalletEvent,
  filter: ActivityFilter,
) {
  const kind = getActivityKind(event);
  if (filter === 'in') return kind === 'incoming';
  if (filter === 'out') return kind === 'outgoing';
  if (filter === 'other') return kind !== 'incoming' && kind !== 'outgoing';
  return true;
}

function resolveTitle(
  event: WalletEvent,
  kind: ActivityKind,
  assetLabel: string | null,
) {
  if (kind === 'failed') {
    return normalized(event.eventType).includes('swap')
      ? 'Swap failed'
      : 'Transaction failed';
  }
  if (kind === 'pending') return 'Transaction pending';
  if (kind === 'swap') return assetLabel ? `Swapped ${assetLabel}` : 'Swap';
  if (kind === 'nft') {
    return event.direction === 'incoming'
      ? 'NFT received'
      : event.direction === 'outgoing'
      ? 'NFT sent'
      : 'NFT activity';
  }
  if (kind === 'approval') return 'Spend approval granted';
  if (kind === 'incoming')
    return assetLabel ? `Received ${assetLabel}` : 'Received asset';
  if (kind === 'outgoing')
    return assetLabel ? `Sent ${assetLabel}` : 'Sent asset';
  return 'Contract interaction';
}

function resolveAmount(event: WalletEvent, kind: ActivityKind) {
  if (
    kind === 'nft' ||
    kind === 'approval' ||
    kind === 'failed' ||
    kind === 'pending'
  ) {
    return null;
  }
  if (event.amount == null || event.amount.trim().length === 0) return null;

  const unsigned = event.amount.trim().replace(/^[+-]/, '');
  const formatted = formatActivityAmount(
    formatActivityQuantity(unsigned),
    event.assetSymbol,
    event.assetName ?? null,
  );
  if (kind === 'incoming') return `+${formatted}`;
  if (kind === 'outgoing') return `−${formatted}`;
  if (kind === 'swap' && event.direction === 'incoming') return `+${formatted}`;
  return formatted;
}

function resolveFact(
  event: WalletEvent,
  kind: ActivityKind,
  counterparty: string | null,
) {
  const address = counterparty
    ? shortenAddress(counterparty).replace('...', '…')
    : null;
  const asset = event.assetName?.trim() || event.assetSymbol?.trim() || null;
  const tokenId = event.assetTokenId?.trim() || null;

  if (kind === 'nft') {
    const item = [asset, tokenId ? `#${tokenId}` : null]
      .filter(Boolean)
      .join(' ');
    const arrow =
      event.direction === 'incoming'
        ? '←'
        : event.direction === 'outgoing'
        ? '→'
        : null;
    return {
      prefix: [item || null, arrow].filter(Boolean).join(' ') || null,
      address,
    };
  }
  if (kind === 'approval') {
    return {
      prefix: [asset, address ? '→' : null].filter(Boolean).join(' ') || null,
      address,
    };
  }
  if (address) {
    const arrow =
      event.direction === 'incoming'
        ? '←'
        : event.direction === 'outgoing'
        ? '→'
        : null;
    return { prefix: arrow, address };
  }
  if (kind === 'swap' && asset) return { prefix: asset, address: null };
  if (event.assetContractAddress) {
    return {
      prefix: null,
      address: shortenAddress(event.assetContractAddress).replace('...', '…'),
    };
  }
  return { prefix: asset, address: null };
}

function resolveActivityUsd(event: WalletEvent, kind: ActivityKind) {
  if (kind === 'nft' || kind === 'approval') return null;
  const value = getNumericUsd(event);
  if (value == null) return null;
  if (value < 0.01) return '<$0.01';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getNumericUsd(event: WalletEvent) {
  if (!event.usdValueStatus?.startsWith('priced_') || event.usdValue == null) {
    return null;
  }
  const value = Number(event.usdValue);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getCounterparty(event: WalletEvent) {
  return event.direction === 'incoming'
    ? event.fromAddress ?? null
    : event.direction === 'outgoing'
    ? event.toAddress ?? null
    : event.toAddress ?? event.fromAddress ?? null;
}

function formatActivityQuantity(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 4,
    useGrouping: true,
  }).format(numeric);
}

export function formatActivityTimestamp(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 48 * 60) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatActivityDay(value: string, now: Date, relative: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (relative) {
    const difference = localDayDifference(date, now);
    if (difference === 0) return 'Today';
    if (difference === 1) return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function localDayDifference(date: Date, now: Date) {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - target.getTime()) / 86400000);
}

function eventTime(event: WalletEvent) {
  const value = new Date(event.occurredAt).getTime();
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '');
}
