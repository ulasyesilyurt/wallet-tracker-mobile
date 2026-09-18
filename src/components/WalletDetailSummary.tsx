import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Wallet } from '../types/wallet';
import { getWalletEnabledChains } from '../utils/chains';
import { formatUsd, shortenAddress } from '../utils/format';
import { walletDetailColors as colors } from '../theme/walletDetail';
import { NetworkBadge } from './WalletDetailUI';

type WalletDetailSummaryProps = {
  wallet: Wallet;
  narrow: boolean;
  loading: boolean;
  balance: number | null;
  balanceFallback: string;
  delta: number | null;
  performanceReason: string;
  holdings: number | null;
  positions: number | null;
  holdingsStatus: string | null;
  positionsStatus: string | null;
  holdingsFlex: number;
  positionsFlex: number;
  copied: boolean;
  onCopy: () => void;
};

export function WalletDetailSummary({
  wallet,
  narrow,
  loading,
  balance,
  balanceFallback,
  delta,
  performanceReason,
  holdings,
  positions,
  holdingsStatus,
  positionsStatus,
  holdingsFlex,
  positionsFlex,
  copied,
  onCopy,
}: WalletDetailSummaryProps) {
  const chains = getWalletEnabledChains(wallet.chainId, wallet.enabledChains);
  const allocationAvailable =
    !loading &&
    holdings != null &&
    positions != null &&
    (holdings > 0 || positions > 0);
  const flatDelta = delta != null && Math.abs(delta) < 0.005;
  const deltaColor =
    delta == null || flatDelta
      ? colors.textTertiary
      : delta > 0
      ? colors.positive
      : colors.negative;
  const deltaLabel =
    delta == null
      ? '—'
      : flatDelta
      ? formatUsd(0)
      : `${delta > 0 ? '+' : '−'}${formatUsd(Math.abs(delta))}`;

  return (
    <View style={[styles.card, narrow && styles.cardNarrow]}>
      <View style={[styles.identity, narrow && styles.identityNarrow]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            copied ? 'Wallet address copied' : 'Copy wallet address'
          }
          onPress={onCopy}
          style={styles.addressTarget}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.addressChip,
                narrow && styles.addressChipNarrow,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={[styles.address, narrow && styles.addressNarrow]}
              >
                {shortenAddress(wallet.address).replace('...', '…')}
              </Text>
              <Ionicons
                name={copied ? 'checkmark-outline' : 'copy-outline'}
                size={10}
                color={copied ? colors.positive : colors.textTertiary}
              />
            </View>
          )}
        </Pressable>
        <NetworkBadge chainId={chains[0]} identity narrow={narrow} />
        {chains.length > 1 ? (
          <View
            style={[styles.overflowBadge, narrow && styles.overflowBadgeNarrow]}
          >
            <Text maxFontSizeMultiplier={1.2} style={styles.overflowText}>
              +{chains.length - 1}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.balanceRow}>
        {loading ? (
          <View
            accessibilityLabel="Loading portfolio totals"
            accessibilityRole="progressbar"
            style={styles.balanceSkeleton}
          />
        ) : (
          <>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              maxFontSizeMultiplier={1.2}
              style={[
                styles.balance,
                narrow && styles.balanceNarrow,
                balance == null && styles.balanceMissing,
              ]}
            >
              {formatUsd(balance, balanceFallback)}
            </Text>
            <Text
              accessibilityLabel={
                delta == null
                  ? performanceReason
                  : `Balance change ${deltaLabel}`
              }
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={[
                styles.delta,
                narrow && styles.deltaNarrow,
                { color: deltaColor },
              ]}
            >
              {deltaLabel}
            </Text>
          </>
        )}
      </View>
      <View style={styles.bar}>
        <View
          style={[
            styles.barSegment,
            {
              backgroundColor: allocationAvailable
                ? colors.holdings
                : colors.neutralTint,
              flex: holdingsFlex === 0 ? 0 : Math.max(0.03, holdingsFlex),
            },
          ]}
        />
        <View
          style={[
            styles.barSegment,
            {
              backgroundColor: allocationAvailable
                ? colors.accent
                : colors.neutralTint,
              flex: positionsFlex === 0 ? 0 : Math.max(0.03, positionsFlex),
            },
          ]}
        />
      </View>
      <View style={[styles.legend, narrow && styles.legendNarrow]}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.holdings }]}
          />
          <Text style={[styles.legendLabel, narrow && styles.legendTypeNarrow]}>
            Holdings
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.legendValue, narrow && styles.legendTypeNarrow]}
          >
            {loading
              ? '—'
              : formatUsd(
                  holdings,
                  holdingsStatus === 'Loading' ? 'Loading…' : 'Unavailable',
                )}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.accent }]}
          />
          <Text style={[styles.legendLabel, narrow && styles.legendTypeNarrow]}>
            Positions
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.legendValue, narrow && styles.legendTypeNarrow]}
          >
            {loading
              ? '—'
              : formatUsd(
                  positions,
                  positionsStatus === 'Loading' ? 'Loading…' : 'Unavailable',
                )}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.elevated,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.summaryBorder,
  },
  cardNarrow: { padding: 15, borderRadius: 20 },
  addressTarget: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    flexShrink: 1,
  },
  // Surround the 24/23pt chip with a 44pt target without moving the balance.
  identity: {
    height: 44,
    marginVertical: -10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  identityNarrow: { marginVertical: -10.5 },
  addressChip: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: colors.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  addressChipNarrow: { height: 23, paddingHorizontal: 8 },
  address: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  addressNarrow: { fontSize: 11 },
  pressed: { opacity: 0.7 },
  overflowBadge: {
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 7,
    backgroundColor: colors.neutralTint,
    justifyContent: 'center',
  },
  overflowBadgeNarrow: { height: 23 },
  overflowText: { fontSize: 9, fontWeight: '600', color: colors.textTertiary },
  balanceRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 11,
  },
  balance: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.4,
    lineHeight: 40,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  balanceNarrow: { fontSize: 36, lineHeight: 36, letterSpacing: -1.26 },
  balanceMissing: { fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  delta: {
    fontSize: 13.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  deltaNarrow: { fontSize: 13 },
  balanceSkeleton: {
    width: 168,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.neutralTint,
  },
  bar: { marginTop: 13, height: 6, flexDirection: 'row', gap: 3 },
  barSegment: { borderRadius: 3 },
  legend: { marginTop: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  legendNarrow: { gap: 14 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  legendLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  legendValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  legendTypeNarrow: { fontSize: 12 },
});
