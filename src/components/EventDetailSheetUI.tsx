import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventTile } from './ActivityRow';
import { ListSectionHeader } from './SettingsUI';
import {
  eventDetailColors as colors,
  getEventDetailLayout,
} from '../theme/eventDetail';
import type {
  EventDetailLeg as EventDetailLegModel,
  EventDetailStatus,
  EventDetailTone,
} from '../utils/eventDetailPresentation';
import type { ActivityKind } from '../utils/activityPresentation';

const monospace = Platform.select({ ios: 'Menlo', android: 'monospace' });

export function SheetShell({
  kind,
  title,
  timestamp,
  status,
  onClose,
  children,
}: {
  kind: ActivityKind;
  title: string;
  timestamp: string;
  status: EventDetailStatus;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getEventDetailLayout(width);
  const statusLabel = status === 'failed' ? 'FAILED' : status === 'pending' ? 'PENDING' : null;

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close event details"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.scrim}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.88,
              borderTopLeftRadius: layout.sheetRadius,
              borderTopRightRadius: layout.sheetRadius,
            },
          ]}
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[styles.handleZone, { height: layout.handleZoneHeight }]}
          >
            <View
              style={[styles.handle, { width: layout.handleWidth }]}
            />
          </View>

          <View
            style={[
              styles.header,
              {
                gap: layout.headerGap,
                paddingHorizontal: layout.gutter,
              },
            ]}
          >
            <EventTile
              kind={kind}
              size={layout.tileSize}
              radius={layout.tileRadius}
              glyphSize={layout.tileGlyphSize}
            />
            <View
              accessible
              accessibilityLabel={
                [title, statusLabel, timestamp].filter(Boolean).join(', ')
              }
              style={styles.headerCopy}
            >
              <View style={styles.titleLine}>
                <Text
                  numberOfLines={fontScale > 1.3 ? 2 : 1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.7}
                  style={[styles.title, { fontSize: layout.titleSize }]}
                >
                  {title}
                </Text>
                {statusLabel ? (
                  <View
                    style={[
                      styles.statusBadge,
                      status === 'failed'
                        ? styles.failedBadge
                        : styles.pendingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        status === 'failed'
                          ? styles.failedText
                          : styles.pendingText,
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.4}
                style={[
                  styles.timestamp,
                  {
                    fontSize: layout.timestampSize,
                    marginTop: layout.timestampTop,
                  },
                ]}
              >
                {timestamp}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={6}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Text
                importantForAccessibility="no"
                maxFontSizeMultiplier={1}
                style={styles.closeGlyph}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={{
              paddingHorizontal: layout.gutter,
              paddingTop: layout.bodyTop,
              paddingBottom: layout.bottomPadding + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function SheetSectionHeader({ title }: { title: string }) {
  return <ListSectionHeader compact title={title} />;
}

export function ValueRow({ value }: { value: string }) {
  const { width } = useWindowDimensions();
  const layout = getEventDetailLayout(width);
  return (
    <View style={[styles.valueRow, { minHeight: layout.valueRowMinHeight }]}>
      <Text style={[styles.valueLabel, { fontSize: layout.valueLabelSize }]}>
        Estimated value
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.value, { fontSize: layout.valueSize }]}
      >
        {value}
      </Text>
    </View>
  );
}

export function ResultBlock({
  status,
  title,
  body,
}: {
  status: Exclude<EventDetailStatus, null>;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.resultBlock}>
      <Text
        style={[
          styles.resultTitle,
          status === 'failed' ? styles.failedText : styles.pendingText,
        ]}
      >
        {title}
      </Text>
      <Text numberOfLines={2} style={styles.resultBody}>
        {body}
      </Text>
    </View>
  );
}

export function LegRow({
  leg,
  last,
}: {
  leg: EventDetailLegModel;
  last: boolean;
}) {
  const { width } = useWindowDimensions();
  const layout = getEventDetailLayout(width);
  const accessibilityLabel = [leg.label, leg.amount, leg.assetName, leg.usd]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.ruledRow,
        styles.legRow,
        { paddingVertical: layout.legPaddingVertical },
        last && styles.lastRuledRow,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.7}
        style={[
          styles.legLabel,
          {
            width: layout.legLabelWidth,
            fontSize: layout.legLabelSize,
          },
        ]}
      >
        {leg.label}
      </Text>
      <View style={styles.legBody}>
        {leg.amount ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={[
              styles.legAmount,
              { fontSize: layout.legAmountSize },
              toneStyle(leg.tone),
              leg.struck && styles.struck,
            ]}
          >
            {leg.amount}
          </Text>
        ) : null}
        {leg.assetName ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={[styles.legAsset, { fontSize: layout.legAssetSize }]}
          >
            {leg.assetName}
          </Text>
        ) : null}
      </View>
      {leg.usd ? (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
          style={[styles.legUsd, { fontSize: layout.legUsdSize }]}
        >
          {leg.usd}
        </Text>
      ) : null}
    </View>
  );
}

export function MetaRow({
  label,
  value,
  accessibilityValue,
  monospace: mono = false,
  last,
}: {
  label: string;
  value: React.ReactNode;
  accessibilityValue: string;
  monospace?: boolean;
  last: boolean;
}) {
  const { width } = useWindowDimensions();
  const layout = getEventDetailLayout(width);
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${accessibilityValue}`}
      style={[
        styles.ruledRow,
        styles.metaRow,
        { minHeight: layout.metaRowMinHeight },
        last && styles.lastRuledRow,
      ]}
    >
      <Text style={[styles.metaLabel, { fontSize: layout.metaLabelSize }]}>
        {label}
      </Text>
      <View style={[styles.metaValueSlot, { gap: layout.metaGap }]}>
        {typeof value === 'string' ? (
          <Text
            numberOfLines={1}
            style={[
              styles.metaValue,
              { fontSize: mono ? layout.metaMonoSize : layout.metaValueSize },
              mono && styles.monospace,
            ]}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

export function CopyRow({
  label,
  display,
  full,
  monospace: mono = true,
  last,
  onCopy,
  children,
}: {
  label: string;
  display: string;
  full: string;
  monospace?: boolean;
  last: boolean;
  onCopy: (value: string) => void;
  children?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const layout = getEventDetailLayout(width);
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  function handleCopy() {
    onCopy(full);
    setCopied(true);
    AccessibilityInfo.announceForAccessibility('Copied');
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => {
      setCopied(false);
      resetRef.current = null;
    }, 1200);
  }

  return (
    <Pressable
      accessibilityLabel={`Copy ${label}, ${full}`}
      accessibilityRole="button"
      hitSlop={layout.narrow ? { top: 1, bottom: 1 } : undefined}
      onPress={handleCopy}
      style={({ pressed }) => [
        styles.ruledRow,
        styles.metaRow,
        { minHeight: layout.metaRowMinHeight },
        last && styles.lastRuledRow,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={[styles.metaLabel, { fontSize: layout.metaLabelSize }]}>
        {label}
      </Text>
      <View style={[styles.metaValueSlot, { gap: layout.metaGap }]}>
        {children ?? (
          <Text
            numberOfLines={1}
            style={[
              styles.metaValue,
              { fontSize: mono ? layout.metaMonoSize : layout.metaValueSize },
              mono && styles.monospace,
            ]}
          >
            {display}
          </Text>
        )}
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.copyGlyph, copied && styles.copyGlyphSuccess]}
        >
          {copied ? '✓' : '⧉'}
        </Text>
      </View>
    </Pressable>
  );
}

export function LinkRow({
  label,
  last,
  onPress,
}: {
  label: string;
  last: boolean;
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const layout = getEventDetailLayout(width);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.ruledRow,
        styles.linkRow,
        { minHeight: layout.linkRowMinHeight },
        last && styles.lastRuledRow,
        pressed && styles.rowPressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.linkLabel, { fontSize: layout.linkLabelSize }]}
      >
        {label}
      </Text>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.linkGlyph, { fontSize: layout.linkGlyphSize }]}
      >
        ↗
      </Text>
    </Pressable>
  );
}

function toneStyle(tone: EventDetailTone) {
  if (tone === 'incoming') return styles.incomingAmount;
  if (tone === 'failed') return styles.failedAmount;
  return styles.neutralAmount;
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sheetEdge,
    elevation: 0,
    shadowOpacity: 0,
    overflow: 'hidden',
  },
  handleZone: { alignItems: 'center', justifyContent: 'center' },
  handle: { height: 4, borderRadius: 2, backgroundColor: colors.handle },
  header: {
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCopy: { flex: 1, minWidth: 0, paddingTop: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.38,
  },
  timestamp: {
    color: colors.textTertiary,
    fontFamily: monospace,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    justifyContent: 'center',
    flexShrink: 0,
  },
  failedBadge: { backgroundColor: 'rgba(245,85,93,0.12)' },
  pendingBadge: { backgroundColor: 'rgba(240,166,60,0.12)' },
  statusText: {
    fontFamily: monospace,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  failedText: { color: colors.negative },
  pendingText: { color: colors.warning },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  closeButtonPressed: { backgroundColor: 'rgba(255,255,255,0.10)' },
  closeGlyph: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  scroll: { flexShrink: 1 },
  ruledRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  lastRuledRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  valueLabel: { color: colors.textSecondary, fontWeight: '500' },
  value: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.44,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  resultBlock: {
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  resultTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14 },
  resultBody: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
  },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legLabel: { flexShrink: 0, color: colors.textTertiary, fontWeight: '700' },
  legBody: { flex: 1, minWidth: 0 },
  legAmount: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.15,
    fontVariant: ['tabular-nums'],
  },
  neutralAmount: { color: colors.textPrimary },
  incomingAmount: { color: colors.positive },
  failedAmount: { color: colors.textTertiary },
  struck: {
    textDecorationLine: 'line-through',
    textDecorationColor: 'rgba(255,255,255,0.28)',
  },
  legAsset: { marginTop: 2, color: colors.textSecondary, fontWeight: '500' },
  legUsd: {
    flexShrink: 0,
    color: colors.textTertiary,
    fontFamily: monospace,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: { flexShrink: 0, color: colors.textSecondary, fontWeight: '500' },
  metaValueSlot: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  metaValue: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  monospace: { color: colors.textDim, fontFamily: monospace, fontWeight: '500' },
  copyGlyph: {
    width: 20,
    height: 20,
    color: colors.textTertiary,
    fontFamily: monospace,
    fontSize: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    flexShrink: 0,
  },
  copyGlyphSuccess: { color: colors.positive },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkLabel: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  linkGlyph: { flexShrink: 0, color: colors.textTertiary, fontWeight: '600' },
});
