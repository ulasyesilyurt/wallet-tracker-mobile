import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getWalletHoldings, type TokenHolding, type WalletHoldings} from '../api/holdings';
import {TokenHoldingCard} from '../components/TokenHoldingCard';
import {colors} from '../theme/colors';
import {formatUsd} from '../utils/format';
import {isCanonicalProtectedTokenAddress} from '../utils/chains';

type TokensScreenProps = {
  walletId: string;
  selectedChainId?: string | null;
  prefetchedHoldings?: WalletHoldings | null;
  prefetchedHoldingsLoading?: boolean;
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
  const summaryBodyText = totalBalanceText
    ? 'Direct wallet holdings.'
    : hasAnyHoldings
      ? 'Pricing temporarily unavailable.'
      : 'No direct token balances yet.';
  const summaryStatusText = tokenBalancesAvailable
    ? hasAnyHoldings
      ? 'Live holdings'
      : 'No balances yet'
    : tokenBalancesReason === 'TOKEN_BALANCES_RATE_LIMITED'
      ? 'Partial data'
      : 'Data limited';
  const summaryNoticeText = !tokenBalancesAvailable
    ? tokenBalancesReason === 'TOKEN_BALANCES_RATE_LIMITED'
      ? 'Token balances are temporarily rate-limited. Native assets may still be shown.'
      : 'Some token balances are temporarily unavailable from the current provider.'
    : totalBalanceText == null && hasAnyHoldings
      ? 'Token balances loaded, but pricing is unavailable right now.'
      : null;

  if (spinnerVisible) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.stateText}>Loading holdings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Could not load holdings</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => void loadHoldings()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={visibleTokenHoldings}
      keyExtractor={item => `${item.chainId ?? 'unknown'}:${item.tokenAddress ?? 'native-eth'}`}
      contentContainerStyle={
        visibleTokenHoldings.length === 0 &&
        lowValueTokenHoldings.length === 0 &&
        suspiciousTokenHoldings.length === 0
          ? styles.emptyContent
          : styles.listContent
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadHoldings(true)} tintColor={colors.accent} />
      }
      ListHeaderComponent={
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryKicker}>Net worth</Text>
            <View style={styles.summaryStatusPill}>
              <Text style={styles.summaryStatusText}>{summaryStatusText}</Text>
            </View>
          </View>
          <Text style={styles.summaryTitle}>{totalBalanceText || 'Balance unavailable'}</Text>
          <Text style={styles.summaryBody}>{summaryBodyText}</Text>
          {summaryNoticeText ? (
            <View style={styles.summaryNotice}>
              <Text style={styles.summaryNoticeText}>{summaryNoticeText}</Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={({item}) => <TokenHoldingCard holding={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        !hasVisibleHoldings && lowValueTokenHoldings.length === 0 && suspiciousTokenHoldings.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No token holdings yet</Text>
            <Text style={styles.stateText}>
              {tokenBalancesAvailable
                ? 'This wallet does not have direct token balances available from the current provider.'
                : 'Token balances are temporarily limited right now. Pull to refresh and try again shortly.'}
            </Text>
          </View>
        ) : (
          <View style={styles.mainListEmptyState}>
            <Text style={styles.mainListEmptyTitle}>Main token list is clean</Text>
            <Text style={styles.stateText}>Only low value or suspicious tokens were found for this wallet. You can inspect them below if needed.</Text>
          </View>
        )
      }
      ListFooterComponent={
        <>
          {lowValueTokenHoldings.length > 0 ? (
            <View style={styles.lowValueSection}>
              <Pressable style={styles.lowValueHeader} onPress={() => setShowLowValueTokens((current) => !current)}>
                <View style={styles.lowValueHeaderTextBlock}>
                  <Text style={styles.lowValueTitle}>Low value tokens</Text>
                  <Text style={styles.lowValueSubtitle}>
                    {lowValueTokenHoldings.length} token{lowValueTokenHoldings.length === 1 ? '' : 's'} moved out of the main list to keep your portfolio view cleaner. Their value still counts toward the total when priced.
                  </Text>
                </View>
                <Text style={styles.lowValueToggle}>{showLowValueTokens ? 'Hide' : 'Show'}</Text>
              </Pressable>

              {showLowValueTokens ? (
                <View style={styles.lowValueList}>
                  {lowValueTokenHoldings.map((holding, index) => (
                    <View key={`${holding.chainId ?? 'unknown'}:${holding.tokenAddress ?? 'low-value-' + index}`}>
                      <TokenHoldingCard holding={holding} subdued />
                      {index < lowValueTokenHoldings.length - 1 ? <View style={styles.separator} /> : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {suspiciousTokenHoldings.length > 0 ? (
            <View style={styles.suspiciousSection}>
              <Pressable style={styles.suspiciousHeader} onPress={() => setShowSuspiciousTokens((current) => !current)}>
                <View style={styles.suspiciousHeaderTextBlock}>
                  <Text style={styles.suspiciousTitle}>Suspicious tokens</Text>
                  <Text style={styles.suspiciousSubtitle}>
                    {suspiciousTokenHoldings.length} token{suspiciousTokenHoldings.length === 1 ? '' : 's'} flagged by basic heuristics. Suspicious tokens are excluded from total balance.
                  </Text>
                </View>
                <Text style={styles.suspiciousToggle}>{showSuspiciousTokens ? 'Hide' : 'Show'}</Text>
              </Pressable>

              {showSuspiciousTokens ? (
                <View style={styles.suspiciousList}>
                  {suspiciousTokenHoldings.map((holding, index) => (
                    <View key={`${holding.chainId ?? 'unknown'}:${holding.tokenAddress ?? 'suspicious-native-' + index}`}>
                      <TokenHoldingCard holding={holding} subdued />
                      {holding.suspicionReasons.length > 0 ? (
                        <Text style={styles.suspicionReasonText}>
                          {holding.suspicionReasons.map(renderSuspicionReason).join(' · ')}
                        </Text>
                      ) : null}
                      {index < suspiciousTokenHoldings.length - 1 ? <View style={styles.separator} /> : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </>
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
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    marginBottom: 10,
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
  summaryStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  summaryTitle: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  summaryNotice: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryNoticeText: {
    fontSize: 11,
    lineHeight: 15,
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
  mainListEmptyState: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  mainListEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  suspiciousSection: {
    marginTop: 18,
    paddingTop: 4,
  },
  lowValueSection: {
    marginTop: 18,
    paddingTop: 4,
  },
  lowValueHeader: {
    backgroundColor: colors.elevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  lowValueHeaderTextBlock: {
    flex: 1,
  },
  lowValueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lowValueSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  lowValueToggle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  lowValueList: {
    marginTop: 10,
  },
  suspiciousHeader: {
    backgroundColor: colors.elevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suspiciousHeaderTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  suspiciousTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  suspiciousSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  suspiciousToggle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  suspiciousList: {
    marginTop: 12,
  },
  suspicionReasonText: {
    marginTop: 6,
    marginBottom: 2,
    marginHorizontal: 6,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
});
