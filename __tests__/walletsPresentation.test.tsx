import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { RefreshControl, Text } from 'react-native';
import { FollowingScreen } from '../src/screens/FollowingScreen';
import { getWallets } from '../src/api/wallets';
import { getWalletPortfolioSummary } from '../src/api/portfolioSummary';
import type { Wallet } from '../src/types/wallet';
import { getWalletsLayout } from '../src/theme/wallets';

jest.mock('../src/api/wallets');
jest.mock('../src/api/portfolioSummary');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

const mockedGetWallets = jest.mocked(getWallets);
const mockedGetSummary = jest.mocked(getWalletPortfolioSummary);

const wallets: Wallet[] = [
  {
    id: 'wallet-z',
    userId: 'user-1',
    chainId: 'ethereum-mainnet',
    enabledChains: ['ethereum-mainnet', 'base-mainnet'],
    address: `0x${'a'.repeat(40)}`,
    label: 'Zebra wallet with a deliberately very long display name',
    status: 'active',
    trackTypes: ['token_transfer'],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'wallet-a',
    userId: 'user-1',
    chainId: 'base-mainnet',
    enabledChains: ['base-mainnet'],
    address: `0x${'b'.repeat(40)}`,
    label: 'Alpha',
    status: 'active',
    trackTypes: ['native_transfer'],
    createdAt: '',
    updatedAt: '',
  },
];

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function allText(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
}

describe('Wallets presentation', () => {
  let mountedRenderers: TestRenderer.ReactTestRenderer[];

  beforeEach(() => {
    mountedRenderers = [];
    mockedGetWallets.mockReset();
    mockedGetSummary.mockReset();
  });

  afterEach(() => {
    act(() => {
      mountedRenderers.forEach(renderer => renderer.unmount());
    });
  });

  it('keeps server order, real totals, one network badge plus overflow, and navigation', async () => {
    mockedGetWallets.mockResolvedValue(wallets);
    mockedGetSummary.mockImplementation(async walletId => ({
      walletId,
      chainId: walletId === 'wallet-z' ? 'ethereum-mainnet' : 'base-mainnet',
      totalPortfolioUsd: walletId === 'wallet-z' ? 20 : 10,
      holdingsTotalUsd: walletId === 'wallet-z' ? 20 : 10,
      positionsTotalUsd: null,
      holdingsValuationAvailable: true,
      positionsValuationAvailable: false,
      isPartial: false,
      reason: 'POSITIONS_NOT_FETCHED_LIST_MODE',
    }));
    const onSelectWallet = jest.fn();
    const onAddWallet = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <FollowingScreen
          onAddWallet={onAddWallet}
          onSelectWallet={onSelectWallet}
        />,
      );
    });
    mountedRenderers.push(renderer!);
    await flush();
    await flush();

    const text = allText(renderer!);
    expect(text).toContain('$30.00');
    expect(text.indexOf('Zebra wallet')).toBeLessThan(text.indexOf('Alpha'));
    expect(text).toContain('+ 1');
    expect(text).not.toContain('rules watching');
    expect(text).not.toContain('Perf. pending');

    const longName = renderer!.root
      .findAllByType(Text)
      .find(node => node.props.children === wallets[0].label);
    expect(longName?.props.numberOfLines).toBe(1);

    const walletRow = renderer!.root.findByProps({
      accessibilityLabel:
        'Open Zebra wallet with a deliberately very long display name',
    });
    act(() => walletRow.props.onPress());
    expect(onSelectWallet).toHaveBeenCalledWith(wallets[0]);

    const add = renderer!.root.findByProps({
      accessibilityLabel: 'Add wallet',
    });
    act(() => add.props.onPress());
    expect(onAddWallet).toHaveBeenCalledTimes(1);
  });

  it('shows real loading shells instead of a quiet or triage state', async () => {
    mockedGetWallets.mockReturnValue(new Promise(() => {}));
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <FollowingScreen onAddWallet={jest.fn()} onSelectWallet={jest.fn()} />,
      );
    });
    mountedRenderers.push(renderer!);
    const text = allText(renderer!);
    expect(text).toContain('Syncing…');
    expect(text).not.toContain('All quiet');
    expect(
      renderer!.root.findAllByProps({
        accessibilityLabel: 'Loading portfolio total',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer!.root.findAllByProps({
        accessibilityLabel: 'Loading wallets',
      }).length,
    ).toBeGreaterThan(0);
  });

  it('omits portfolio and Watching for an empty list while preserving Add wallet', async () => {
    mockedGetWallets.mockResolvedValue([]);
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <FollowingScreen onAddWallet={jest.fn()} onSelectWallet={jest.fn()} />,
      );
    });
    mountedRenderers.push(renderer!);
    await flush();
    const text = allText(renderer!);
    expect(text).toContain('No wallets yet');
    expect(text).not.toContain('Portfolio total');
    expect(text).not.toContain('Watching');
  });

  it('keeps the header and retry path in the uncached error state', async () => {
    mockedGetWallets.mockRejectedValue(new Error('offline'));
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <FollowingScreen onAddWallet={jest.fn()} onSelectWallet={jest.fn()} />,
      );
    });
    mountedRenderers.push(renderer!);
    await flush();
    const text = allText(renderer!);
    expect(text).toContain('Wallets');
    expect(text).toContain('Offline');
    expect(text).toContain('Could not load wallets');
    expect(text).toContain('Try again');
  });

  it('keeps cached wallets mounted when pull-to-refresh fails', async () => {
    mockedGetWallets
      .mockResolvedValueOnce(wallets)
      .mockRejectedValueOnce(new Error('offline'));
    mockedGetSummary.mockImplementation(async walletId => ({
      walletId,
      chainId: 'ethereum-mainnet',
      totalPortfolioUsd: 10,
      holdingsTotalUsd: 10,
      positionsTotalUsd: null,
      holdingsValuationAvailable: true,
      positionsValuationAvailable: false,
      isPartial: false,
      reason: 'POSITIONS_NOT_FETCHED_LIST_MODE',
    }));
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <FollowingScreen onAddWallet={jest.fn()} onSelectWallet={jest.fn()} />,
      );
    });
    mountedRenderers.push(renderer!);
    await flush();
    await flush();

    act(() => renderer!.root.findByType(RefreshControl).props.onRefresh());
    await flush();

    const text = allText(renderer!);
    expect(text).toContain('Offline');
    expect(text).toContain('Showing last known balances');
    expect(text).toContain('Zebra wallet');
    expect(text).toContain('$10.00');
  });

  it('uses only the locked 360pt overrides', () => {
    expect(getWalletsLayout(360)).toMatchObject({
      narrow: true,
      gutter: 16,
      rowHeight: 66,
      avatarSize: 40,
    });
    expect(getWalletsLayout(390)).toMatchObject({
      narrow: false,
      gutter: 20,
      rowHeight: 70,
      avatarSize: 42,
    });
  });
});
