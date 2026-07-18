import React, {useEffect, useRef, useState} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {WalletEvent} from '../api/events';
import {colors} from '../theme/colors';
import {getTokenIconTheme} from '../utils/avatar';
import {
  formatChainDisplayName,
  getChainBadgeTheme,
  getDexscreenerTokenUrl,
  getOpenSeaItemUrl,
  getTransactionExplorerUrl,
} from '../utils/chains';
import {
  formatEventUsdValue,
  formatSignedEventAmount,
  getEventDetailTitle,
  isFungibleTokenEvent,
  isNftEvent,
  shortenAddress,
} from '../utils/format';

type EventDetailModalProps = {
  event: WalletEvent | null;
  onClose: () => void;
};

type DetailRowProps = {
  label: string;
  value: string;
  copyValue?: string;
  monospace?: boolean;
};

function getRemoteImageUrl(value: string | null | undefined) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
    return null;
  }

  return value;
}

function formatEventDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function previewHash(value: string) {
  if (value.length < 20) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function CopyButton({value}: {value: string}) {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCopy() {
    Clipboard.setString(value);
    setCopied(true);

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      resetTimeoutRef.current = null;
    }, 1500);
  }

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Pressable
      accessibilityLabel={copied ? 'Copied' : 'Copy'}
      accessibilityRole="button"
      hitSlop={6}
      onPress={handleCopy}
      style={({pressed}) => [styles.copyButton, pressed ? styles.buttonPressed : null]}>
      <Ionicons
        name={copied ? 'checkmark-outline' : 'copy-outline'}
        size={14}
        color={copied ? colors.positive : colors.textSecondary}
      />
      <Text style={[styles.copyButtonText, copied ? styles.copyButtonTextSuccess : null]}>
        {copied ? 'Copied' : 'Copy'}
      </Text>
    </Pressable>
  );
}

function DetailRow({label, value, copyValue, monospace = false}: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueWrap}>
        <Text
          numberOfLines={1}
          style={[styles.detailValue, monospace ? styles.detailValueMonospace : null]}>
          {value}
        </Text>
        {copyValue ? <CopyButton value={copyValue} /> : null}
      </View>
    </View>
  );
}

function ExternalLinkButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({pressed}) => [styles.linkButton, pressed ? styles.buttonPressed : null]}>
      <Text style={styles.linkButtonText}>{label}</Text>
      <Ionicons name="open-outline" size={17} color={colors.accent} />
    </Pressable>
  );
}

export function EventDetailModal({event, onClose}: EventDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [imageFailed, setImageFailed] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setImageFailed(false);
    setLinkError(null);
  }, [event?.id, event?.assetImageUrl]);

  if (!event) {
    return null;
  }

  const nftEvent = isNftEvent(event.eventType, event.assetType);
  const fungibleTokenEvent = isFungibleTokenEvent(event.eventType, event.assetType);
  const title = getEventDetailTitle({
    eventType: event.eventType,
    assetType: event.assetType,
    direction: event.direction,
  });
  const amountLabel = formatSignedEventAmount(
    event.amount,
    event.assetSymbol,
    event.assetName ?? null,
    event.direction,
  );
  const usdValueLabel = formatEventUsdValue({
    usdValue: event.usdValue,
    usdValueStatus: event.usdValueStatus,
    eventType: event.eventType,
    assetType: event.assetType,
  });
  const assetName = event.assetName || event.assetSymbol || 'Unknown asset';
  const iconTheme = getTokenIconTheme(event.assetSymbol, event.assetName ?? null);
  const imageUrl = getRemoteImageUrl(event.assetImageUrl);
  const chainLabel = formatChainDisplayName(event.chainId);
  const chainTheme = getChainBadgeTheme(event.chainId);
  const transactionHash = event.transactionHash?.trim() || null;
  const explorerUrl = getTransactionExplorerUrl(event.chainId, transactionHash);
  const dexscreenerUrl = fungibleTokenEvent
    ? getDexscreenerTokenUrl(event.chainId, event.assetContractAddress)
    : null;
  const openSeaUrl = nftEvent
    ? getOpenSeaItemUrl(
        event.chainId,
        event.assetContractAddress,
        event.assetTokenId,
      )
    : null;
  const hasExternalLinks = Boolean(explorerUrl || dexscreenerUrl || openSeaUrl);

  async function openExternalUrl(url: string) {
    setLinkError(null);

    try {
      await Linking.openURL(url);
    } catch {
      setLinkError('Could not open this link. Please try again.');
    }
  }

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close event details"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View style={[styles.sheet, {paddingBottom: Math.max(insets.bottom, 18)}]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.timestamp}>{formatEventDateTime(event.occurredAt)}</Text>
            </View>
            <Pressable
              accessibilityLabel="Close event details"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({pressed}) => [
                styles.closeButton,
                pressed ? styles.buttonPressed : null,
              ]}>
              <Ionicons name="close" size={21} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}>
            <View style={styles.assetSection}>
              <View style={[styles.assetIcon, {backgroundColor: iconTheme.backgroundColor}]}>
                {imageUrl && !imageFailed ? (
                  <Image
                    accessibilityIgnoresInvertColors
                    onError={() => setImageFailed(true)}
                    source={{uri: imageUrl}}
                    style={styles.assetImage}
                  />
                ) : (
                  <Text style={[styles.assetIconText, {color: iconTheme.textColor}]}>
                    {nftEvent ? 'NFT' : iconTheme.label}
                  </Text>
                )}
              </View>

              <View style={styles.assetIdentity}>
                <Text numberOfLines={1} style={styles.amountLabel}>
                  {amountLabel}
                </Text>
                <Text numberOfLines={1} style={styles.assetName}>
                  {assetName}
                </Text>
                {usdValueLabel ? <Text style={styles.usdValue}>{usdValueLabel}</Text> : null}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.detailsSection}>
              {event.direction === 'incoming' && event.fromAddress ? (
                <DetailRow
                  copyValue={event.fromAddress}
                  label="From"
                  value={shortenAddress(event.fromAddress)}
                />
              ) : null}
              {event.direction === 'outgoing' && event.toAddress ? (
                <DetailRow
                  copyValue={event.toAddress}
                  label="To"
                  value={shortenAddress(event.toAddress)}
                />
              ) : null}
              {event.direction !== 'incoming' && event.direction !== 'outgoing' ? (
                <>
                  {event.fromAddress ? (
                    <DetailRow
                      copyValue={event.fromAddress}
                      label="From"
                      value={shortenAddress(event.fromAddress)}
                    />
                  ) : null}
                  {event.toAddress ? (
                    <DetailRow
                      copyValue={event.toAddress}
                      label="To"
                      value={shortenAddress(event.toAddress)}
                    />
                  ) : null}
                </>
              ) : null}
              {chainLabel ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Network</Text>
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
                </View>
              ) : null}
              {transactionHash ? (
                <DetailRow
                  copyValue={transactionHash}
                  label="Transaction"
                  monospace
                  value={previewHash(transactionHash)}
                />
              ) : null}
            </View>

            {hasExternalLinks ? (
              <>
                <Text style={styles.sectionLabel}>Links</Text>
                <View style={styles.linksSection}>
                  {explorerUrl ? (
                    <ExternalLinkButton
                      label="View on block explorer"
                      onPress={() => {
                        openExternalUrl(explorerUrl);
                      }}
                    />
                  ) : null}
                  {dexscreenerUrl ? (
                    <ExternalLinkButton
                      label="View on Dexscreener"
                      onPress={() => {
                        openExternalUrl(dexscreenerUrl);
                      }}
                    />
                  ) : null}
                  {openSeaUrl ? (
                    <ExternalLinkButton
                      label="View on OpenSea"
                      onPress={() => {
                        openExternalUrl(openSeaUrl);
                      }}
                    />
                  ) : null}
                </View>
              </>
            ) : null}

            {linkError ? <Text style={styles.linkError}>{linkError}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  sheet: {
    maxHeight: '88%',
    paddingTop: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    marginBottom: 14,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingTop: 18,
  },
  scrollView: {
    flexShrink: 1,
  },
  assetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  assetImage: {
    width: '100%',
    height: '100%',
  },
  assetIconText: {
    fontSize: 13,
    fontWeight: '800',
  },
  assetIdentity: {
    flex: 1,
    minWidth: 0,
  },
  amountLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  assetName: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textSecondary,
  },
  usdValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsSection: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValueWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  detailValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  detailValueMonospace: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  copyButton: {
    minWidth: 66,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  copyButtonTextSuccess: {
    color: colors.positive,
  },
  chainPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chainPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  linksSection: {
    gap: 8,
  },
  linkButton: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  linkError: {
    marginTop: 12,
    fontSize: 13,
    color: colors.negative,
    textAlign: 'center',
  },
});
