import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { walletDetailColors as colors } from '../theme/walletDetail';
import { NetworkBadge } from './WalletDetailUI';

type WalletHistoryRowProps = {
  title: string;
  subtitle: string;
  glyph: string;
  incoming: boolean;
  chainId: string;
  usdValue: string | null;
  hash?: string | null;
  narrow?: boolean;
  onPress?: () => void;
  onOpenHash?: (event: GestureResponderEvent) => void;
  onCopy?: (event: GestureResponderEvent) => void;
};

// Formatting, external links, clipboard state and detail selection stay with callers.
export function WalletHistoryRow({
  title,
  subtitle,
  glyph,
  incoming,
  chainId,
  usdValue,
  hash,
  narrow = false,
  onPress,
  onOpenHash,
  onCopy,
}: WalletHistoryRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        narrow && styles.cardNarrow,
        pressed && styles.pressed,
      ]}
    >
      <Pressable
        onPress={onCopy}
        disabled={!onCopy}
        accessibilityRole={onCopy ? 'button' : undefined}
        accessibilityLabel={onCopy ? 'Copy counterparty address' : undefined}
        style={[styles.tileTarget, narrow && styles.tileTargetNarrow]}
      >
        <View
          style={[
            styles.tile,
            narrow && styles.tileNarrow,
            incoming ? styles.incoming : styles.outgoing,
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.2}
            style={[
              styles.glyph,
              { color: incoming ? colors.positive : colors.negative },
            ]}
          >
            {glyph}
          </Text>
          {onCopy ? <Text style={styles.copyGlyph}>⧉</Text> : null}
        </View>
      </Pressable>
      <View style={styles.identity}>
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={[styles.title, narrow && styles.titleNarrow]}
        >
          {title}
        </Text>
        <View style={styles.subtitleRow}>
          <NetworkBadge chainId={chainId} narrow={narrow} />
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={[styles.subtitle, narrow && styles.subtitleNarrow]}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole={onOpenHash ? 'link' : undefined}
        accessibilityLabel={
          onOpenHash ? 'Open transaction in explorer' : undefined
        }
        disabled={!onOpenHash}
        onPress={onOpenHash}
        style={styles.values}
      >
        {usdValue ? (
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={styles.usd}
          >
            {usdValue}
          </Text>
        ) : null}
        {hash ? (
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.hash, !onOpenHash && styles.unavailable]}
          >
            {hash}
          </Text>
        ) : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 60,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  cardNarrow: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 16,
    gap: 12,
  },
  pressed: { opacity: 0.7 },
  tileTarget: {
    width: 44,
    height: 44,
    marginHorizontal: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTargetNarrow: { marginHorizontal: -5 },
  copyGlyph: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 9,
    color: colors.textTertiary,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileNarrow: { width: 34, height: 34 },
  incoming: { backgroundColor: 'rgba(53,200,142,0.10)' },
  outgoing: { backgroundColor: 'rgba(245,85,93,0.10)' },
  glyph: { fontSize: 16, fontWeight: '700' },
  identity: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
    color: colors.textPrimary,
  },
  titleNarrow: { fontSize: 14.5 },
  subtitleRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textTertiary,
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  subtitleNarrow: { fontSize: 10.5 },
  values: {
    flexShrink: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  usd: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  hash: { marginTop: 4, fontSize: 10.5, lineHeight: 14, color: colors.link },
  unavailable: { color: colors.textTertiary },
});
