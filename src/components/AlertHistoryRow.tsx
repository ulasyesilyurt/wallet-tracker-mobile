import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NotificationHistoryItem } from '../api/notifications';
import { NetworkBadge } from './WalletDetailUI';
import { alertsColors as colors, getAlertsLayout } from '../theme/alerts';
import {
  formatNotificationAge,
  getNotificationRowCopy,
} from '../utils/notificationHistoryPresentation';

type Props = {
  item: NotificationHistoryItem;
  width: number;
  onPress: () => void;
};

export function AlertHistoryRow({ item, width, onPress }: Props) {
  const layout = getAlertsLayout(width);
  const copy = getNotificationRowCopy(item);
  const walletName =
    item.walletEvent.walletLabel ||
    item.walletEvent.walletAddress ||
    'Tracked wallet';
  const initial = walletName.trim().charAt(0).toUpperCase() || 'W';
  const failed = item.status === 'failed';
  const pending = item.status === 'pending';
  const toneStyle =
    copy.tone === 'outgoing'
      ? styles.outgoingTile
      : copy.tone === 'incoming'
      ? styles.incomingTile
      : styles.movementTile;
  const toneText =
    copy.tone === 'outgoing'
      ? colors.negative
      : copy.tone === 'incoming'
      ? colors.positive
      : colors.accentText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.title}, ${walletName}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          height: layout.rowHeight,
          borderRadius: layout.rowRadius,
          paddingHorizontal: layout.rowPadding,
          gap: layout.rowGap,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.tile,
          toneStyle,
          {
            width: layout.tileSize,
            height: layout.tileSize,
            borderRadius: layout.tileRadius,
          },
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.2}
          style={[
            styles.glyph,
            layout.narrow && styles.glyphNarrow,
            { color: toneText },
          ]}
        >
          {copy.glyph}
        </Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.title, layout.narrow && styles.titleNarrow]}
          >
            {copy.title}
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.time, layout.narrow && styles.timeNarrow]}
          >
            {formatNotificationAge(item)}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={[styles.fact, layout.narrow && styles.factNarrow]}
        >
          {copy.fact}
        </Text>
        <View
          style={[
            styles.attribution,
            layout.narrow && styles.attributionNarrow,
          ]}
        >
          <View
            style={[
              styles.statusBadge,
              failed
                ? styles.failedBadge
                : pending
                ? styles.pendingBadge
                : null,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                failed
                  ? styles.failedText
                  : pending
                  ? styles.pendingText
                  : null,
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
          <View style={styles.walletChip}>
            <View style={styles.walletAvatar}>
              <Text style={styles.walletInitial}>{initial}</Text>
            </View>
            <Text numberOfLines={1} style={styles.walletName}>
              {walletName}
            </Text>
          </View>
          <NetworkBadge
            chainId={item.walletEvent.chainId}
            narrow={layout.narrow}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pressed: { backgroundColor: '#12151A' },
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  outgoingTile: { backgroundColor: 'rgba(245,85,93,0.10)' },
  incomingTile: { backgroundColor: 'rgba(53,200,142,0.10)' },
  movementTile: { backgroundColor: 'rgba(79,125,243,0.12)' },
  glyph: { fontSize: 15, fontWeight: '700' },
  glyphNarrow: { fontSize: 14 },
  body: { flex: 1, minWidth: 0 },
  titleLine: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
    color: colors.textDim,
  },
  titleNarrow: { fontSize: 14.5 },
  time: {
    fontSize: 11,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  timeNarrow: { fontSize: 10.5 },
  fact: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  factNarrow: { fontSize: 12 },
  attribution: {
    height: 18,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attributionNarrow: { marginTop: 7, gap: 7 },
  statusBadge: {
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  failedBadge: { backgroundColor: 'rgba(245,85,93,0.10)' },
  pendingBadge: { backgroundColor: 'rgba(240,166,60,0.10)' },
  statusText: {
    fontSize: 8.5,
    fontWeight: '600',
    letterSpacing: 0.51,
    color: colors.textTertiary,
  },
  failedText: { color: colors.negative },
  pendingText: { color: colors.warning },
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
    backgroundColor: 'rgba(108,124,232,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(108,124,232,0.18)',
  },
  walletInitial: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  walletName: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
  },
});
