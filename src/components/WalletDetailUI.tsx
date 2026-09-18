import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatChainDisplayName } from '../utils/chains';
import { walletDetailColors as colors } from '../theme/walletDetail';

export function WalletIconButton({
  name,
  label,
  narrow,
  onPress,
}: {
  name: string;
  label: string;
  narrow: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.iconTarget}
      hitSlop={3}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.icon,
            narrow && styles.iconNarrow,
            pressed && styles.iconPressed,
          ]}
        >
          <Ionicons
            name={name}
            size={name === 'ellipsis-horizontal' ? 14 : 17}
            color={
              name === 'ellipsis-horizontal'
                ? colors.textSecondary
                : colors.textPrimary
            }
          />
        </View>
      )}
    </Pressable>
  );
}

export function NetworkBadge({
  chainId,
  identity = false,
  narrow = false,
}: {
  chainId?: string;
  identity?: boolean;
  narrow?: boolean;
}) {
  if (!chainId) {
    return null;
  }
  const ethereum = chainId === 'ethereum-mainnet';
  const base = chainId === 'base-mainnet';
  const name = formatChainDisplayName(chainId);
  const label = identity ? name : ethereum ? 'ETH' : name.toUpperCase();
  return (
    <View
      style={[
        styles.badge,
        identity && styles.identityBadge,
        identity && narrow && styles.identityBadgeNarrow,
        ethereum
          ? styles.ethBadge
          : base
          ? styles.baseBadge
          : styles.otherBadge,
      ]}
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[
          styles.badgeText,
          narrow && styles.badgeTextNarrow,
          ethereum ? styles.ethText : base ? styles.baseText : styles.otherText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function WalletSectionHeader({
  label,
  networkFilter,
  narrow = false,
}: {
  label: string;
  networkFilter?: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, narrow && styles.sectionHeaderNarrow]}>
      <Text style={[styles.sectionTitle, narrow && styles.sectionTitleNarrow]}>
        {label}
      </Text>
      {networkFilter}
    </View>
  );
}

// No alert severity/count/connection selector exists yet. This is a settings
// affordance, not an assertion that the wallet is quiet or actively connected.
export function WalletMonitoringCard({
  narrow,
  fontScale,
  onPress,
}: {
  narrow: boolean;
  fontScale: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open wallet alert settings"
      onPress={onPress}
      style={({ pressed }) => [
        styles.monitor,
        narrow && styles.monitorNarrow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.monitorTile, narrow && styles.monitorTileNarrow]}>
        <Ionicons
          name="notifications-outline"
          size={16}
          color={colors.textSecondary}
        />
      </View>
      <View style={styles.monitorBody}>
        <Text
          maxFontSizeMultiplier={1.6}
          style={[styles.monitorTitle, narrow && styles.monitorTitleNarrow]}
        >
          Wallet notifications
        </Text>
        <Text
          maxFontSizeMultiplier={1.6}
          numberOfLines={fontScale > 1.3 ? 2 : 1}
          style={[
            styles.monitorSubtitle,
            narrow && styles.monitorSubtitleNarrow,
          ]}
        >
          Manage this wallet’s alert settings
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.textTertiary} />
    </Pressable>
  );
}

export function WalletListLoading({
  label,
  narrow = false,
}: {
  label: string;
  narrow?: boolean;
}) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.loading}
    >
      {[0, 1, 2].map(index => (
        <View
          key={index}
          style={[styles.skeletonRow, narrow && styles.skeletonRowNarrow]}
        >
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonName} />
            <View style={styles.skeletonQuantity} />
          </View>
          <View style={styles.skeletonValue} />
        </View>
      ))}
    </View>
  );
}

export function WalletListState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function DataQualityFooter({
  text,
  action,
  onPress,
  fontScale = 1,
}: {
  text: string;
  action?: string;
  onPress?: () => void;
  fontScale?: number;
}) {
  return (
    <View style={styles.footer}>
      <Text
        maxFontSizeMultiplier={1.6}
        numberOfLines={fontScale > 1.3 ? 2 : 1}
        style={styles.footerText}
      >
        {text}
      </Text>
      {action && onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          hitSlop={10}
          style={styles.footerTarget}
        >
          <Text style={styles.footerAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.iconBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconNarrow: { width: 36, height: 36, borderRadius: 12 },
  iconPressed: { backgroundColor: colors.selected },
  pressed: { opacity: 0.7 },
  badge: {
    height: 19,
    paddingHorizontal: 7,
    borderRadius: 6,
    flexShrink: 0,
    justifyContent: 'center',
  },
  identityBadge: { height: 24, paddingHorizontal: 8, borderRadius: 7 },
  identityBadgeNarrow: { height: 23, paddingHorizontal: 7 },
  badgeText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.54 },
  badgeTextNarrow: { fontSize: 8.5 },
  ethBadge: { backgroundColor: 'rgba(108,124,232,0.14)' },
  baseBadge: { backgroundColor: 'rgba(47,107,255,0.14)' },
  otherBadge: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  ethText: { color: '#9AA8F5' },
  baseText: { color: colors.link },
  otherText: { color: colors.textTertiary },
  sectionHeader: {
    marginTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
    zIndex: 10,
  },
  sectionHeaderNarrow: { marginTop: 12, paddingBottom: 9 },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  sectionTitleNarrow: { fontSize: 13 },
  monitor: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 62,
  },
  monitorNarrow: {
    marginTop: 9,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 12,
  },
  monitorTile: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitorTileNarrow: { width: 36, height: 36, borderRadius: 12 },
  monitorBody: { flex: 1, minWidth: 0 },
  monitorTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
    color: colors.textPrimary,
  },
  monitorTitleNarrow: { fontSize: 14.5 },
  monitorSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 3,
    color: colors.textSecondary,
  },
  monitorSubtitleNarrow: { fontSize: 12 },
  loading: { gap: 8 },
  skeletonRow: {
    height: 60,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  skeletonRowNarrow: { paddingHorizontal: 13, borderRadius: 16, gap: 12 },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutralTint,
  },
  skeletonBody: { flex: 1, gap: 5 },
  skeletonName: {
    width: '75%',
    height: 15,
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
  skeletonQuantity: {
    width: '55%',
    height: 11,
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
  skeletonValue: {
    width: 60,
    height: 16,
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 120,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateBody: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retry: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 14,
    marginTop: 14,
    borderRadius: 11,
    backgroundColor: colors.neutralTint,
    justifyContent: 'center',
  },
  retryText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  footer: {
    marginTop: 10,
    paddingHorizontal: 4,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  footerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
    color: colors.textTertiary,
  },
  footerTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  footerAction: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    flexShrink: 0,
  },
});
