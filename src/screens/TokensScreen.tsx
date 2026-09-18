import React, {useEffect, useMemo, useState} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getWalletHoldings, type TokenHolding, type WalletHoldings} from '../api/holdings';
import {TokenHoldingCard} from '../components/TokenHoldingCard';
import {walletDetailColors as colors} from '../theme/walletDetail';
import {DataQualityFooter, WalletSectionHeader, WalletListLoading, WalletListState} from '../components/WalletDetailUI';
import {formatUsd} from '../utils/format';
import {isCanonicalProtectedTokenAddress} from '../utils/chains';

type TokensScreenProps = {
  walletId: string;
  selectedChainId?: string | null;
  prefetchedHoldings?: WalletHoldings | null;
  prefetchedHoldingsLoading?: boolean;
  networkFilter?: React.ReactNode;
  narrow?: boolean;
  bottomPadding?: number;
  fontScale?: number;
};

function formatTotalBalanceUsd(value: number | null) {
  if (value == null) {
    return null;
  }

  return formatUsd(value);
}

function getSortableBalanceUsd(holding: TokenHolding) {
  return typeof holding.balanceUsd === 'number' && Number.isFinite(holding.balanceUsd)
    ? holding.balanceUsd
    : null;
}

function sortTokenHoldingsByUsdValue(holdings: TokenHolding[]) {
  return [...holdings].sort((left, right) => {
    const leftUsd = getSortableBalanceUsd(left);
    const rightUsd = getSortableBalanceUsd(right);

    if (leftUsd != null && rightUsd != null) {
      return rightUsd - leftUsd;
    }

    if (leftUsd != null) {
      return -1;
    }

    if (rightUsd != null) {
      return 1;
    }

    const leftSymbol = left.symbol || left.name || left.tokenAddress || '';
    const rightSymbol = right.symbol || right.name || right.tokenAddress || '';
    return leftSymbol.localeCompare(rightSymbol);
  });
}

function renderSuspicionReason(reason: string) {
  return reason.replace(/_/g, ' ');
}

function getFilteredHoldingsByChain(holdings: TokenHolding[], selectedChainId?: string | null) {
  if (!selectedChainId) {
    return holdings;
  }

  return holdings.filter((holding) => holding.chainId === selectedChainId);
}

function getFilteredTotalBalanceUsd(holdings: TokenHolding[]) {
  const total = holdings.reduce((sum, holding) => {
    if (
      typeof holding.balanceUsd !== 'number' ||
      !Number.isFinite(holding.balanceUsd) ||
      holding.isSuspicious
    ) {
      return sum;
    }

    return sum + holding.balanceUsd;
  }, 0);

  const hasAnyPricedNonSuspiciousHolding = holdings.some(
    (holding) =>
      typeof holding.balanceUsd === 'number' &&
      Number.isFinite(holding.balanceUsd) &&
      !holding.isSuspicious,
  );

  return hasAnyPricedNonSuspiciousHolding ? total : null;
}

function isLowValueHolding(holding: TokenHolding) {
  if (holding.isSuspicious) {
    return false;
  }

  if (!holding.tokenAddress) {
    return false;
  }

  if (isCanonicalProtectedTokenAddress(holding.chainId, holding.tokenAddress)) {
    return false;
  }

  if (holding.balanceUsd == null) {
    return true;
  }

  return typeof holding.balanceUsd === 'number' && Number.isFinite(holding.balanceUsd) && holding.balanceUsd < 1;
}

export function TokensScreen({
  walletId,
  selectedChainId = null,
  prefetchedHoldings = null,
  prefetchedHoldingsLoading = false,
  networkFilter,
  narrow = false,
  bottomPadding = 16,
  fontScale = 1,
}: TokensScreenProps) {
  const [holdings, setHoldings] = useState<WalletHoldings | null>(prefetchedHoldings);
  const [loading, setLoading] = useState(prefetchedHoldings ? false : prefetchedHoldingsLoading || true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLowValueTokens, setShowLowValueTokens] = useState(false);
  const [showSuspiciousTokens, setShowSuspiciousTokens] = useState(false);

  async function loadHoldings(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextHoldings = await getWalletHoldings(walletId);
      setHoldings(nextHoldings);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load holdings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setHoldings(prefetchedHoldings);
    setError(null);
    setLoading(prefetchedHoldings ? false : prefetchedHoldingsLoading);
    setRefreshing(false);
  }, [prefetchedHoldings, prefetchedHoldingsLoading, walletId]);

  useEffect(() => {
    if (prefetchedHoldings) {
      return;
    }

    if (prefetchedHoldingsLoading) {
      return;
    }

    void loadHoldings();
  }, [prefetchedHoldings, prefetchedHoldingsLoading, walletId]);

  const effectiveHoldings = prefetchedHoldings ?? holdings;
  const spinnerVisible = loading && !effectiveHoldings;

  const allHoldings = effectiveHoldings?.holdings ?? [];
  const filteredHoldings = useMemo(
    () => getFilteredHoldingsByChain(allHoldings, selectedChainId),
    [allHoldings, selectedChainId],
  );
  const totalBalanceText = formatTotalBalanceUsd(
    selectedChainId ? getFilteredTotalBalanceUsd(filteredHoldings) : (effectiveHoldings?.totalBalanceUsd ?? null),
  );
  const tokenBalancesAvailable = effectiveHoldings?.tokenBalancesAvailable ?? true;
  const tokenBalancesReason = effectiveHoldings?.tokenBalancesReason ?? null;
  const nonSuspiciousHoldings = useMemo(
    () => filteredHoldings.filter((holding) => !holding.isSuspicious),
    [filteredHoldings],
  );
  const visibleTokenHoldings = useMemo(
    () => sortTokenHoldingsByUsdValue(nonSuspiciousHoldings.filter((holding) => !isLowValueHolding(holding))),
    [nonSuspiciousHoldings],
  );
  const lowValueTokenHoldings = useMemo(
    () => sortTokenHoldingsByUsdValue(nonSuspiciousHoldings.filter((holding) => isLowValueHolding(holding))),
    [nonSuspiciousHoldings],
  );
  const suspiciousTokenHoldings = useMemo(
    () => sortTokenHoldingsByUsdValue(filteredHoldings.filter((holding) => holding.isSuspicious)),
    [filteredHoldings],
  );
  const hasAnyHoldings = filteredHoldings.length > 0;
  const hasVisibleHoldings = visibleTokenHoldings.length > 0;
  const summaryNoticeText = !tokenBalancesAvailable
    ? tokenBalancesReason === 'TOKEN_BALANCES_RATE_LIMITED'
      ? 'Token balances are temporarily rate-limited. Native assets may still be shown.'
      : 'Some token balances are temporarily unavailable from the current provider.'
    : totalBalanceText == null && hasAnyHoldings
      ? 'Token balances loaded, but pricing is unavailable right now.'
      : null;

  const sectionHeader = <WalletSectionHeader
    label={effectiveHoldings ? `${visibleTokenHoldings.length} token${visibleTokenHoldings.length === 1 ? '' : 's'}` : 'Tokens'}
    networkFilter={networkFilter} narrow={narrow} />;

  if (spinnerVisible) {
    return <View style={styles.tabContent}>{sectionHeader}<WalletListLoading label="Loading holdings" narrow={narrow} /></View>;
  }
  if (error) {
    return <View style={styles.tabContent}>{sectionHeader}<WalletListState title="Could not load holdings" body={error}
      onRetry={() => void loadHoldings()} /></View>;
  }
  const hiddenCount = lowValueTokenHoldings.length;
  const flaggedCount = suspiciousTokenHoldings.length;
  const hasHidden = hiddenCount > 0 || flaggedCount > 0;
  const degraded = !tokenBalancesAvailable || (totalBalanceText == null && hasAnyHoldings);
  const qualityText = hasHidden ? `${hiddenCount} low-value hidden · ${flaggedCount} flagged`
      : degraded ? 'Some balances unavailable' : filteredHoldings.every(holding => holding.balanceUsd != null)
        ? `Nothing hidden — all ${filteredHoldings.length} tokens priced`
        : 'Some token prices unavailable';

  return (
    <FlatList
      data={visibleTokenHoldings}
      keyExtractor={item => `${item.chainId ?? 'unknown'}:${item.tokenAddress ?? 'native-eth'}`}
      contentContainerStyle={[!hasAnyHoldings && styles.emptyContent, {paddingBottom: bottomPadding}]}
      ListHeaderComponent={sectionHeader} ListHeaderComponentStyle={styles.listHeader}
      removeClippedSubviews={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadHoldings(true)} tintColor={colors.accent} />}
      renderItem={({item}) => <TokenHoldingCard holding={item} narrow={narrow} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={!hasVisibleHoldings ? (
        <WalletListState title={hasAnyHoldings ? 'Main token list is clean' : 'No token holdings yet'}
          body={hasAnyHoldings ? 'Only low value or suspicious tokens were found. Review them below.'
            : tokenBalancesAvailable ? 'This wallet does not have direct token balances available from the current provider.'
              : 'Token balances are temporarily limited right now. Pull to refresh and try again shortly.'} />
      ) : null}
      ListFooterComponent={
        <>
          <DataQualityFooter text={qualityText} fontScale={fontScale}
            action={hasHidden ? 'Review' : degraded ? 'Retry' : undefined}
            onPress={hasHidden ? () => {
              const show = !(showLowValueTokens || showSuspiciousTokens);
              setShowLowValueTokens(show);
              setShowSuspiciousTokens(show);
            } : () => void loadHoldings(true)} />
          {hasHidden && degraded ? <DataQualityFooter text="Some balances unavailable" action="Retry"
            onPress={() => void loadHoldings(true)} fontScale={fontScale} /> : null}
          {summaryNoticeText ? <Text style={styles.notice}>{summaryNoticeText}</Text> : null}
          {showLowValueTokens && hiddenCount > 0 ? (
            <View style={styles.reviewSection}>
              <Pressable accessibilityRole="button" style={styles.reviewHeader} onPress={() => setShowLowValueTokens(false)}>
                <Text style={styles.reviewTitle}>{hiddenCount} low value tokens</Text><Text style={styles.reviewAction}>Hide</Text>
              </Pressable>
              {lowValueTokenHoldings.map((holding, index) => (
                <View key={`${holding.chainId ?? 'unknown'}:${holding.tokenAddress ?? 'low-value-' + index}`}>
                  <TokenHoldingCard holding={holding} subdued narrow={narrow} />
                  {index < hiddenCount - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))}
            </View>
          ) : null}
          {showSuspiciousTokens && flaggedCount > 0 ? (
            <View style={styles.reviewSection}>
              <Pressable accessibilityRole="button" style={styles.reviewHeader} onPress={() => setShowSuspiciousTokens(false)}>
                <Text style={styles.reviewTitle}>{flaggedCount} suspicious tokens</Text><Text style={styles.reviewAction}>Hide</Text>
              </Pressable>
              <Text style={styles.notice}>Suspicious tokens are excluded from total balance.</Text>
              {suspiciousTokenHoldings.map((holding, index) => (
                <View key={`${holding.chainId ?? 'unknown'}:${holding.tokenAddress ?? 'suspicious-native-' + index}`}>
                  <TokenHoldingCard holding={holding} subdued narrow={narrow} />
                  {holding.suspicionReasons.length > 0 ? <Text style={styles.notice}>{holding.suspicionReasons.map(renderSuspicionReason).join(' · ')}</Text> : null}
                  {index < flaggedCount - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))}
            </View>
          ) : null}
        </>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  tabContent: {flex: 1},
  emptyContent: {flexGrow: 1},
  listHeader: {zIndex: 10},
  separator: {height: 8},
  notice: {marginTop: 8, marginBottom: 8, fontSize: 12.5, fontWeight: '500', lineHeight: 18, color: colors.textTertiary},
  reviewSection: {marginTop: 14},
  reviewHeader: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  reviewTitle: {fontSize: 13.5, fontWeight: '700', color: colors.textPrimary},
  reviewAction: {fontSize: 12.5, fontWeight: '700', color: colors.textSecondary},
});
