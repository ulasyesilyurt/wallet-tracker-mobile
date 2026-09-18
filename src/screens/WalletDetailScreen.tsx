import React, {useEffect, useRef, useState} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {Platform, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WalletDetailSummary} from '../components/WalletDetailSummary';
import {WalletIconButton, WalletMonitoringCard} from '../components/WalletDetailUI';
import {WalletAlertSettingsScreen} from './WalletAlertSettingsScreen';
import {SafeAreaScreen} from '../components/SafeAreaScreen';
import {getWalletPerformance, type PortfolioPerformance} from '../api/performance';
import {getWalletHoldings, type TokenHolding, type WalletHoldings} from '../api/holdings';
import {getWalletPositions, type WalletPosition, type WalletPositions} from '../api/positions';
import {TokensScreen} from './TokensScreen';
import {EventsScreen} from './EventsScreen';
import {PositionsScreen} from './PositionsScreen';
import type {Wallet} from '../types/wallet';
import {getWalletPortfolioSummary, type WalletPortfolioSummary} from '../api/portfolioSummary';
import {walletDetailColors as colors, getWalletDetailLayout} from '../theme/walletDetail';
import {formatChainDisplayName, getWalletEnabledChains} from '../utils/chains';
import {
  getPerformanceUnavailableReason,
  getValidatedPerformance,
  logPortfolioBalanceDecision,
} from '../utils/performance';

export type DetailTab = 'tokens' | 'history' | 'positions' | 'alerts';
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
  targetEventId?: string | null;
  targetOpenKey?: number;
  onTargetConsumed?: (openKey: number) => void;
  onBack: () => void;
  onEdit: () => void;
};

export function WalletDetailScreen({
  wallet,
  initialTab,
  targetEventId,
  targetOpenKey,
  onTargetConsumed,
  onBack,
  onEdit,
}: WalletDetailScreenProps) {
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
  const [addressCopied, setAddressCopied] = useState(false);
  const latestRequestIdRef = useRef(0);
  const latestHoldingsRequestIdRef = useRef(0);
  const latestPositionsRequestIdRef = useRef(0);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCopyWalletAddress() {
    Clipboard.setString(wallet.address);
    setAddressCopied(true);

    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current);
    }

    copyResetTimeoutRef.current = setTimeout(() => {
      setAddressCopied(false);
      copyResetTimeoutRef.current = null;
    }, 1500);
  }

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextTab = initialTab ?? 'history';
    setActiveTab(nextTab);
  }, [initialTab, wallet.id]);

  useEffect(() => {
    if (targetOpenKey == null) {
      return;
    }

    setActiveTab('history');
    setSelectedNetwork(null);
    setNetworkMenuOpen(false);

    if (!targetEventId) {
      onTargetConsumed?.(targetOpenKey);
    }
  }, [onTargetConsumed, targetEventId, targetOpenKey]);

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

  const {width, fontScale} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getWalletDetailLayout(width);
  // App's root consumes iOS bottom insets; Android lists consume their own.
  const bottomPadding = (Platform.OS === 'android' ? insets.bottom : 0) + 16;
  const networkFilter = (
    <View style={styles.networkDropdownContainer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Filter by network"
        accessibilityState={{expanded: networkMenuOpen}}
        style={styles.networkDropdownButton}
        onPress={() => setNetworkMenuOpen(current => !current)}>
        <Text style={[styles.networkDropdownButtonText, layout.narrow && styles.networkTypeNarrow]}>{selectedNetworkLabel}</Text>
        <Text style={styles.networkDropdownChevron}>{networkMenuOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {networkMenuOpen ? (
        <View style={styles.networkDropdownMenu}>
          {allNetworkOptions.map(option => {
            const selected = option.value === selectedNetwork;
            return (
              <Pressable key={option.value ?? 'all-networks'} accessibilityRole="button"
                accessibilityState={{selected}}
                style={[styles.networkDropdownItem, selected && styles.networkDropdownItemActive]}
                onPress={() => {
                  setSelectedNetwork(option.value);
                  setNetworkMenuOpen(false);
                }}>
                <Text style={[styles.networkDropdownItemText, selected && styles.networkDropdownItemTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaScreen style={[styles.screen, {paddingHorizontal: layout.gutter}]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={[styles.headerRow, {height: layout.headerHeight, gap: layout.headerGap}]}>
        <WalletIconButton name="chevron-back" label="Back" narrow={layout.narrow} onPress={onBack} />
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.headerTitle}>{wallet.label || 'Unnamed wallet'}</Text>
        <WalletIconButton name="ellipsis-horizontal" label="Edit wallet" narrow={layout.narrow} onPress={onEdit} />
      </View>
      <View style={{paddingTop: layout.listTop}}>
        <WalletDetailSummary wallet={wallet} narrow={layout.narrow} loading={portfolioLoading}
          balance={liveTotalValue} balanceFallback={filteredTotalsLoading ? 'Loading…' : 'Balance unavailable'}
          delta={selectedNetwork == null && hasPerformanceHistory ? validatedPerformance.change : null}
          performanceReason={selectedNetwork != null ? '24h performance is available for All Networks only' : performanceUnavailableText}
          holdings={holdingsValue} positions={positionsValue}
          holdingsStatus={holdingsStatusText} positionsStatus={positionsStatusText}
          holdingsFlex={holdingsFlex} positionsFlex={positionsFlex}
          copied={addressCopied} onCopy={handleCopyWalletAddress} />
      </View>
      <WalletMonitoringCard narrow={layout.narrow} fontScale={fontScale} onPress={() => setActiveTab('alerts')} />
      <View accessibilityRole="tablist" style={[styles.tabsRow, layout.narrow && styles.tabsRowNarrow]}>
        <View pointerEvents="none" style={[styles.tabsBackground, layout.narrow && styles.tabsBackgroundNarrow]} />
        {(['tokens', 'positions', 'history', 'alerts'] as const).map(tab => (
          <Pressable key={tab} accessibilityRole="tab" accessibilityState={{selected: activeTab === tab}}
            onPress={() => setActiveTab(tab)} style={styles.tabTarget}>
            {({pressed}) => (
              <View collapsable={false} style={[styles.tabButton, layout.narrow && styles.tabButtonNarrow,
                activeTab === tab && styles.tabButtonActive,
                pressed && activeTab !== tab && styles.tabButtonPressed]}>
                <Text maxFontSizeMultiplier={1.2} style={[styles.tabText, layout.narrow && styles.tabTextNarrow,
                  activeTab === tab && styles.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
      <View style={styles.content}>
        {activeTab === 'tokens' ? (
          <TokensScreen walletId={wallet.id} selectedChainId={selectedNetwork}
            prefetchedHoldings={walletHoldings}
            prefetchedHoldingsLoading={holdingsLoading || (shouldLoadRawHoldings && walletHoldings == null)}
            networkFilter={networkFilter} narrow={layout.narrow} bottomPadding={bottomPadding} fontScale={fontScale} />
        ) : null}
        {activeTab === 'history' ? (
          <EventsScreen key={wallet.id} walletId={wallet.id} selectedChainId={selectedNetwork}
            targetEventId={targetEventId} targetOpenKey={targetOpenKey} onTargetConsumed={onTargetConsumed}
            networkFilter={networkFilter} narrow={layout.narrow} bottomPadding={bottomPadding} />
        ) : null}
        {activeTab === 'positions' ? (
          <PositionsScreen walletId={wallet.id} selectedChainId={selectedNetwork}
            prefetchedPositions={walletPositions}
            prefetchedPositionsLoading={positionsLoading || (shouldLoadRawPositions && walletPositions == null)}
            networkFilter={networkFilter} narrow={layout.narrow} bottomPadding={bottomPadding} />
        ) : null}
        {activeTab === 'alerts' ? (
          <WalletAlertSettingsScreen wallet={wallet} onBack={onEdit} embedded bottomPadding={bottomPadding} />
        ) : null}
      </View>
      {addressCopied ? (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.copyToast, {bottom: bottomPadding}]}>
          <Text style={styles.copyToastText}>Wallet address copied</Text>
        </View>
      ) : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  headerRow: {flexDirection: 'row', alignItems: 'center'},
  headerTitle: {flex: 1, fontSize: 16, fontWeight: '700', letterSpacing: -0.16, color: colors.textPrimary},
  networkDropdownContainer: {position: 'relative', zIndex: 20},
  networkDropdownButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7},
  networkDropdownButtonText: {fontSize: 12.5, fontWeight: '500', color: colors.textSecondary},
  networkTypeNarrow: {fontSize: 12},
  networkDropdownChevron: {fontSize: 12, color: colors.textTertiary},
  networkDropdownMenu: {position: 'absolute', top: 44, right: 0, minWidth: 168, padding: 4,
    borderRadius: 14, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.iconBorder, zIndex: 30},
  networkDropdownItem: {minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 11},
  networkDropdownItemActive: {backgroundColor: colors.selected},
  networkDropdownItemText: {fontSize: 12.5, color: colors.textSecondary},
  networkDropdownItemTextActive: {color: colors.textPrimary, fontWeight: '700'},
  tabsRow: {marginTop: 13, height: 44, paddingHorizontal: 5, gap: 2, flexDirection: 'row', alignItems: 'center'},
  tabsRowNarrow: {marginTop: 10},
  tabsBackground: {position: 'absolute', top: 1, left: 0, right: 0, height: 42, borderRadius: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.tabBorder},
  tabsBackgroundNarrow: {top: 2, height: 40, borderRadius: 13},
  tabTarget: {flex: 1, minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  tabButton: {width: '100%', height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
  tabButtonNarrow: {height: 32, borderRadius: 10},
  tabButtonActive: {backgroundColor: colors.selected},
  tabButtonPressed: {opacity: 0.7},
  tabText: {fontSize: 13, fontWeight: '700', color: colors.tabInactive},
  tabTextNarrow: {fontSize: 12.5},
  tabTextActive: {color: colors.textPrimary},
  content: {flex: 1},
  copyToast: {position: 'absolute', alignSelf: 'center', backgroundColor: colors.selected,
    borderRadius: 11, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border},
  copyToastText: {fontSize: 12.5, fontWeight: '500', color: colors.textPrimary},
});
