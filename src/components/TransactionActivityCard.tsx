import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {TransactionActivityItem} from '../api/events';
import {colors} from '../theme/colors';
import {formatChainDisplayName, getChainBadgeTheme} from '../utils/chains';
import {shortenAddress} from '../utils/format';
import {
  formatTransactionActivityUsdValue,
  getTransactionActivitySummaries,
  getTransactionActivityTitle,
} from '../utils/transactionActivities';

type TransactionActivityCardProps = {
  activity: TransactionActivityItem;
  onPress: () => void;
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

export function TransactionActivityCard({
  activity,
  onPress,
}: TransactionActivityCardProps) {
  const title = getTransactionActivityTitle(activity.activityType);
  const summaries = getTransactionActivitySummaries(activity);
  const usdValue = formatTransactionActivityUsdValue(activity);
  const walletLabel = activity.walletLabel || activity.walletAddress
    ? activity.walletLabel || shortenAddress(activity.walletAddress ?? '')
    : null;
  const chainLabel = formatChainDisplayName(activity.chainId).toUpperCase();
  const chainTheme = getChainBadgeTheme(activity.chainId);
  const glyph =
    activity.activityType === 'nft_sale'
      ? '↑'
      : activity.activityType === 'nft_mint'
        ? '✦'
        : '↓';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed ? styles.cardPressed : null]}>
      <View style={styles.topRow}>
        <View style={styles.glyphWrap}>
          <Text style={styles.glyph}>{glyph}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.title}>{title}</Text>
          {usdValue ? <Text style={styles.usdValue}>{usdValue}</Text> : null}
        </View>
        {walletLabel ? (
          <Text numberOfLines={1} style={styles.walletLabel}>
            {walletLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.assetRows}>
        <View style={styles.assetRow}>
          <Text style={styles.assetDirection}>Sent</Text>
          <Text numberOfLines={2} style={styles.assetSummary}>
            {summaries.sent}
          </Text>
        </View>
        <View style={styles.assetRow}>
          <Text style={styles.assetDirection}>Received</Text>
          <Text numberOfLines={2} style={styles.assetSummary}>
            {summaries.received}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        {chainLabel ? (
          <View
            style={[
              styles.chainPill,
              {
                backgroundColor: chainTheme.backgroundColor,
                borderColor: chainTheme.borderColor,
              },
            ]}>
            <Text style={[styles.chainPillText, {color: chainTheme.textColor}]}>
              {chainLabel}
            </Text>
          </View>
        ) : null}
        <Text numberOfLines={1} style={styles.timestamp}>
          {formatOccurredAt(activity.occurredAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.84,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  glyphWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  glyph: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  usdValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  walletLabel: {
    maxWidth: 100,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  assetRows: {
    marginTop: 11,
    gap: 7,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  assetDirection: {
    width: 62,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  assetSummary: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    color: colors.textPrimary,
  },
  footerRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chainPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chainPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  timestamp: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textTertiary,
  },
});
