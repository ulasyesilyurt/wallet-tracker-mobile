import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking, Text, View, StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { WalletDetailScreen } from '../src/screens/WalletDetailScreen';
import { WalletDetailSummary } from '../src/components/WalletDetailSummary';
import { TokenHoldingCard } from '../src/components/TokenHoldingCard';
import { EventDetailModal } from '../src/components/EventDetailModal';
import { getWalletHoldings } from '../src/api/holdings';
import { getWalletPositions } from '../src/api/positions';
import { getWalletEvents } from '../src/api/events';
import { getWalletPerformance } from '../src/api/performance';
import { getWalletPortfolioSummary } from '../src/api/portfolioSummary';
import {
  getWalletAlertSettings,
  updateWalletAlertSettings,
} from '../src/api/walletAlertSettings';
import { getWalletDetailLayout } from '../src/theme/walletDetail';
import type { Wallet } from '../src/types/wallet';

jest.mock('../src/api/holdings');
jest.mock('../src/api/positions');
jest.mock('../src/api/events', () => ({
  ...jest.requireActual('../src/api/events'),
  getWalletEvents: jest.fn(),
}));
jest.mock('../src/api/performance');
jest.mock('../src/api/portfolioSummary');
jest.mock('../src/api/walletAlertSettings');
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const Context = ReactModule.createContext({
    top: 24,
    bottom: 16,
    left: 0,
    right: 0,
  });
  return { useSafeAreaInsets: () => ReactModule.useContext(Context) };
});
jest.mock('../src/components/EventDetailModal', () => ({
  EventDetailModal: jest.fn(() => null),
}));

const wallet: Wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  label: 'My wallet',
  address: `0x${'a'.repeat(40)}`,
  chainId: 'ethereum-mainnet',
  enabledChains: ['ethereum-mainnet', 'base-mainnet'],
  status: 'active',
  trackTypes: ['token_transfer'],
  createdAt: '',
  updatedAt: '',
};
const holdings = {
  walletId: wallet.id,
  chainId: wallet.chainId,
  totalBalanceUsd: 30,
  holdings: [
    {
      chainId: wallet.chainId,
      tokenAddress: null,
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '1',
      decimals: 18,
      balanceUsd: 10,
      isSuspicious: false,
      suspicionReasons: [],
    },
    {
      chainId: 'base-mainnet',
      tokenAddress: null,
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '2',
      decimals: 18,
      balanceUsd: 20,
      isSuspicious: false,
      suspicionReasons: [],
    },
    {
      chainId: wallet.chainId,
      tokenAddress: `0x${'b'.repeat(40)}`,
      symbol: 'FLAG',
      name: 'Flagged',
      balance: '100',
      decimals: 18,
      balanceUsd: 999,
      isSuspicious: true,
      suspicionReasons: ['spam'],
    },
  ],
};
const positions = {
  walletId: wallet.id,
  chainId: wallet.chainId,
  positions: [
    {
      chainId: wallet.chainId,
      protocolName: 'Protocol',
      positionType: 'staking',
      assetName: 'Staked Ether',
      assetSymbol: 'ETH',
      amount: '1',
      valueUsd: 5,
    },
  ],
};
const settings = {
  minimumAlertUsd: 10,
  notificationsEnabled: true,
  notifyFungibleTransfers: true,
  notifyIncomingTransfers: true,
  notifyOutgoingTransfers: false,
  notifyNftTransfers: false,
};
const event = {
  id: 'event-1',
  walletId: wallet.id,
  chainId: wallet.chainId,
  eventType: 'token_transfer',
  assetSymbol: 'ETH',
  amount: '1',
  direction: 'outgoing',
  occurredAt: '2026-09-18T01:00:00Z',
  toAddress: `0x${'c'.repeat(40)}`,
  transactionHash: `0x${'d'.repeat(64)}`,
  usdValue: 10,
  usdValueStatus: 'priced',
};

let renderer: TestRenderer.ReactTestRenderer;
let errors: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.mocked(getWalletHoldings).mockResolvedValue(holdings);
  jest.mocked(getWalletPositions).mockResolvedValue(positions);
  jest.mocked(getWalletEvents).mockResolvedValue({
    items: [event],
    pagination: {limit: 50, offset: 0, hasMore: false},
  });
  jest.mocked(getWalletPortfolioSummary).mockResolvedValue({
    walletId: wallet.id,
    chainId: wallet.chainId,
    holdingsTotalUsd: 30,
    positionsTotalUsd: 5,
    totalPortfolioUsd: 35,
    holdingsValuationAvailable: true,
    positionsValuationAvailable: true,
    isPartial: false,
    reason: null,
  });
  jest.mocked(getWalletPerformance).mockResolvedValue({
    currentValue: 35,
    value24hAgo: 35,
    change: 0,
    changePercent: 0,
    isAvailable: true,
    isPartial: false,
    reason: null,
  });
  jest.mocked(getWalletAlertSettings).mockResolvedValue(settings);
  jest.mocked(updateWalletAlertSettings).mockResolvedValue(settings);
});

afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
  }
  const hookErrors = errors.mock.calls.filter(args =>
    /order of Hooks|Rendered (more|fewer) hooks/.test(args.join(' ')),
  );
  expect(hookErrors).toEqual([]);
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function mount() {
  await act(async () => {
    renderer = TestRenderer.create(
      <WalletDetailScreen
        wallet={wallet}
        onBack={jest.fn()}
        onEdit={jest.fn()}
      />,
    );
  });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}
async function tab(label: string) {
  const control = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      item =>
        item.props.accessibilityRole === 'tab' &&
        item.findByType(Text).props.children === label,
    )!;
  await act(async () => {
    control.props.onPress();
  });
}

it('reuses parent-preloaded data through tab and network changes and excludes suspicious totals', async () => {
  await mount();
  const summary = renderer.root.findByType(WalletDetailSummary);
  await tab('Tokens');
  expect(renderer.root.findAllByType(TokenHoldingCard)).toHaveLength(2);
  await act(async () => {
    renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(item => item.props.accessibilityLabel === 'Filter by network')!
      .props.onPress();
  });
  await act(async () => {
    renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(item =>
        item.findAllByType(Text).some(text => text.props.children === 'Base'),
      )!
      .props.onPress();
  });
  expect(renderer.root.findByType(WalletDetailSummary).props.balance).toBe(20);
  expect(renderer.root.findAllByType(TokenHoldingCard)).toHaveLength(1);
  await tab('Positions');
  await tab('Tokens');
  expect(renderer.root.findByType(WalletDetailSummary)).toBe(summary);
  expect(getWalletHoldings).toHaveBeenCalledTimes(1);
  expect(getWalletPositions).toHaveBeenCalledTimes(1);
});

it('keeps the existing clipboard timer and transaction detail/explorer targets', async () => {
  await mount();
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await act(async () => {
    renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(item => item.props.accessibilityLabel === 'Copy wallet address')!
      .props.onPress();
  });
  expect(Clipboard.setString).toHaveBeenCalledWith(wallet.address);
  expect(renderer.root.findByType(WalletDetailSummary).props.copied).toBe(true);
  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
  expect(renderer.root.findByType(WalletDetailSummary).props.copied).toBe(
    false,
  );
  const stopPropagation = jest.fn();
  await act(async () => {
    await renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(
        item =>
          item.props.accessibilityLabel === 'Open transaction in explorer',
      )!
      .props.onPress({ stopPropagation });
  });
  expect(stopPropagation).toHaveBeenCalled();
  expect(openURL).toHaveBeenCalledWith(
    `https://etherscan.io/tx/${event.transactionHash}`,
  );
  const row = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      item =>
        item.props.accessibilityRole === 'button' &&
        item
          .findAllByType(Text)
          .some(text => text.props.children === 'Sent 1 ETH'),
    )!;
  await act(async () => {
    row.props.onPress();
  });
  expect(renderer.root.findByType(EventDetailModal).props.event).toEqual(event);
});

it('reuses the wallet alert settings mutation with its original payload', async () => {
  await mount();
  await tab('Alerts');
  expect(getWalletAlertSettings).toHaveBeenCalledWith(wallet.id);
  await act(async () => {
    renderer.root
      .findAll(node => typeof node.props.onValueChange === 'function')[0]
      .props.onValueChange(false);
  });
  const save = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(item =>
      item
        .findAllByType(Text)
        .some(text => text.props.children === 'Save alert settings'),
    )!;
  await act(async () => {
    await save.props.onPress();
  });
  expect(updateWalletAlertSettings).toHaveBeenCalledWith(wallet.id, {
    ...settings,
    notificationsEnabled: false,
  });
});

it('uses responsive overrides and keeps flat balance changes neutral', async () => {
  await mount();
  expect(getWalletDetailLayout(360)).toMatchObject({
    narrow: true,
    gutter: 16,
    headerHeight: 48,
    balanceSize: 36,
  });
  expect(getWalletDetailLayout(390)).toMatchObject({
    narrow: false,
    gutter: 20,
    headerHeight: 52,
    balanceSize: 40,
  });
  const flatDelta = renderer.root
    .findByType(WalletDetailSummary)
    .findAllByType(Text)
    .find(item => item.props.accessibilityLabel === 'Balance change $0.00')!;
  expect(StyleSheet.flatten(flatDelta.props.style).color).toBe('#7E8896');
  const summary = renderer.root.findByType(WalletDetailSummary);
  const card = summary.findAllByType(View)[0];
  expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe('#171A1F');
});

it('keeps the summary, tabs, and filter usable when History fails or has no rows', async () => {
  jest
    .mocked(getWalletEvents)
    .mockRejectedValueOnce(new Error('History unavailable'));
  await mount();
  const summary = renderer.root.findByType(WalletDetailSummary);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(item => item.props.children === 'Could not load history'),
  ).toBe(true);
  const retry = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(item =>
      item
        .findAllByType(Text)
        .some(text => text.props.children === 'Try again'),
    )!;
  jest.mocked(getWalletEvents).mockResolvedValueOnce({
    items: [],
    pagination: {limit: 50, offset: 0, hasMore: false},
  });
  await act(async () => {
    await retry.props.onPress();
  });
  expect(renderer.root.findByType(WalletDetailSummary)).toBe(summary);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(item => item.props.children === 'No history yet'),
  ).toBe(true);
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Filter by network',
    ).length,
  ).toBeGreaterThan(0);
  await tab('Tokens');
  expect(renderer.root.findAllByType(TokenHoldingCard)).toHaveLength(2);
});

it('keeps Back, overflow/Edit, and the monitoring card connected to their real targets', async () => {
  await mount();
  const screen = renderer.root.findByType(WalletDetailScreen);
  for (const label of ['Back', 'Edit wallet']) {
    const button = renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(item => item.props.accessibilityLabel === label)!;
    await act(async () => {
      button.props.onPress();
    });
  }
  expect(screen.props.onBack).toHaveBeenCalledTimes(1);
  expect(screen.props.onEdit).toHaveBeenCalledTimes(1);
  const monitoring = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      item => item.props.accessibilityLabel === 'Open wallet alert settings',
    )!;
  await act(async () => {
    monitoring.props.onPress();
  });
  expect(getWalletAlertSettings).toHaveBeenCalledWith(wallet.id);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(item => item.props.children === 'Save alert settings'),
  ).toBe(true);
});
