import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { RefreshControl, SectionList, Text } from 'react-native';
import { getGlobalActivity } from '../src/api/activity';
import type { WalletEvent } from '../src/api/events';
import { EventDetailModal } from '../src/components/EventDetailModal';
import { ActivityScreen } from '../src/screens/ActivityScreen';

jest.mock('../src/api/activity');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));
jest.mock('../src/components/EventDetailModal', () => ({
  EventDetailModal: jest.fn(() => null),
}));

const mockedGetGlobalActivity = jest.mocked(getGlobalActivity);

function event(id: string, overrides: Partial<WalletEvent> = {}): WalletEvent {
  return {
    id,
    walletId: 'wallet-1',
    walletLabel: 'Main wallet',
    walletAddress: `0x${'1'.repeat(40)}`,
    chainId: 'ethereum-mainnet',
    transactionHash: `0x${id.padStart(64, '0')}`,
    eventType: 'token_transfer',
    assetType: 'erc20',
    assetSymbol: 'ETH',
    amount: '1',
    usdValue: '100',
    usdValueStatus: 'priced_current',
    direction: 'incoming',
    occurredAt: new Date().toISOString(),
    fromAddress: `0x${'2'.repeat(40)}`,
    toAddress: `0x${'1'.repeat(40)}`,
    ...overrides,
  };
}

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
    .flat(Infinity)
    .join(' ');
}

describe('ActivityScreen', () => {
  let mounted: TestRenderer.ReactTestRenderer[];

  beforeEach(() => {
    mounted = [];
    mockedGetGlobalActivity.mockReset();
  });

  afterEach(() => {
    act(() => mounted.forEach(renderer => renderer.unmount()));
  });

  it('loads the current page, filters locally, and opens the existing detail modal', async () => {
    const incoming = event('incoming');
    const outgoing = event('outgoing', { direction: 'outgoing' });
    mockedGetGlobalActivity.mockResolvedValue({
      items: [incoming, outgoing],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ActivityScreen />);
    });
    mounted.push(renderer!);
    await flush();

    expect(mockedGetGlobalActivity).toHaveBeenCalledWith(50, 0);
    expect(allText(renderer!)).toContain('Received ETH');
    expect(allText(renderer!)).toContain('Sent ETH');

    const outgoingFilter = renderer!.root.findByProps({
      accessibilityLabel: 'Out activity, 1',
    });
    act(() => outgoingFilter.props.onPress());
    expect(allText(renderer!)).not.toContain('Received ETH');
    expect(allText(renderer!)).toContain('Sent ETH');
    expect(mockedGetGlobalActivity).toHaveBeenCalledTimes(1);

    const row = renderer!.root.findByProps({
      accessibilityLabel: 'Sent ETH, −1 ETH, Main wallet',
    });
    act(() => row.props.onPress());
    expect(renderer!.root.findByType(EventDetailModal).props.event).toEqual(
      outgoing,
    );
  });

  it('preserves pagination and API-order ties without deduplicating', async () => {
    const tiedAt = new Date().toISOString();
    const first = event('same-id', { occurredAt: tiedAt });
    const second = event('same-id', {
      occurredAt: tiedAt,
      direction: 'outgoing',
    });
    mockedGetGlobalActivity
      .mockResolvedValueOnce({
        items: [first],
        pagination: { limit: 50, offset: 0, hasMore: true },
      })
      .mockResolvedValueOnce({
        items: [second],
        pagination: { limit: 50, offset: 50, hasMore: false },
      });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ActivityScreen />);
    });
    mounted.push(renderer!);
    await flush();

    await act(async () => {
      renderer!.root.findByType(SectionList).props.onEndReached();
    });
    await flush();

    expect(mockedGetGlobalActivity).toHaveBeenNthCalledWith(2, 50, 50);
    expect(allText(renderer!).match(/Main wallet/g)).toHaveLength(2);
  });

  it('keeps loaded content mounted while pull-to-refresh is pending', async () => {
    let resolveRefresh:
      | ((value: Awaited<ReturnType<typeof getGlobalActivity>>) => void)
      | undefined;
    mockedGetGlobalActivity
      .mockResolvedValueOnce({
        items: [event('existing')],
        pagination: { limit: 50, offset: 0, hasMore: false },
      })
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRefresh = resolve;
          }),
      );

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ActivityScreen />);
    });
    mounted.push(renderer!);
    await flush();

    act(() => {
      renderer!.root.findByType(RefreshControl).props.onRefresh();
    });
    expect(allText(renderer!)).toContain('Received ETH');

    await act(async () => {
      resolveRefresh?.({
        items: [event('refreshed', { assetSymbol: 'USDC' })],
        pagination: { limit: 50, offset: 0, hasMore: false },
      });
    });
    await flush();
    expect(allText(renderer!)).toContain('Received USDC');
  });

  it('never renders quiet state while loading and shows it after a successful old-only load', async () => {
    let resolveLoad:
      | ((value: Awaited<ReturnType<typeof getGlobalActivity>>) => void)
      | undefined;
    mockedGetGlobalActivity.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveLoad = resolve;
        }),
    );

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ActivityScreen />);
    });
    mounted.push(renderer!);
    expect(allText(renderer!)).not.toContain('All quiet');
    expect(
      renderer!.root.findByProps({ accessibilityLabel: 'Loading activity' }),
    ).toBeTruthy();

    await act(async () => {
      resolveLoad?.({
        items: [
          event('old', {
            occurredAt: new Date(2020, 0, 1, 12, 0, 0).toISOString(),
          }),
        ],
        pagination: { limit: 50, offset: 0, hasMore: false },
      });
    });
    await flush();
    expect(allText(renderer!)).toContain('All quiet');
    expect(allText(renderer!)).toContain('Earlier');
    expect(allText(renderer!)).toContain('Received ETH');
  });

  it('shows an initial error with retry and keeps the Activity header mounted', async () => {
    mockedGetGlobalActivity
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        items: [],
        pagination: { limit: 50, offset: 0, hasMore: false },
      });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ActivityScreen />);
    });
    mounted.push(renderer!);
    await flush();
    expect(allText(renderer!)).toContain('Activity');
    expect(allText(renderer!)).toContain('Could not load activity');

    const retry = renderer!.root
      .findAllByProps({ accessibilityRole: 'button' })
      .find(node =>
        node
          .findAllByType(Text)
          .some(text => text.props.children === 'Try again'),
      );
    await act(async () => retry!.props.onPress());
    await flush();
    expect(allText(renderer!)).toContain('All quiet');
  });
});
