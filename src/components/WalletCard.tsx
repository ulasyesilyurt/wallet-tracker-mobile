import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Wallet } from '../types/wallet';
import { NetworkBadge } from './WalletDetailUI';
import { walletsColors as colors, getWalletsLayout } from '../theme/wallets';
import { formatUsdCompact, shortenAddress } from '../utils/format';
import { getWalletEnabledChains } from '../utils/chains';

type WalletCardProps = {
  wallet: Wallet;
  width: number;
  totalValueUsd?: number | null;
  changePercent?: number | null;
  isBalanceLoading?: boolean;
  onPress: () => void;
};

export function WalletCard({
  wallet,
  width,
  totalValueUsd,
  changePercent,
  isBalanceLoading,
  onPress,
}: WalletCardProps) {
  const layout = getWalletsLayout(width);
  const compactValue = formatUsdCompact(totalValueUsd);
  const availableChains = getWalletEnabledChains(
    wallet.chainId,
    wallet.enabledChains,
  );
  const primaryChain = availableChains.includes(wallet.chainId)
    ? wallet.chainId
    : availableChains[0];
  const extraChainCount = Math.max(0, availableChains.length - 1);
  const avatarTheme = getChainAvatarTheme(primaryChain);
  const name = wallet.label || 'Unnamed wallet';
  const percentageAvailable =
    typeof changePercent === 'number' && Number.isFinite(changePercent);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          height: layout.rowHeight,
          borderRadius: layout.rowRadius,
          paddingHorizontal: layout.rowPadding,
        },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.row, { gap: layout.rowGap }]}>
        <View
          style={[
            styles.avatar,
            {
              width: layout.avatarSize,
              height: layout.avatarSize,
              borderRadius: layout.avatarSize / 2,
            },
            avatarTheme.container,
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.avatarText, avatarTheme.text]}
          >
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.identity}>
          <View style={styles.nameLine}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.2}
              style={[styles.name, layout.narrow && styles.nameNarrow]}
            >
              {name}
            </Text>
            <NetworkBadge chainId={primaryChain} narrow={layout.narrow} />
            {extraChainCount > 0 ? (
              <View style={styles.overflowBadge}>
                <Text style={styles.overflowText}>+{extraChainCount}</Text>
              </View>
            ) : null}
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.address, layout.narrow && styles.addressNarrow]}
          >
            {shortenAddress(wallet.address).replace('...', '…')}
          </Text>
        </View>

        <View style={styles.valueColumn}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[
              styles.value,
              layout.narrow && styles.valueNarrow,
              compactValue == null && !isBalanceLoading && styles.unavailable,
            ]}
          >
            {isBalanceLoading && compactValue == null
              ? 'Loading…'
              : compactValue ?? '—'}
          </Text>
          {percentageAvailable ? (
            <Text
              style={[
                styles.percentage,
                changePercent! > 0
                  ? styles.positive
                  : changePercent! < 0
                  ? styles.negative
                  : styles.flat,
              ]}
            >
              {changePercent! > 0 ? '+' : ''}
              {changePercent!.toFixed(2)}%
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function getChainAvatarTheme(chainId: string | undefined) {
  if (chainId === 'ethereum-mainnet') {
    return { container: styles.ethAvatar, text: styles.ethAvatarText };
  }
  if (chainId === 'base-mainnet') {
    return { container: styles.baseAvatar, text: styles.baseAvatarText };
  }
  return { container: styles.unknownAvatar, text: styles.unknownAvatarText };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  cardPressed: { backgroundColor: '#12151A' },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ethAvatar: {
    backgroundColor: 'rgba(108,124,232,0.16)',
    borderColor: 'rgba(108,124,232,0.30)',
  },
  ethAvatarText: { color: '#9AA8F5' },
  baseAvatar: {
    backgroundColor: 'rgba(47,107,255,0.16)',
    borderColor: 'rgba(47,107,255,0.30)',
  },
  baseAvatarText: { color: colors.link },
  unknownAvatar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: colors.iconBorder,
  },
  unknownAvatarText: { color: colors.textTertiary },
  avatarText: { fontSize: 16, fontWeight: '700' },
  identity: { flex: 1, minWidth: 0 },
  nameLine: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.17,
    color: colors.textPrimary,
  },
  nameNarrow: { fontSize: 16 },
  address: { marginTop: 5, fontSize: 11.5, color: colors.textTertiary },
  addressNarrow: { fontSize: 11 },
  overflowBadge: {
    height: 19,
    paddingHorizontal: 6,
    borderRadius: 6,
    flexShrink: 0,
    justifyContent: 'center',
    backgroundColor: colors.neutralTint,
  },
  overflowText: { fontSize: 9, fontWeight: '600', color: colors.textTertiary },
  valueColumn: { flexShrink: 0, alignItems: 'flex-end', minWidth: 58 },
  value: {
    fontSize: 19,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.38,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  valueNarrow: { fontSize: 18, lineHeight: 18 },
  unavailable: { color: colors.textTertiary },
  percentage: {
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
  flat: { color: colors.textTertiary },
});
