import React, {useEffect, useState} from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getWalletPositions, type WalletPosition, type WalletPositions} from '../api/positions';
import {walletDetailColors as colors} from '../theme/walletDetail';
import {NetworkBadge, WalletSectionHeader, WalletListLoading, WalletListState, DataQualityFooter} from '../components/WalletDetailUI';
import {formatPositionTokenAmount} from '../utils/format';

type PositionsScreenProps = {
  walletId: string;
  selectedChainId?: string | null;
  prefetchedPositions?: WalletPositions | null;
  prefetchedPositionsLoading?: boolean;
  networkFilter?: React.ReactNode;
  narrow?: boolean;
  bottomPadding?: number;
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

function PositionCard({position, narrow}: {position: WalletPosition; narrow: boolean}) {
  const valueUsdText = formatValueUsd(position.valueUsd);
  const formattedAmount = formatPositionTokenAmount(position.amount);
  const state = position.positionType.toLowerCase();
  const stateLabel = state.includes('stak') ? 'STAKED' : state.includes('reward') ? 'REWARD'
    : state.includes('lock') ? 'LOCKED' : formatPositionTypeLabel(position.positionType).toUpperCase();
  return (
    <View style={[styles.positionCard, narrow && styles.positionCardNarrow]}>
      <View style={styles.positionHeader}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1}
          style={[styles.positionName, narrow && styles.positionNameNarrow]}>
          {position.protocolName}{position.assetName || position.assetSymbol ? ` · ${position.assetName || position.assetSymbol}` : ''}
        </Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1}
          style={[styles.positionValue, narrow && styles.positionValueNarrow, !valueUsdText && styles.unavailable]}>{valueUsdText ?? '—'}</Text>
      </View>
      <View style={styles.positionMetaRow}>
        <View style={[styles.stateBadge, state.includes('reward') && styles.rewardBadge, state.includes('lock') && styles.lockedBadge]}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.stateText,
            state.includes('reward') && styles.rewardText, state.includes('lock') && styles.lockedText]}>{stateLabel}</Text>
        </View>
        <NetworkBadge chainId={position.chainId} narrow={narrow} />
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.positionAmount, narrow && styles.positionAmountNarrow]}>
          {formattedAmount} {position.assetSymbol}
        </Text>
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
  networkFilter,
  narrow = false,
  bottomPadding = 16,
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

  const allPositions = effectivePositions?.positions ?? [];
  const filteredPositions = getFilteredPositionsByChain(allPositions, selectedChainId);
  const protocolPositions = sortPositionsByValueUsdDescending(filteredPositions);
  const hasRelevantPartial = effectivePositions?.isPartial === true && hasRelevantPartialReason(
    effectivePositions?.partialReasons,
    selectedChainId,
  );
  const isDegradedProviderEmptyState =
    hasRelevantPartial && filteredPositions.length === 0;
  const emptyTitle = isDegradedProviderEmptyState
    ? 'Positions temporarily unavailable'
    : 'No protocol positions yet';
  const emptyBody = isDegradedProviderEmptyState
    ? 'Protocol positions could not be refreshed right now because the provider is rate-limited. Try again later.'
    : 'This wallet has no indexed staking or DeFi positions right now, or the provider has not returned any yet.';

  const sectionHeader = <WalletSectionHeader
    label={effectivePositions ? `${protocolPositions.length} position${protocolPositions.length === 1 ? '' : 's'}` : 'Positions'}
    networkFilter={networkFilter} narrow={narrow} />;
  if (spinnerVisible) {
    return <View style={styles.tabContent}>{sectionHeader}<WalletListLoading label="Loading positions" narrow={narrow} /></View>;
  }
  if (error) {
    return <View style={styles.tabContent}>{sectionHeader}<WalletListState title="Could not load positions" body={error}
      onRetry={() => void loadPositions()} /></View>;
  }
  return (
    <FlatList
      data={protocolPositions}
      keyExtractor={(item, index) => `${item.chainId ?? 'unknown'}:${item.protocolName}:${item.assetSymbol}:${index}`}
      contentContainerStyle={[protocolPositions.length === 0 && styles.emptyContent, {paddingBottom: bottomPadding}]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPositions(true)} tintColor={colors.accent} />}
      ListHeaderComponent={sectionHeader} ListHeaderComponentStyle={styles.listHeader} removeClippedSubviews={false}
      renderItem={({item}) => <PositionCard position={item} narrow={narrow} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<WalletListState title={emptyTitle} body={emptyBody} />}
      ListFooterComponent={hasRelevantPartial ? <DataQualityFooter text="Some positions unavailable" action="Retry"
        onPress={() => void loadPositions(true)} /> : null}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  tabContent: {flex: 1}, emptyContent: {flexGrow: 1}, listHeader: {zIndex: 10}, separator: {height: 8},
  positionCard: {minHeight: 74, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 13},
  positionCardNarrow: {paddingHorizontal: 13, paddingVertical: 11, borderRadius: 16},
  positionHeader: {flexDirection: 'row', alignItems: 'baseline', gap: 13},
  positionName: {flex: 1, minWidth: 0, fontSize: 15, fontWeight: '700', letterSpacing: -0.15, color: colors.textPrimary},
  positionNameNarrow: {fontSize: 14.5},
  positionValue: {fontSize: 16, lineHeight: 16, fontWeight: '800', letterSpacing: -0.32,
    color: colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right'},
  positionValueNarrow: {fontSize: 15.5}, unavailable: {color: colors.textTertiary},
  positionMetaRow: {marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 7},
  positionAmount: {flex: 1, fontSize: 11, color: colors.textTertiary, textAlign: 'right', fontVariant: ['tabular-nums']},
  positionAmountNarrow: {fontSize: 10.5},
  stateBadge: {height: 19, paddingHorizontal: 7, borderRadius: 6, backgroundColor: colors.neutralTint, justifyContent: 'center'},
  stateText: {fontSize: 9, fontWeight: '600', letterSpacing: 0.54, color: colors.textSecondary},
  rewardBadge: {backgroundColor: 'rgba(53,200,142,0.10)'}, rewardText: {color: colors.positive},
  lockedBadge: {backgroundColor: 'rgba(240,166,60,0.10)'}, lockedText: {color: colors.warning},
});
