import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {getWalletPerformance, type PortfolioPerformance} from '../api/performance';
import {getWalletHoldings, type TokenHolding, type WalletHoldings} from '../api/holdings';
import {getWalletPositions, type WalletPosition, type WalletPositions} from '../api/positions';
import {TokensScreen} from './TokensScreen';
import {EventsScreen} from './EventsScreen';
import {PositionsScreen} from './PositionsScreen';
import type {Wallet} from '../types/wallet';
import {getWalletPortfolioSummary, type WalletPortfolioSummary} from '../api/portfolioSummary';
import {colors} from '../theme/colors';
import {formatUsd, shortenAddress} from '../utils/format';
import {formatChainDisplayName, formatWalletChainsLabel, getWalletEnabledChains} from '../utils/chains';
import {
  getPerformanceUnavailableReason,
  getValidatedPerformance,
  logPortfolioBalanceDecision,
} from '../utils/performance';

export type DetailTab = 'tokens' | 'history' | 'positions';
type NetworkFilterOption = {
  value: string | null;
  label: string;
};

function sumFilteredHoldingsUsd(holdings: TokenHolding[], selectedChainId: string | null) {
  const filteredHoldings = selectedChainId
    ? holdings.filter((holding) => holding.chainId === selectedChainId)
    : holdings;

  if (filteredHoldings.length === 0) {
    return 0;
  }

  const pricedHoldings = filteredHoldings.filter(
    (holding) =>
      typeof holding.balanceUsd === 'number' &&
      Number.isFinite(holding.balanceUsd) &&
      !holding.isSuspicious,
  );

  if (pricedHoldings.length === 0) {
    return null;
  }

  return pricedHoldings.reduce((sum, holding) => sum + (holding.balanceUsd ?? 0), 0);
}

function sumFilteredPositionsUsd(positions: WalletPosition[], selectedChainId: string | null) {
  const filteredPositions = selectedChainId
    ? positions.filter((position) => position.chainId === selectedChainId)
    : positions;

  if (filteredPositions.length === 0) {
    return 0;
  }

  const pricedPositions = filteredPositions.filter(
    (position) => typeof position.valueUsd === 'number' && Number.isFinite(position.valueUsd),
  );

  if (pricedPositions.length === 0) {
    return null;
  }

  return pricedPositions.reduce((sum, position) => sum + (position.valueUsd ?? 0), 0);
}

function combineVisiblePortfolioTotals(
  holdingsUsd: number | null,
  positionsUsd: number | null,
) {
  if (holdingsUsd != null && positionsUsd != null) {
    return holdingsUsd + positionsUsd;
  }

  if (holdingsUsd != null) {
    return holdingsUsd;
  }

  if (positionsUsd != null) {
    return positionsUsd;
  }

  return null;
}

type WalletDetailScreenProps = {
  wallet: Wallet;
  initialTab?: DetailTab;
  onBack: () => void;
  onEdit: () => void;
};

export function WalletDetailScreen({wallet, initialTab, onBack, onEdit}: WalletDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab ?? 'history');
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);
  const [portfolioSummary, setPortfolioSummary] =
    useState<WalletPortfolioSummary | null>(null);
  const [walletPerformance, setWalletPerformance] = useState<PortfolioPerformance | null>(null);
  const [walletHoldings, setWalletHoldings] = useState<WalletHoldings | null>(null);
  const [walletPositions, setWalletPositions] = useState<WalletPositions | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [holdingsPrefetchRequested, setHoldingsPrefetchRequested] = useState(false);
  const [positionsPrefetchRequested, setPositionsPrefetchRequested] = useState(false);
  const latestRequestIdRef = useRef(0);
  const latestHoldingsRequestIdRef = useRef(0);
  const latestPositionsRequestIdRef = useRef(0);

  useEffect(() => {
    const nextTab = initialTab ?? 'history';

    if (initialTab === 'history') {
      console.log('[notifications] WalletDetailScreen auto-opening History tab', {
        walletId: wallet.id,
      });
    }

    setActiveTab(nextTab);
  }, [initialTab, wallet.id]);

  useEffect(() => {
    setSelectedNetwork(null);
    setNetworkMenuOpen(false);
  }, [wallet.id]);

  useEffect(() => {
    let cancelled = false;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setPortfolioSummary(null);
    setWalletPerformance(null);
    setWalletHoldings(null);
    setWalletPositions(null);
    setHoldingsLoading(false);
    setPositionsLoading(false);
    setHoldingsPrefetchRequested(false);
    setPositionsPrefetchRequested(false);

    async function loadPortfolioSummary() {
      setPortfolioLoading(true);

      try {
        const [summaryResult, performanceResult] = await Promise.allSettled([
          getWalletPortfolioSummary(wallet.id),
          getWalletPerformance(wallet.id),
        ]);

        if (cancelled || latestRequestIdRef.current !== requestId) {
          return;
        }

        if (summaryResult.status === 'fulfilled') {
          const nextSummary = summaryResult.value;
          setPortfolioSummary(nextSummary);
        } else {
          console.log('[portfolio] failed to load wallet portfolio summary', {
            walletId: wallet.id,
            error: summaryResult.reason,
          });
        }

        if (performanceResult.status === 'fulfilled') {
          setWalletPerformance(performanceResult.value);
        } else {
          console.log('[portfolio] failed to load wallet performance', {
            walletId: wallet.id,
            error: performanceResult.reason,
          });
        }
      } catch (error) {
        console.log('[portfolio] unexpected wallet portfolio load error', {
          walletId: wallet.id,
          error,
        });
      } finally {
        if (!cancelled && latestRequestIdRef.current === requestId) {
          setPortfolioLoading(false);
        }
      }
    }

    void loadPortfolioSummary();

    return () => {
      cancelled = true;
    };
  }, [wallet.id]);

  useEffect(() => {
    if (!portfolioSummary || walletHoldings || holdingsLoading || holdingsPrefetchRequested) {
      return;
    }

    setHoldingsPrefetchRequested(true);
  }, [holdingsLoading, holdingsPrefetchRequested, portfolioSummary, walletHoldings]);

  useEffect(() => {
    if (!portfolioSummary || walletPositions || positionsLoading || positionsPrefetchRequested) {
      return;
    }

    const timer = setTimeout(() => {
      setPositionsPrefetchRequested(true);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [portfolioSummary, positionsLoading, positionsPrefetchRequested, walletPositions]);

  const shouldLoadRawHoldings =
    activeTab === 'tokens' || selectedNetwork != null || holdingsPrefetchRequested;
  const shouldLoadRawPositions =
    activeTab === 'positions' || selectedNetwork != null || positionsPrefetchRequested;

  useEffect(() => {
    if (!shouldLoadRawHoldings || walletHoldings || holdingsLoading) {
      return;
    }

    let cancelled = false;
    const requestId = latestHoldingsRequestIdRef.current + 1;
    latestHoldingsRequestIdRef.current = requestId;

    async function loadWalletHoldings() {
      setHoldingsLoading(true);

      try {
        const nextHoldings = await getWalletHoldings(wallet.id);

        if (cancelled) {
          return;
        }

        setWalletHoldings((currentHoldings) => currentHoldings ?? nextHoldings);

        if (latestHoldingsRequestIdRef.current !== requestId) {
          return;
        }
      } catch (error) {
        if (cancelled || latestHoldingsRequestIdRef.current !== requestId) {
          return;
        }

        console.log('[portfolio] failed to load wallet holdings for local network filtering', {
          walletId: wallet.id,
          error,
        });
      } finally {
        if (!cancelled && latestHoldingsRequestIdRef.current === requestId) {
          setHoldingsLoading(false);
        }
      }
    }

    void loadWalletHoldings();

    return () => {
      cancelled = true;
    };
  }, [shouldLoadRawHoldings, wallet.id, walletHoldings]);

  useEffect(() => {
    if (!shouldLoadRawPositions || walletPositions || positionsLoading) {
      return;
    }

    let cancelled = false;
    const requestId = latestPositionsRequestIdRef.current + 1;
    latestPositionsRequestIdRef.current = requestId;

    async function loadWalletPositions() {
      setPositionsLoading(true);

      try {
        const nextPositions = await getWalletPositions(wallet.id);

        if (cancelled) {
          return;
        }

        setWalletPositions((currentPositions) => currentPositions ?? nextPositions);

        if (latestPositionsRequestIdRef.current !== requestId) {
          return;
        }
      } catch (error) {
        if (cancelled || latestPositionsRequestIdRef.current !== requestId) {
          return;
        }

        console.log('[portfolio] failed to load wallet positions for local network filtering', {
          walletId: wallet.id,
          error,
        });
      } finally {
        if (!cancelled && latestPositionsRequestIdRef.current === requestId) {
          setPositionsLoading(false);
        }
      }
    }

    void loadWalletPositions();

    return () => {
      cancelled = true;
    };
  }, [shouldLoadRawPositions, wallet.id, walletPositions]);

  const isFilteredNetworkSelected = selectedNetwork != null;
  const filteredHoldingsValue = walletHoldings
    ? sumFilteredHoldingsUsd(walletHoldings.holdings ?? [], selectedNetwork)
    : null;
  const filteredPositionsValue = walletPositions
    ? sumFilteredPositionsUsd(walletPositions.positions ?? [], selectedNetwork)
    : null;
  const holdingsValue = selectedNetwork == null
    ? (portfolioSummary?.holdingsTotalUsd ?? 0)
    : walletHoldings
      ? filteredHoldingsValue
      : null;
  const positionsValue = selectedNetwork == null
    ? (portfolioSummary?.positionsTotalUsd ?? 0)
    : walletPositions
      ? filteredPositionsValue
      : null;
  const filteredTotalsLoading =
    isFilteredNetworkSelected &&
    ((walletHoldings == null && (holdingsLoading || shouldLoadRawHoldings)) ||
      (walletPositions == null && (positionsLoading || shouldLoadRawPositions)));
  const liveTotalValue = selectedNetwork == null
    ? (portfolioSummary?.totalPortfolioUsd ?? null)
    : filteredTotalsLoading
      ? null
      : combineVisiblePortfolioTotals(filteredHoldingsValue, filteredPositionsValue);
  const numericHoldingsValue = holdingsValue ?? 0;
  const numericPositionsValue = positionsValue ?? 0;
  const allocationTotal = numericHoldingsValue + numericPositionsValue;
  const holdingsFlex = allocationTotal > 0 ? numericHoldingsValue / allocationTotal : 0.5;
  const positionsFlex = allocationTotal > 0 ? numericPositionsValue / allocationTotal : 0.5;
  const validatedPerformance = getValidatedPerformance(
    liveTotalValue,
    walletPerformance,
  );
  const performanceUnavailableText = getPerformanceUnavailableReason(walletPerformance);
  const hasPerformanceHistory =
    validatedPerformance?.change != null &&
    validatedPerformance.changePercent != null;
  const chainLabel = formatWalletChainsLabel(wallet.chainId, wallet.enabledChains);
  const networkOptions = getWalletEnabledChains(wallet.chainId, wallet.enabledChains).map((chainId) => ({
    value: chainId,
    label: formatChainDisplayName(chainId),
  }));
  const allNetworkOptions: NetworkFilterOption[] = [
    {value: null, label: 'All Networks'},
    ...networkOptions,
  ];
  const selectedNetworkLabel = allNetworkOptions.find((option) => option.value === selectedNetwork)?.label ?? 'All Networks';
  const holdingsStatusText =
    holdingsValue == null
      ? isFilteredNetworkSelected && walletHoldings == null && (holdingsLoading || shouldLoadRawHoldings)
        ? 'Loading'
        : 'Unavailable'
      : null;
  const positionsStatusText =
    positionsValue == null
      ? isFilteredNetworkSelected && walletPositions == null && (positionsLoading || shouldLoadRawPositions)
        ? 'Loading'
        : 'Unavailable'
      : null;

  useEffect(() => {
    logPortfolioBalanceDecision({
      walletId: wallet.id,
      walletLabel: wallet.label,
      liveSummary: portfolioSummary,
      performance: walletPerformance,
      displayedBalance: liveTotalValue,
      reason:
        liveTotalValue != null
          ? 'live_summary_total'
          : portfolioLoading
            ? 'live_summary_loading'
            : 'live_summary_unavailable',
    });
  }, [
    liveTotalValue,
    portfolioLoading,
    portfolioSummary,
    wallet.id,
    wallet.label,
    walletPerformance,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>‹</Text>
        </Pressable>

        <Pressable style={styles.headerButtonAccent} onPress={onEdit}>
          <Text style={styles.headerButtonAccentText}>✎</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.identityRow}>
          <View style={styles.identityTextBlock}>
            <Text style={styles.title}>{wallet.label || 'Unnamed wallet'}</Text>
            <Text style={styles.addressLine}>
              {shortenAddress(wallet.address)} • {chainLabel}
            </Text>
          </View>
        </View>

        <View style={styles.portfolioInlineBlock}>
          {portfolioLoading ? (
            <View style={styles.portfolioLoadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.portfolioLoadingText}>Loading portfolio totals...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.summaryTotalValue}>
                {formatUsd(
                  liveTotalValue,
                  filteredTotalsLoading ? 'Loading...' : 'Balance unavailable',
                )}
              </Text>
              {selectedNetwork == null && hasPerformanceHistory ? (
                <Text
                  style={[
                    styles.performanceText,
                    validatedPerformance.change >= 0
                      ? styles.performancePositive
                      : styles.performanceNegative,
                  ]}>
                  {validatedPerformance.change >= 0 ? '+' : ''}
                  {formatUsd(validatedPerformance.change, '')} ·{' '}
                  {validatedPerformance.changePercent >= 0 ? '+' : ''}
                  {validatedPerformance.changePercent.toFixed(2)}%
                </Text>
              ) : filteredTotalsLoading ? (
                <Text style={styles.performanceCollecting}>Loading {selectedNetworkLabel} totals...</Text>
              ) : selectedNetwork != null ? (
                <Text style={styles.performanceCollecting}>24h performance is available for All Networks only</Text>
              ) : (
                <Text style={styles.performanceCollecting}>{performanceUnavailableText}</Text>
              )}
              <View style={styles.allocationBar}>
                <View style={[styles.allocationFillHoldings, {flex: holdingsFlex}]} />
                <View style={[styles.allocationFillPositions, {flex: positionsFlex}]} />
              </View>
              <View style={styles.allocationLegendRow}>
                <View style={styles.allocationLegendItem}>
                  <View style={styles.allocationDotHoldings} />
                  <View>
                    <Text style={styles.allocationLabel}>Holdings</Text>
                    <Text style={styles.allocationValue}>
                      {formatUsd(
                        holdingsValue,
                        holdingsStatusText === 'Loading' ? 'Loading...' : 'Unavailable',
                      )}
                    </Text>
                    {holdingsStatusText ? (
                      <Text style={styles.allocationHint}>{holdingsStatusText}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.allocationLegendItem}>
                  <View style={styles.allocationDotPositions} />
                  <View>
                    <Text style={styles.allocationLabel}>Positions</Text>
                    <Text style={styles.allocationValue}>
                      {formatUsd(
                        positionsValue,
                        positionsStatusText === 'Loading' ? 'Loading...' : 'Unavailable',
                      )}
                    </Text>
                    {positionsStatusText ? (
                      <Text style={styles.allocationHint}>{positionsStatusText}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.networkFilterWrap}>
        <View style={styles.networkDropdownContainer}>
          <Pressable
            style={styles.networkDropdownButton}
            onPress={() => setNetworkMenuOpen((current) => !current)}>
            <Text style={styles.networkDropdownButtonText}>{selectedNetworkLabel}</Text>
            <Text style={styles.networkDropdownChevron}>{networkMenuOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {networkMenuOpen ? (
            <View style={styles.networkDropdownMenu}>
              {allNetworkOptions.map((option) => {
                const selected = option.value === selectedNetwork;

                return (
                  <Pressable
                    key={option.value ?? 'all-networks'}
                    style={[styles.networkDropdownItem, selected ? styles.networkDropdownItemActive : null]}
                    onPress={() => {
                      setSelectedNetwork(option.value);
                      setNetworkMenuOpen(false);
                    }}>
                    <Text style={[styles.networkDropdownItemText, selected ? styles.networkDropdownItemTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'tokens' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tokens')}>
          <Text style={[styles.tabText, activeTab === 'tokens' && styles.tabTextActive]}>Tokens</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'positions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('positions')}>
          <Text style={[styles.tabText, activeTab === 'positions' && styles.tabTextActive]}>Positions</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeTab === 'tokens' ? (
          <TokensScreen
            walletId={wallet.id}
            selectedChainId={selectedNetwork}
            prefetchedHoldings={walletHoldings}
            prefetchedHoldingsLoading={holdingsLoading || (shouldLoadRawHoldings && walletHoldings == null)}
          />
        ) : null}
        {activeTab === 'history' ? <EventsScreen walletId={wallet.id} selectedChainId={selectedNetwork} /> : null}
        {activeTab === 'positions' ? (
          <PositionsScreen
            walletId={wallet.id}
            selectedChainId={selectedNetwork}
            prefetchedPositions={walletPositions}
            prefetchedPositionsLoading={positionsLoading || (shouldLoadRawPositions && walletPositions == null)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: 38,
    height: 38,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 20,
  },
  headerButtonAccent: {
    width: 38,
    height: 38,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonAccentText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 22,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroGlow: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.elevated,
    opacity: 0.65,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addressLine: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  portfolioInlineBlock: {
    marginTop: 8,
  },
  portfolioLoadingRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryTotalValue: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  allocationBar: {
    marginTop: 6,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  allocationFillHoldings: {
    backgroundColor: colors.primaryCtaFill,
  },
  allocationFillPositions: {
    backgroundColor: colors.accent,
  },
  allocationLegendRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 16,
  },
  performanceText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  performancePositive: {
    color: colors.positive,
  },
  performanceNegative: {
    color: colors.negative,
  },
  performanceCollecting: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  allocationLegendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  allocationDotHoldings: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryCtaFill,
  },
  allocationDotPositions: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  allocationLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  allocationValue: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  allocationHint: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textSecondary,
  },
  networkFilterWrap: {
    marginBottom: 6,
    zIndex: 20,
  },
  networkDropdownContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  networkDropdownButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    minWidth: 138,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  networkDropdownButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  networkDropdownChevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  networkDropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    minWidth: 152,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  networkDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  networkDropdownItemActive: {
    backgroundColor: colors.elevated,
  },
  networkDropdownItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  networkDropdownItemTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    borderRadius: 18,
    padding: 3,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
});
