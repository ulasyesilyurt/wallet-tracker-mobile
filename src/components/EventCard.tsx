import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {WalletEvent} from '../api/events';
import {colors} from '../theme/colors';
import {formatActivityAmount, shortenAddress} from '../utils/format';
import {formatChainDisplayName, getChainBadgeTheme} from '../utils/chains';

type EventCardProps = {
  event: WalletEvent;
};

function formatOccurredAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatEventType(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function previewHash(value: string) {
  if (value.length < 12) {
    return value;
  }

  return value.slice(0, 8) + '...' + value.slice(-4);
}

export function EventCard({event}: EventCardProps) {
  const amountLabel = formatActivityAmount(
    event.amount,
    event.assetSymbol,
    event.assetName ?? null,
  );
  const directionLabel =
    event.direction === 'incoming'
      ? 'Received'
      : event.direction === 'outgoing'
        ? 'Sent'
        : 'Activity';
  const directionGlyph =
    event.direction === 'incoming'
      ? '↓'
      : event.direction === 'outgoing'
        ? '↑'
        : '•';
  const counterpartyAddress =
    event.direction === 'incoming'
      ? event.fromAddress
      : event.direction === 'outgoing'
        ? event.toAddress
        : event.toAddress ?? event.fromAddress;
  const counterpartyLabel = counterpartyAddress
    ? event.direction === 'incoming'
      ? `From ${shortenAddress(counterpartyAddress)}`
      : event.direction === 'outgoing'
        ? `To ${shortenAddress(counterpartyAddress)}`
        : shortenAddress(counterpartyAddress)
    : null;
  const walletLabel = event.walletLabel || event.walletAddress
    ? event.walletLabel || shortenAddress(event.walletAddress ?? '')
    : null;
  const chainLabel = formatChainDisplayName(event.chainId).toUpperCase();
  const chainBadgeTheme = getChainBadgeTheme(event.chainId);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftCluster}>
          <View style={styles.directionGlyphWrap}>
            <Text style={styles.directionGlyph}>{directionGlyph}</Text>
          </View>

          <View style={styles.eventIdentity}>
            <Text style={styles.amountLine} numberOfLines={1}>
              {amountLabel}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.directionLine}>{directionLabel}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.eventType} numberOfLines={1}>
                {formatEventType(event.eventType)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metaBlock}>
          {walletLabel ? (
            <Text style={styles.metaValue} numberOfLines={1}>
              {walletLabel}
            </Text>
          ) : null}
          <Text style={styles.metaTimestamp} numberOfLines={1}>
            {previewHash(event.transactionHash)}
          </Text>
        </View>
      </View>

      <View style={styles.secondaryRow}>
        <View style={styles.secondaryLeft}>
          {chainLabel ? (
            <View
              style={[
                styles.chainPill,
                {
                  backgroundColor: chainBadgeTheme.backgroundColor,
                  borderColor: chainBadgeTheme.borderColor,
                },
              ]}>
              <Text
                style={[styles.chainPillText, {color: chainBadgeTheme.textColor}]}
                numberOfLines={1}>
                {chainLabel}
              </Text>
            </View>
          ) : null}
          <Text style={styles.timestamp} numberOfLines={1}>
            {formatOccurredAt(event.occurredAt)}
          </Text>
        </View>

        {counterpartyLabel ? (
          <Text style={styles.walletLine} numberOfLines={1}>
            {counterpartyLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  leftCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  directionGlyphWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  directionGlyph: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  eventIdentity: {
    flex: 1,
    minWidth: 0,
  },
  amountLine: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    flexWrap: 'nowrap',
  },
  directionLine: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dot: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  eventType: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  chainPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chainPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textTertiary,
    flexShrink: 1,
  },
  walletLine: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    flex: 1,
    minWidth: 0,
  },
  metaBlock: {
    alignItems: 'flex-end',
    minWidth: 88,
    maxWidth: 110,
    marginLeft: 8,
    flexShrink: 1,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  metaTimestamp: {
    marginTop: 5,
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  secondaryRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
});
