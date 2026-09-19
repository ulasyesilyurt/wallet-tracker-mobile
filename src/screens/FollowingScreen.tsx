import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaScreen } from '../components/SafeAreaScreen';
import {
  getWalletPortfolioSummary,
  type WalletPortfolioSummary,
} from '../api/portfolioSummary';
import { getWallets } from '../api/wallets';
import { WalletCard } from '../components/WalletCard';
import { WalletsPortfolioCard } from '../components/WalletsPortfolioCard';
import { WalletsLoadingRows } from '../components/WalletsLoadingRows';
import { walletsColors as colors, getWalletsLayout } from '../theme/wallets';
import type { Wallet } from '../types/wallet';
import { logPortfolioBalanceDecision } from '../utils/performance';

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
  const { width } = useWindowDimensions();
  const layout = getWalletsLayout(width);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletTotalsById, setWalletTotalsById] = useState<
    Record<string, number | null>
  >({});
  const [, setWalletSecondaryLabelsById] = useState<Record<string, string>>({});
  const [walletSummaryLoadingById, setWalletSummaryLoadingById] = useState<
    Record<string, boolean>
  >({});
  const [, setWalletSummaryUnavailableCount] = useState(0);
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

    const walletSummaryTasks = nextWallets.map(wallet => async () => {
      const summary = await getWalletPortfolioSummary(wallet.id, {
        includePositions: false,
      });
      return [wallet.id, summary] as const;
    });
    const walletSummaryResults: PromiseSettledResult<
      readonly [string, WalletPortfolioSummary]
    >[] = [];

    for (
      let index = 0;
      index < walletSummaryTasks.length;
      index += WALLET_SUMMARY_FETCH_CONCURRENCY
    ) {
      const batchTasks = walletSummaryTasks.slice(
        index,
        index + WALLET_SUMMARY_FETCH_CONCURRENCY,
      );
      const batchResults = await Promise.allSettled(
        batchTasks.map(task => task()),
      );
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
    let aggregateLiveCurrentValue: number | null =
      nextWallets.length === 0 ? 0 : null;
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
      if (!isRefresh || nextWallets.length === 0) {
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
      }
      setLoading(false);

      await loadWalletSummaries(nextWallets);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load wallets',
      );
      setSummariesLoading(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadWallets();
  }, [refreshKey]);

  const systemState =
    loading || refreshing || summariesLoading
      ? { text: 'Syncing…', style: styles.syncingDot }
      : error
      ? { text: 'Offline', style: styles.offlineDot }
      : { text: `Live · ${wallets.length} watched`, style: styles.liveDot };
  const hasCachedWallets = error != null && wallets.length > 0;

  return (
    <SafeAreaScreen
      style={[styles.screen, { paddingHorizontal: layout.gutter }]}
    >
      <View style={[styles.header, { paddingBottom: layout.headerBottom }]}>
        <View style={styles.titleBlock}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.title, { fontSize: layout.titleSize }]}
          >
            Wallets
          </Text>
          <View style={styles.systemState}>
            <View style={[styles.systemDot, systemState.style]} />
            <Text style={[styles.systemText, { fontSize: layout.stateSize }]}>
              {systemState.text}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add wallet"
          onPress={onAddWallet}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text maxFontSizeMultiplier={1.2} style={styles.addGlyph}>
            +
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContent}>
          <WalletsPortfolioCard width={width} value={null} loading />
          <WalletsLoadingRows width={width} />
        </View>
      ) : error && wallets.length === 0 ? (
        <WalletsState
          title="Could not load wallets"
          body={error}
          action="Try again"
          onAction={() => void loadWallets()}
          secondary
        />
      ) : (
        <FlatList
          data={wallets}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            wallets.length === 0 && styles.emptyContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadWallets(true)}
              tintColor={colors.textTertiary}
            />
          }
          ListHeaderComponent={
            wallets.length > 0 ? (
              <View>
                <WalletsPortfolioCard
                  width={width}
                  value={portfolioPerformance?.currentValue ?? null}
                  loading={summariesLoading}
                />
                {hasCachedWallets ? (
                  <View style={styles.cacheNotice}>
                    <Text style={styles.cacheNoticeText}>
                      Showing last known balances
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={12}
                      onPress={() => void loadWallets()}
                    >
                      <Text style={styles.cacheRetry}>Retry</Text>
                    </Pressable>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.sectionHeader,
                    layout.narrow && styles.sectionHeaderNarrow,
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionTitle,
                      layout.narrow && styles.sectionTitleNarrow,
                    ]}
                  >
                    Watching
                  </Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <WalletCard
              wallet={item}
              width={width}
              totalValueUsd={walletTotalsById[item.id] ?? null}
              changePercent={null}
              isBalanceLoading={walletSummaryLoadingById[item.id] ?? false}
              onPress={() => onSelectWallet(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <WalletsState
              title="No wallets yet"
              body="Add a wallet to follow its balances, positions, and activity."
              action="Add wallet"
              onAction={onAddWallet}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaScreen>
  );
}

function WalletsState({
  title,
  body,
  action,
  onAction,
  secondary = false,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  secondary?: boolean;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={({ pressed }) => [
          styles.stateButton,
          secondary && styles.stateButtonSecondary,
          pressed && styles.stateButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.stateButtonText,
            secondary && styles.stateButtonSecondaryText,
          ]}
        >
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  title: {
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.75,
    color: colors.textPrimary,
  },
  systemState: {
    marginTop: 7,
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  systemDot: { width: 6, height: 6, borderRadius: 3 },
  liveDot: { backgroundColor: colors.positive },
  syncingDot: { backgroundColor: colors.warning },
  offlineDot: { backgroundColor: colors.textTertiary },
  systemText: { fontWeight: '500', color: colors.textSecondary },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.iconBorder,
  },
  addButtonPressed: { backgroundColor: colors.selected },
  addGlyph: {
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  loadingContent: { flex: 1 },
  listContent: { paddingBottom: 8 },
  emptyContent: { flexGrow: 1 },
  sectionHeader: { marginTop: 10, paddingBottom: 8, paddingHorizontal: 2 },
  sectionHeaderNarrow: { marginTop: 9 },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitleNarrow: { fontSize: 13 },
  separator: { height: 8 },
  cacheNotice: {
    minHeight: 44,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cacheNoticeText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  cacheRetry: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  state: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  stateTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.42,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateBody: {
    maxWidth: 310,
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 20,
    height: 50,
    minWidth: 126,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryCtaFill,
  },
  stateButtonSecondary: {
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stateButtonPressed: { opacity: 0.75 },
  stateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryCtaText,
  },
  stateButtonSecondaryText: { fontSize: 14.5, color: colors.textPrimary },
});
