import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NetworkBadge } from './WalletDetailUI';
import { activityColors as colors, getActivityLayout } from '../theme/activity';
import type {
  ActivityKind,
  ActivityRowViewModel,
} from '../utils/activityPresentation';

type ActivityRowProps = {
  item: ActivityRowViewModel;
  width: number;
  dimmed?: boolean;
  onPress: () => void;
};

type EventTileProps = {
  kind: ActivityKind;
  size: number;
  radius: number;
  glyphSize: number;
};

const kindPresentation: Record<
  ActivityKind,
  { glyph: string; tile: object; glyphColor: string }
> = {
  incoming: {
    glyph: '↓',
    tile: { backgroundColor: 'rgba(53,200,142,0.12)' },
    glyphColor: colors.positive,
  },
  outgoing: {
    glyph: '↑',
    tile: { backgroundColor: colors.neutralTint },
    glyphColor: colors.textDim,
  },
  swap: {
    glyph: '⇄',
    tile: { backgroundColor: 'rgba(79,125,243,0.14)' },
    glyphColor: colors.accentText,
  },
  nft: {
    glyph: '◇',
    tile: { backgroundColor: 'rgba(108,124,232,0.14)' },
    glyphColor: '#9AA8F5',
  },
  approval: {
    glyph: '⌾',
    tile: { backgroundColor: 'rgba(240,166,60,0.12)' },
    glyphColor: colors.warning,
  },
  other: {
    glyph: '⌗',
    tile: { backgroundColor: colors.neutralTint },
    glyphColor: colors.textSecondary,
  },
  failed: {
    glyph: '✕',
    tile: { backgroundColor: 'rgba(245,85,93,0.12)' },
    glyphColor: colors.negative,
  },
  pending: {
    glyph: '•',
    tile: { backgroundColor: 'rgba(240,166,60,0.12)' },
    glyphColor: colors.warning,
  },
};

export function EventTile({
  kind,
  size,
  radius,
  glyphSize,
}: EventTileProps) {
  const presentation = kindPresentation[kind];

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        presentation.tile,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={[
          styles.glyph,
          { fontSize: glyphSize, color: presentation.glyphColor },
        ]}
      >
        {presentation.glyph}
      </Text>
    </View>
  );
}

export function WalletChip({
  name,
  fontSize = 12,
  color = colors.textTertiary,
}: {
  name: string;
  fontSize?: number;
  color?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || 'W';

  return (
    <View style={styles.walletChip}>
      <View style={styles.walletAvatar}>
        <Text style={styles.walletInitial}>{initial}</Text>
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[styles.walletName, { fontSize, color }]}
      >
        {name}
      </Text>
    </View>
  );
}

export function ActivityRow({
  item,
  width,
  dimmed = false,
  onPress,
}: ActivityRowProps) {
  const layout = getActivityLayout(width);
  const hasFact = Boolean(item.factPrefix || item.factAddress || item.usd);
  const status =
    item.kind === 'failed'
      ? 'FAILED'
      : item.kind === 'pending'
      ? 'PENDING'
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: hasFact ? layout.rowHeight : layout.rowHeight - 19,
          paddingVertical: layout.rowPaddingVertical,
          gap: layout.rowGap,
        },
        dimmed && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      <EventTile
        kind={item.kind}
        size={layout.tileSize}
        radius={layout.tileRadius}
        glyphSize={layout.glyphSize}
      />

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.title, { fontSize: layout.titleRowSize }]}
          >
            {item.title}
          </Text>
          {status ? (
            <View
              style={[
                styles.status,
                item.kind === 'failed'
                  ? styles.failedStatus
                  : styles.pendingStatus,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.kind === 'failed'
                    ? styles.failedStatusText
                    : styles.pendingStatusText,
                ]}
              >
                {status}
              </Text>
            </View>
          ) : item.amount ? (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={[
                styles.amount,
                { fontSize: layout.amountSize },
                item.kind === 'incoming' && styles.incomingAmount,
              ]}
            >
              {item.amount}
            </Text>
          ) : null}
        </View>

        {hasFact ? (
          <View style={styles.factLine}>
            {item.factPrefix || item.factAddress ? (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={styles.factCopy}
              >
                {item.factPrefix ? (
                  <Text style={[styles.fact, { fontSize: layout.factSize }]}>
                    {item.factPrefix}
                  </Text>
                ) : null}
                {item.factPrefix && item.factAddress ? ' ' : null}
                {item.factAddress ? (
                  <Text
                    style={[styles.address, { fontSize: layout.addressSize }]}
                  >
                    {item.factAddress}
                  </Text>
                ) : null}
              </Text>
            ) : (
              <View style={styles.factSpacer} />
            )}
            {item.usd ? (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={[styles.usd, { fontSize: layout.usdSize }]}
              >
                {item.usd}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={[styles.attribution, { marginTop: layout.attributionTop }]}
        >
          <WalletChip name={item.walletName} fontSize={layout.walletNameSize} />
          <NetworkBadge chainId={item.chainId} narrow={layout.narrow} />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.timestamp, { fontSize: layout.timestampSize }]}
          >
            {item.timestamp}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dimmed: { opacity: 0.62 },
  pressed: { backgroundColor: 'rgba(255,255,255,0.025)' },
  tile: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontWeight: '800' },
  body: { flex: 1, minWidth: 0 },
  titleLine: {
    minHeight: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  amount: {
    maxWidth: '47%',
    marginLeft: 8,
    color: colors.textPrimary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },
  incomingAmount: { color: colors.positive },
  status: {
    height: 19,
    paddingHorizontal: 6,
    borderRadius: 5,
    justifyContent: 'center',
  },
  failedStatus: { backgroundColor: 'rgba(245,85,93,0.12)' },
  pendingStatus: { backgroundColor: 'rgba(240,166,60,0.12)' },
  statusText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5 },
  failedStatusText: { color: colors.negative },
  pendingStatusText: { color: colors.warning },
  factLine: {
    height: 18,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  factCopy: { flex: 1, minWidth: 0 },
  fact: { color: colors.textSecondary, fontWeight: '500' },
  address: {
    color: colors.textTertiary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  factSpacer: { flex: 1 },
  usd: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  attribution: {
    height: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  walletChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,125,243,0.13)',
  },
  walletInitial: { fontSize: 9, fontWeight: '800', color: colors.accentText },
  walletName: {
    flex: 1,
    minWidth: 0,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  timestamp: {
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
});
