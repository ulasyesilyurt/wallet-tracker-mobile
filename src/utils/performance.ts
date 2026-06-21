import type {PortfolioPerformance} from '../api/performance';
import type {WalletPortfolioSummary} from '../api/portfolioSummary';

const MIN_SIGNIFICANT_CURRENT_VALUE_MISMATCH_USD = 1;
const SIGNIFICANT_CURRENT_VALUE_MISMATCH_PERCENT = 0.02;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasSignificantCurrentValueMismatch(
  liveCurrentValue: number,
  performanceCurrentValue: number,
) {
  const difference = Math.abs(liveCurrentValue - performanceCurrentValue);
  return (
    difference >
    Math.max(
      MIN_SIGNIFICANT_CURRENT_VALUE_MISMATCH_USD,
      liveCurrentValue * SIGNIFICANT_CURRENT_VALUE_MISMATCH_PERCENT,
    )
  );
}

export function getValidatedPerformance(
  liveCurrentValue: number | null | undefined,
  performance: PortfolioPerformance | null | undefined,
) {
  if (!isFiniteNumber(liveCurrentValue) || !performance) {
    return null;
  }

  if (!performance.isAvailable || performance.isPartial) {
    return null;
  }

  if (!isFiniteNumber(performance.currentValue)) {
    return null;
  }

  if (liveCurrentValue > 0 && performance.currentValue === 0) {
    return null;
  }

  if (
    performance.value24hAgo != null &&
    hasSignificantCurrentValueMismatch(
      liveCurrentValue,
      performance.currentValue,
    )
  ) {
    return null;
  }

  if (
    liveCurrentValue > 0 &&
    performance.currentValue === 0 &&
    performance.changePercent === -100
  ) {
    return null;
  }

  if (!isFiniteNumber(performance.change) || !isFiniteNumber(performance.changePercent)) {
    return null;
  }

  return {
    currentValue: performance.currentValue,
    value24hAgo: performance.value24hAgo,
    change: performance.change,
    changePercent: performance.changePercent,
  };
}

export function getPerformanceUnavailableReason(
  performance: PortfolioPerformance | null | undefined,
) {
  if (!performance) {
    return 'Performance unavailable';
  }

  if (performance.reason === 'INSUFFICIENT_HISTORY') {
    return 'Collecting performance data';
  }

  if (
    performance.reason === 'HOLDINGS_VALUATION_UNAVAILABLE' ||
    performance.reason === 'LIVE_PORTFOLIO_VALUATION_UNAVAILABLE' ||
    performance.reason === 'LIVE_PORTFOLIO_VALUATION_PARTIAL' ||
    performance.reason === 'PARTIAL_PORTFOLIO_VALUATION'
  ) {
    return 'Performance unavailable';
  }

  return 'Performance unavailable';
}

export function logPortfolioBalanceDecision({
  walletId,
  walletLabel,
  liveSummary,
  performance,
  displayedBalance,
  reason,
}: {
  walletId: string;
  walletLabel: string | null | undefined;
  liveSummary: WalletPortfolioSummary | null | undefined;
  performance: PortfolioPerformance | null | undefined;
  displayedBalance: number | null | undefined;
  reason: string;
}) {
  if (!__DEV__) {
    return;
  }

  console.log('[portfolio-balance-debug]', {
    walletId,
    walletLabel,
    liveSummaryTotalPortfolioUsd: liveSummary?.totalPortfolioUsd ?? null,
    liveSummaryHoldingsTotalUsd: liveSummary?.holdingsTotalUsd ?? null,
    liveSummaryPositionsTotalUsd: liveSummary?.positionsTotalUsd ?? null,
    performanceCurrentValue: performance?.currentValue ?? null,
    performanceChange: performance?.change ?? null,
    performanceIsAvailable: performance?.isAvailable ?? null,
    performanceIsPartial: performance?.isPartial ?? null,
    performanceReason: performance?.reason ?? null,
    chosenDisplayedBalance: displayedBalance ?? null,
    reason,
  });
}
