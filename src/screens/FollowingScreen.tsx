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
import {
  getWalletPortfolioSummary,
  type WalletPortfolioSummary,
} from '../api/portfolioSummary';
import {getWallets} from '../api/wallets';
import {EmptyState} from '../components/EmptyState';
import {WalletCard} from '../components/WalletCard';
import {colors} from '../theme/colors';
import type {Wallet} from '../types/wallet';
import {formatUsd} from '../utils/format';
import {logPortfolioBalanceDecision} from '../utils/performance';

type FollowingScreenProps = {
  refreshKey?: number;
  onAddWallet: () => void;
  onSelectWallet: (wallet: Wallet) => void;
};

const WALLET_SUMMARY_FETCH_CONCURRENCY = 3;

export function FollowingScreen({
  refreshKey = 0,
  onAddWallet,
  onSelectWallet,
}: FollowingScreenProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletTotalsById, setWalletTotalsById] = useState<Record<string, number | null>>({});
  const [walletSecondaryLabelsById, setWalletSecondaryLabelsById] = useState<Record<string, string>>({});
  const [walletSummaryLoadingById, setWalletSummaryLoadingById] = useState<Record<string, boolean>>({});
  const [walletSummaryUnavailableCount, setWalletSummaryUnavailableCount] = useState(0);
  const [portfolioPerformance, setPortfolioPerformance] = useState<{
    currentValue: number | null;
    change: number | null;
    changePercent: number | null;
  } | null>(null);

  async function loadWalletSummaries(nextWallets: Wallet[]) {
    const nextSummaryLoadingById = Object.fromEntries(
      nextWallets.map(wallet => [wallet.id, true]),
    );
    const nextWalletSecondaryLabelsById = Object.fromEntries(
      nextWallets.map(wallet => [wallet.id, 'Loading balance']),
    );

    setSummariesLoading(true);
    setWalletSummaryLoadingById(nextSummaryLoadingById);
    setWalletSecondaryLabelsById(nextWalletSecondaryLabelsById);

    const walletSummaryTasks = nextWallets.map(
      wallet => async () => {
        const summary = await getWalletPortfolioSummary(wallet.id, {
          includePositions: false,
        });
        return [wallet.id, summary] as const;
      },
    );
    const walletSummaryResults: PromiseSettledResult<readonly [string, WalletPortfolioSummary]>[] = [];

    for (let index = 0; index < walletSummaryTasks.length; index += WALLET_SUMMARY_FETCH_CONCURRENCY) {
      const batchTasks = walletSummaryTasks.slice(index, index + WALLET_SUMMARY_FETCH_CONCURRENCY);
      const batchResults = await Promise.allSettled(batchTasks.map(task => task()));
      walletSummaryResults.push(...batchResults);
    }

    const walletSummariesById: Record<string, WalletPortfolioSummary> = {};

    walletSummaryResults.forEach(result => {
      if (result.status !== 'fulfilled') {
        return;
      }

      const [walletId, summary] = result.value;
      walletSummariesById[walletId] = summary;
    });

    const mergedTotals: Record<string, number | null> = {};
    const resolvedWalletSecondaryLabelsById: Record<string, string> = {};
    const resolvedWalletSummaryLoadingById: Record<string, boolean> = {};
    let aggregateLiveCurrentValue: number | null = nextWallets.length === 0 ? 0 : null;
    let aggregateLiveCurrentValueAccumulator = 0;
    let availableSummaryCount = 0;
    let unavailableSummaryCount = 0;

    nextWallets.forEach(wallet => {
      const liveSummary = walletSummariesById[wallet.id];
      const liveTotal =
        liveSummary?.totalPortfolioUsd ?? walletTotalsById[wallet.id] ?? null;

      mergedTotals[wallet.id] = liveTotal;
      resolvedWalletSummaryLoadingById[wallet.id] = false;
      resolvedWalletSecondaryLabelsById[wallet.id] =
        liveSummary?.reason === 'POSITIONS_NOT_FETCHED_LIST_MODE'
          ? 'Positions pending'
          : 'Perf. pending';

      if (typeof liveTotal === 'number' && Number.isFinite(liveTotal)) {
        aggregateLiveCurrentValueAccumulator += liveTotal;
        availableSummaryCount += 1;
      } else {
        unavailableSummaryCount += 1;
        if (!liveSummary) {
          resolvedWalletSecondaryLabelsById[wallet.id] = 'Balance unavailable';
        }
      }

      logPortfolioBalanceDecision({
        walletId: wallet.id,
        walletLabel: wallet.label,
        liveSummary,
        performance: null,
        displayedBalance: liveTotal,
        reason:
          liveSummary?.totalPortfolioUsd != null
            ? 'live_summary_total'
            : walletTotalsById[wallet.id] != null
              ? 'preserved_previous_live_summary_after_unavailable_refresh'
              : 'live_summary_unavailable',
      });
    });

    if (availableSummaryCount > 0) {
      aggregateLiveCurrentValue = aggregateLiveCurrentValueAccumulator;
    }

    setWalletTotalsById(mergedTotals);
    setWalletSecondaryLabelsById(resolvedWalletSecondaryLabelsById);
    setWalletSummaryLoadingById(resolvedWalletSummaryLoadingById);
    setWalletSummaryUnavailableCount(unavailableSummaryCount);
    setPortfolioPerformance({
      currentValue: aggregateLiveCurrentValue,
      change: null,
      changePercent: null,
    });
    setSummariesLoading(false);
  }

  async function loadWallets(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextWallets = await getWallets();
      setWallets(nextWallets);
      setError(null);
      setPortfolioPerformance(
        nextWallets.length === 0
          ? {
              currentValue: 0,
              change: null,
              changePercent: null,
            }
          : {
              currentValue: null,
              change: null,
              changePercent: null,
            },
      );
      setLoading(false);

      await loadWalletSummaries(nextWallets);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load wallets');
      setSummariesLoading(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadWallets();
  }, [refreshKey]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Wallets</Text>
          <Text style={styles.subtitle}>Following</Text>
        </View>

        <Pressable style={styles.iconButton} onPress={onAddWallet}>
          <Text style={styles.iconButtonText}>＋</Text>
        </Pressable>
      </View>

      {portfolioPerformance ? (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Portfolio total</Text>
          <Text style={styles.totalValue}>
            {formatUsd(
              portfolioPerformance.currentValue,
              summariesLoading ? 'Loading balances...' : 'Balance unavailable',
            )}
          </Text>
          {portfolioPerformance.change != null && portfolioPerformance.changePercent != null ? (
            <Text
              style={[
                styles.totalPerformance,
                portfolioPerformance.change >= 0 ? styles.totalPerformancePositive : styles.totalPerformanceNegative,
              ]}>
              {portfolioPerformance.change >= 0 ? '+' : ''}
              {formatUsd(portfolioPerformance.change, '')} · {portfolioPerformance.changePercent >= 0 ? '+' : ''}
              {portfolioPerformance.changePercent.toFixed(2)}%
            </Text>
          ) : (
            <Text style={styles.totalHint}>
              {summariesLoading
                ? 'Loading wallet balances...'
                : walletSummaryUnavailableCount > 0
                ? `Available total shown. ${walletSummaryUnavailableCount} wallet${walletSummaryUnavailableCount === 1 ? '' : 's'} still loading.`
                : 'Collecting performance data'}
            </Text>
          )}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.stateText}>Loading wallets...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Could not load wallets</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadWallets()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={wallets}
          keyExtractor={item => item.id}
          contentContainerStyle={wallets.length === 0 ? styles.emptyContent : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadWallets(true)} tintColor={colors.accent} />
          }
          renderItem={({item}) => (
            <WalletCard
              wallet={item}
              totalValueUsd={walletTotalsById[item.id] ?? null}
              changePercent={null}
              secondaryLabel={walletSecondaryLabelsById[item.id]}
              isBalanceLoading={walletSummaryLoadingById[item.id] ?? false}
              onPress={() => onSelectWallet(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <EmptyState
                eyebrow="First wallet"
                title="Start tracking wallets"
                description="Follow any wallet address to see its balances, protocol positions, and recent activity in one place."
                actionLabel="Add wallet"
                onAction={onAddWallet}
              />
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  headerRow: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textTertiary,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryCtaFill,
  },
  iconButtonText: {
    color: colors.primaryCtaText,
    fontSize: 18,
    fontWeight: '700',
  },
  totalCard: {
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  totalValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  totalHint: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalPerformance: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  totalPerformancePositive: {
    color: colors.positive,
  },
  totalPerformanceNegative: {
    color: colors.negative,
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  emptyStateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
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
});
