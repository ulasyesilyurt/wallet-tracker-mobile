import type { NotificationHistoryItem } from '../api/notifications';
import {
  formatActivityAmount,
  formatEventDayLabel,
  getEventDayKey,
  shortenAddress,
} from './format';

export type NotificationHistorySection = {
  title: string;
  meta: string | null;
  data: NotificationHistoryItem[];
};

export function getNotificationDate(item: NotificationHistoryItem) {
  return new Date(item.sentAt ?? item.createdAt);
}

export function isNotificationWithinDays(
  item: NotificationHistoryItem,
  days: number,
  now = new Date(),
) {
  const date = getNotificationDate(item);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() >= now.getTime() - days * 24 * 60 * 60 * 1000
  );
}

export function groupNotificationHistory(
  items: NotificationHistoryItem[],
  quiet: boolean,
  now = new Date(),
): NotificationHistorySection[] {
  const sorted = [...items].sort(
    (left, right) =>
      getNotificationDate(right).getTime() -
      getNotificationDate(left).getTime(),
  );

  if (quiet) {
    return sorted.length > 0
      ? [{ title: 'Earlier', meta: null, data: sorted }]
      : [];
  }

  const sections: NotificationHistorySection[] = [];
  const byDay = new Map<string, NotificationHistoryItem[]>();
  for (const item of sorted) {
    const key = getEventDayKey(item.sentAt ?? item.createdAt);
    const existing = byDay.get(key);
    if (existing) existing.push(item);
    else byDay.set(key, [item]);
  }

  for (const dayItems of byDay.values()) {
    const timestamp = dayItems[0].sentAt ?? dayItems[0].createdAt;
    const date = getNotificationDate(dayItems[0]);
    const olderThanThirtyDays =
      !Number.isNaN(date.getTime()) &&
      date.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const title = olderThanThirtyDays
      ? 'Earlier'
      : formatEventDayLabel(timestamp);
    const last = sections[sections.length - 1];
    if (title === 'Earlier' && last?.title === 'Earlier')
      last.data.push(...dayItems);
    else sections.push({ title, meta: null, data: dayItems });
  }
  return sections;
}

export function formatNotificationAge(
  item: NotificationHistoryItem,
  now = new Date(),
) {
  const date = getNotificationDate(item);
  if (Number.isNaN(date.getTime())) return item.sentAt ?? item.createdAt;
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 48 * 60)
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function getNotificationRowCopy(item: NotificationHistoryItem) {
  const event = item.walletEvent;
  const amount = formatActivityAmount(event.amount, event.assetSymbol, null);
  const eventType = formatEventType(event.eventType);
  const hasAmount = Boolean(event.amount || event.assetSymbol);
  const availableFact = hasAmount ? amount : eventType;
  const outgoing = event.direction === 'outgoing';
  const incoming = event.direction === 'incoming';
  const title =
    outgoing && hasAmount
      ? `Sent ${amount}`
      : incoming && hasAmount
      ? `Received ${amount}`
      : eventType;
  const counterparty = outgoing
    ? event.toAddress
    : incoming
    ? event.fromAddress
    : event.toAddress ?? event.fromAddress;
  const arrow = outgoing ? '→' : incoming ? '←' : '·';
  return {
    title,
    fact: counterparty
      ? `${availableFact} ${arrow} ${shortenAddress(counterparty).replace(
          '...',
          '…',
        )}`
      : availableFact,
    glyph: outgoing ? '↑' : incoming ? '↓' : getEventGlyph(event.eventType),
    tone: outgoing
      ? ('outgoing' as const)
      : incoming
      ? ('incoming' as const)
      : ('movement' as const),
  };
}

function formatEventType(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function getEventGlyph(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('approval')) return '⌾';
  if (normalized.includes('price')) return '%';
  if (normalized.includes('nft')) return '◇';
  return '◇';
}
