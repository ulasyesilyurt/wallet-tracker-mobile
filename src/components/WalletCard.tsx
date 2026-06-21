import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {Wallet} from '../types/wallet';
import {colors} from '../theme/colors';
import {getWalletAvatarTheme} from '../utils/avatar';
import {formatUsdCompact, shortenAddress} from '../utils/format';
import {formatChainDisplayName} from '../utils/chains';

type WalletCardProps = {
  wallet: Wallet;
  totalValueUsd?: number | null;
  changePercent?: number | null;
  secondaryLabel?: string;
  isBalanceLoading?: boolean;
  onPress: () => void;
};

export function WalletCard({wallet, totalValueUsd, changePercent, secondaryLabel, isBalanceLoading, onPress}: WalletCardProps) {
  const compactValue = formatUsdCompact(totalValueUsd);
  const avatarTheme = getWalletAvatarTheme(wallet.address, wallet.label);
  const chainLabel = formatChainDisplayName(wallet.chainId);
  const addressLine = `${shortenAddress(wallet.address)} • ${chainLabel}`;
  const performanceLabel =
    typeof changePercent === 'number' && Number.isFinite(changePercent)
      ? `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
      : secondaryLabel ?? 'Perf. pending';

  return (
    <Pressable style={({pressed}) => [styles.card, pressed ? styles.cardPressed : null]} onPress={onPress}>
      <View style={styles.row}>
        <View
          style={[
            styles.avatarBadge,
            {
              backgroundColor: avatarTheme.backgroundColor,
              borderColor: avatarTheme.borderColor,
            },
          ]}>
          <Text style={[styles.avatarText, {color: avatarTheme.textColor}]}>{avatarTheme.label}</Text>
        </View>

        <View style={styles.identityText}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {wallet.label || 'Unnamed wallet'}
            </Text>
            <View style={styles.valueWrap}>
              <Text style={styles.value}>{isBalanceLoading ? 'Loading…' : compactValue ?? 'Unavailable'}</Text>
              <Text style={styles.changeText}>{performanceLabel}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.address} numberOfLines={1}>
              {addressLine}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: colors.elevated,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{scale: 0.995}],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  avatarBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  identityText: {
    flex: 1,
  },
  titleRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    paddingRight: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  valueWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 92,
  },
  metaRow: {
    marginTop: 3,
  },
  address: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  changeText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 3,
  },
});
