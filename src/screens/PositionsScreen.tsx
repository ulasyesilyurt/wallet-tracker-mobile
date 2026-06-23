import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getWalletPositions, type WalletPosition, type WalletPositions} from '../api/positions';
import {colors} from '../theme/colors';
import {formatPositionTokenAmount} from '../utils/format';
import {
  formatChainDisplayName,
  formatWalletChainsLabel,
  getChainBadgeTheme,
} from '../utils/chains';

type PositionsScreenProps = {
  walletId: string;
  selectedChainId?: string | null;
  prefetchedPositions?: WalletPositions | null;
  prefetchedPositionsLoading?: boolean;
};

function formatValueUsd(value: number | null) {
  if (value == null) {
    return null;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPositionTypeLabel(value: string) {
  if (!value) {
    return 'Position';
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTotalPositionsValue(positions: WalletPosition[]) {
  const total = positions.reduce((sum, position) => {
    if (typeof position.valueUsd !== 'number' || !Number.isFinite(position.valueUsd)) {
      return sum;
    }

    return sum + position.valueUsd;
  }, 0);

  const hasAnyValuedPosition = positions.some(
    position =>
      typeof position.valueUsd === 'number' && Number.isFinite(position.valueUsd),
  );

  return hasAnyValuedPosition ? total : null;
}

function getSortablePositionValueUsd(position: WalletPosition) {
  return typeof position.valueUsd === 'number' && Number.isFinite(position.valueUsd)
    ? position.valueUsd
    : null;
}

function sortPositionsByValueUsdDescending(positions: WalletPosition[]) {
  return [...positions].sort((left, right) => {
    const leftUsd = getSortablePositionValueUsd(left);
    const rightUsd = getSortablePositionValueUsd(right);

    if (leftUsd != null && rightUsd != null) {
      return rightUsd - leftUsd;
    }

    if (leftUsd != null) {
      return -1;
    }

    if (rightUsd != null) {
      return 1;
    }

    const leftLabel = `${left.protocolName}:${left.assetSymbol}:${left.assetName}`;
    const rightLabel = `${right.protocolName}:${right.assetSymbol}:${right.assetName}`;
    return leftLabel.localeCompare(rightLabel);
  });
}

function PositionCard({position}: {position: WalletPosition}) {
  const valueUsdText = formatValueUsd(position.valueUsd);
  const formattedAmount = formatPositionTokenAmount(position.amount);
  const positionTypeLabel = formatPositionTypeLabel(position.positionType);
  const positionChainLabel = formatChainDisplayName(position.chainId ?? '');
  const positionChainTheme = getChainBadgeTheme(position.chainId);

  return (
    <View style={styles.positionCard}>
      <View style={styles.positionHeader}>
        <View style={styles.positionIdentity}>
          <Text style={styles.positionProtocol} numberOfLines={1}>
            {position.protocolName}
          </Text>
          <Text style={styles.positionAsset} numberOfLines={1}>
            {position.assetSymbol}
            {position.assetName ? ` · ${position.assetName}` : ''}
          </Text>
        </View>
        <View style={styles.positionValueBlock}>
          <Text
            style={[
              styles.positionValueUsd,
              !valueUsdText ? styles.positionValueUnavailable : null,
            ]}>
            {valueUsdText ?? 'Unavailable'}
          </Text>
          <Text style={styles.positionAmount}>
            {formattedAmount} {position.assetSymbol}
          </Text>
        </View>
      </View>
      <View style={styles.positionMetaRow}>
        <View style={styles.positionMetaPills}>
          <View style={styles.metaPill}>
            <Text style={styles.positionMeta}>{positionTypeLabel}</Text>
          </View>
          {positionChainLabel ? (
            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: positionChainTheme.backgroundColor,
                  borderColor: positionChainTheme.borderColor,
                },
              ]}>
              <Text style={[styles.positionMeta, {color: positionChainTheme.textColor}]}>
                {positionChainLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.positionMetaSecondary}>Protocol asset</Text>
      </View>
    </View>
  );
}

function getFilteredPositionsByChain(positions: WalletPosition[], selectedChainId?: string | null) {
  if (!selectedChainId) {
    return positions;
  }

  return positions.filter((position) => position.chainId === selectedChainId);
}

function hasRelevantPartialReason(
  partialReasons: string[] | undefined,
  selectedChainId?: string | null,
) {
  if (!Array.isArray(partialReasons) || partialReasons.length === 0) {
    return false;
  }

  if (!selectedChainId) {
    return true;
  }

  return partialReasons.some((reason) => reason.endsWith(`:${selectedChainId}`));
}

export function PositionsScreen({
  walletId,
  selectedChainId = null,
  prefetchedPositions = null,
  prefetchedPositionsLoading = false,
}: PositionsScreenProps) {
  const [positions, setPositions] = useState<WalletPositions | null>(prefetchedPositions);
  const [loading, setLoading] = useState(prefetchedPositions ? false : prefetchedPositionsLoading || true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPositions(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextPositions = await getWalletPositions(walletId);
      setPositions(nextPositions);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load positions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setPositions(prefetchedPositions);
    setError(null);
    setLoading(prefetchedPositions ? false : prefetchedPositionsLoading);
    setRefreshing(false);
  }, [prefetchedPositions, prefetchedPositionsLoading, walletId]);

  useEffect(() => {
    if (prefetchedPositions) {
      return;
    }

    if (prefetchedPositionsLoading) {
      return;
    }

    void loadPositions();
  }, [prefetchedPositions, prefetchedPositionsLoading, walletId]);

  const effectivePositions = prefetchedPositions ?? positions;
  const spinnerVisible = loading && !effectivePositions;

  if (spinnerVisible) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.stateText}>Loading positions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Could not load positions</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => void loadPositions()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const allPositions = effectivePositions?.positions ?? [];
  const filteredPositions = getFilteredPositionsByChain(allPositions, selectedChainId);
  const protocolPositions = sortPositionsByValueUsdDescending(filteredPositions);
  const totalPositionsValue = formatValueUsd(getTotalPositionsValue(protocolPositions));
  const chainLabel = selectedChainId
    ? formatChainDisplayName(selectedChainId)
    : formatWalletChainsLabel(effectivePositions?.chainId ?? '', effectivePositions?.enabledChains);
  const chainTheme = getChainBadgeTheme(selectedChainId ?? effectivePositions?.chainId);
  const hasRelevantPartial = effectivePositions?.isPartial === true && hasRelevantPartialReason(
    effectivePositions?.partialReasons,
    selectedChainId,
  );
  const isDegradedProviderEmptyState =
    hasRelevantPartial && filteredPositions.length === 0;
  const summaryTitle = totalPositionsValue ??
    (isDegradedProviderEmptyState ? 'Positions temporarily unavailable' : 'No priced positions');
  const summaryBody = isDegradedProviderEmptyState
    ? 'Protocol positions could not be refreshed right now because the provider is rate-limited. Try again later.'
    : protocolPositions.length > 0
      ? 'Staked and protocol assets live here. Combine Tokens and Positions for a fuller portfolio view.'
      : 'Protocol deposits, staking, and vault assets will appear here when available.';
  const emptyTitle = isDegradedProviderEmptyState
    ? 'Positions temporarily unavailable'
    : 'No protocol positions yet';
  const emptyBody = isDegradedProviderEmptyState
    ? 'Protocol positions could not be refreshed right now because the provider is rate-limited. Try again later.'
    : 'This wallet has no indexed staking or DeFi positions right now, or the provider has not returned any yet.';

  return (
    <FlatList
      data={protocolPositions}
      keyExtractor={(item, index) => `${item.chainId ?? 'unknown'}:${item.protocolName}:${item.assetSymbol}:${index}`}
      contentContainerStyle={protocolPositions.length === 0 ? styles.emptyContent : styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadPositions(true)} tintColor={colors.accent} />
      }
      ListHeaderComponent={
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryKicker}>Positions</Text>
            {chainLabel ? (
              <View
                style={[
                  styles.summaryPill,
                  {
                    backgroundColor: chainTheme.backgroundColor,
                    borderColor: chainTheme.borderColor,
                  },
                ]}>
                <Text style={[styles.summaryPillText, {color: chainTheme.textColor}]}>
                  {chainLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.summaryTitle}>{summaryTitle}</Text>
          <Text style={styles.summaryBody}>{summaryBody}</Text>
        </View>
      }
      renderItem={({item}) => <PositionCard position={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.stateText}>{emptyBody}</Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorText: {
    marginTop: 10,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: colors.primaryCtaFill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: colors.primaryCtaText,
    fontWeight: '700',
  },
  emptyContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  listContent: {
    paddingBottom: 28,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
    marginBottom: 12,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryKicker: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  summaryTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  separator: {
    height: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  positionCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  positionIdentity: {
    flex: 1,
    paddingRight: 12,
  },
  positionProtocol: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  positionAsset: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  positionValueBlock: {
    alignItems: 'flex-end',
    minWidth: 102,
  },
  positionAmount: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  positionValueUsd: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  positionValueUnavailable: {
    color: colors.textSecondary,
  },
  positionMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  positionMetaPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  metaPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  positionMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  positionMetaSecondary: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});
