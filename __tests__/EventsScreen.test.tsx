import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {FlatList, RefreshControl, Text} from 'react-native';
import {
  getWalletEvents,
  type WalletHistoryItem,
  type WalletEventsPage,
} from '../src/api/events';
import {EventDetailModal} from '../src/components/EventDetailModal';
import {EventsScreen} from '../src/screens/EventsScreen';

jest.mock('../src/api/events', () => ({
  ...jest.requireActual('../src/api/events'),
  getWalletEvents: jest.fn(),
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('../src/components/EventCard', () => ({
  EventCard: ({event: itemEvent, onPress}: {event: {id: string}; onPress: () => void}) => {
    const ReactModule = require('react');
    const {Pressable: MockPressable, Text: MockText} = require('react-native');
    return ReactModule.createElement(
      MockPressable,
      {accessibilityLabel: `event-${itemEvent.id}`, onPress},
      ReactModule.createElement(MockText, null, itemEvent.id),
    );
  },
}));
jest.mock('../src/components/TransactionActivityCard', () => ({
  TransactionActivityCard: ({activity, onPress}: {activity: {id: string}; onPress: () => void}) => {
    const ReactModule = require('react');
    const {Pressable: MockPressable, Text: MockText} = require('react-native');
    return ReactModule.createElement(
      MockPressable,
      {accessibilityLabel: `event-${activity.id}`, onPress},
      ReactModule.createElement(MockText, null, activity.id),
    );
  },
}));
jest.mock('../src/components/EventDetailModal', () => ({
  EventDetailModal: jest.fn(() => null),
}));

const mockedGetWalletEvents = jest.mocked(getWalletEvents);

function event(
  id: string,
  chainId = 'ethereum-mainnet',
): WalletHistoryItem {
  return {
    id,
    walletId: 'wallet-1',
    chainId,
    eventType: 'token_transfer',
    assetSymbol: 'ETH',
    amount: '1',
    direction: 'incoming',
    occurredAt: '2026-09-22T12:00:00.000Z',
  };
}

function page(
  items: WalletHistoryItem[],
  offset: number,
  hasMore: boolean,
): WalletEventsPage {
  return {
    items,
    pagination: {limit: 50, offset, hasMore},
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function renderedEventIds(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findByType(FlatList)
    .props.data
    .filter((item: {type: string}) => item.type === 'event')
    .map((item: {event: WalletHistoryItem}) => `event-${item.event.id}`);
}

describe('EventsScreen pagination', () => {
  let renderer: TestRenderer.ReactTestRenderer | null;

  beforeEach(() => {
    renderer = null;
    mockedGetWalletEvents.mockReset();
  });

  afterEach(() => {
    if (renderer) {
      act(() => renderer?.unmount());
    }
  });

  it('loads page zero, appends and dedupes page two, then opens event detail', async () => {
    const first = event('first');
    const second = event('second', 'base-mainnet');
    mockedGetWalletEvents
      .mockResolvedValueOnce(page([first], 0, true))
      .mockResolvedValueOnce(page([first, second], 50, false));

    await act(async () => {
      renderer = TestRenderer.create(<EventsScreen walletId="wallet-1" />);
    });
    await flush();

    expect(mockedGetWalletEvents).toHaveBeenNthCalledWith(1, 'wallet-1', 50, 0);
    expect(renderedEventIds(renderer!)).toEqual(['event-first']);

    act(() => {
      renderer!.root.findByType(FlatList).props.onEndReached();
    });
    await flush();

    expect(mockedGetWalletEvents).toHaveBeenNthCalledWith(2, 'wallet-1', 50, 50);
    expect(renderedEventIds(renderer!)).toEqual(['event-first', 'event-second']);

    const list = renderer!.root.findByType(FlatList);
    const secondItem = list.props.data.find(
      (item: {type: string; event?: WalletHistoryItem}) => item.type === 'event' && item.event?.id === 'second',
    );
    act(() => {
      list.props.renderItem({item: secondItem}).props.onPress();
    });
    expect(renderer!.root.findByType(EventDetailModal).props.event).toEqual(second);

    act(() => {
      renderer!.root.findByType(FlatList).props.onEndReached();
    });
    await flush();
    expect(mockedGetWalletEvents).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate concurrent next-page requests', async () => {
    let resolveNextPage: ((value: WalletEventsPage) => void) | undefined;
    mockedGetWalletEvents
      .mockResolvedValueOnce(page([event('first')], 0, true))
      .mockImplementationOnce(
        () => new Promise(resolve => {
          resolveNextPage = resolve;
        }),
      );

    await act(async () => {
      renderer = TestRenderer.create(<EventsScreen walletId="wallet-1" />);
    });
    await flush();

    act(() => {
      renderer!.root.findByType(FlatList).props.onEndReached();
      renderer!.root.findByType(FlatList).props.onEndReached();
    });
    expect(mockedGetWalletEvents).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveNextPage?.(page([event('second')], 50, false));
    });
  });

  it('refreshes from offset zero and replaces accumulated rows', async () => {
    mockedGetWalletEvents
      .mockResolvedValueOnce(page([event('first')], 0, true))
      .mockResolvedValueOnce(page([event('second')], 50, false))
      .mockResolvedValueOnce(page([event('refreshed')], 0, false));

    await act(async () => {
      renderer = TestRenderer.create(<EventsScreen walletId="wallet-1" />);
    });
    await flush();
    act(() => {
      renderer!.root.findByType(FlatList).props.onEndReached();
    });
    await flush();
    expect(renderedEventIds(renderer!)).toEqual(['event-first', 'event-second']);

    act(() => {
      renderer!.root.findByType(RefreshControl).props.onRefresh();
    });
    await flush();

    expect(mockedGetWalletEvents).toHaveBeenNthCalledWith(3, 'wallet-1', 50, 0);
    expect(renderedEventIds(renderer!)).toEqual(['event-refreshed']);
  });

  it('preserves loaded rows when loading more fails and allows retry', async () => {
    mockedGetWalletEvents
      .mockResolvedValueOnce(page([event('first')], 0, true))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(page([event('second')], 50, false));

    await act(async () => {
      renderer = TestRenderer.create(<EventsScreen walletId="wallet-1" />);
    });
    await flush();
    act(() => {
      renderer!.root.findByType(FlatList).props.onEndReached();
    });
    await flush();

    expect(renderedEventIds(renderer!)).toEqual(['event-first']);
    expect(renderer!.root.findAllByType(Text).some(node => node.props.children === 'offline')).toBe(true);

    act(() => {
      renderer!.root.findByType(FlatList).props.ListFooterComponent.props.onRetry();
    });
    await flush();
    expect(renderedEventIds(renderer!)).toEqual(['event-first', 'event-second']);
  });

  it('keeps Ethereum and Base filters local after multiple pages', async () => {
    mockedGetWalletEvents
      .mockResolvedValueOnce(page([event('eth')], 0, true))
      .mockResolvedValueOnce(page([event('base', 'base-mainnet')], 50, false));

    await act(async () => {
      renderer = TestRenderer.create(<EventsScreen walletId="wallet-1" />);
    });
    await flush();
    act(() => {
      renderer!.root.findByType(FlatList).props.onEndReached();
    });
    await flush();

    await act(async () => {
      renderer!.update(<EventsScreen walletId="wallet-1" selectedChainId="ethereum-mainnet" />);
    });
    expect(renderedEventIds(renderer!)).toEqual(['event-eth']);

    await act(async () => {
      renderer!.update(<EventsScreen walletId="wallet-1" selectedChainId="base-mainnet" />);
    });
    expect(renderedEventIds(renderer!)).toEqual(['event-base']);
    expect(mockedGetWalletEvents).toHaveBeenCalledTimes(2);
  });

  it('automatically advances a filtered empty page to reveal an older match', async () => {
    mockedGetWalletEvents
      .mockResolvedValueOnce(page([event('base', 'base-mainnet')], 0, true))
      .mockResolvedValueOnce(page([event('older-eth')], 50, false));

    await act(async () => {
      renderer = TestRenderer.create(
        <EventsScreen walletId="wallet-1" selectedChainId="ethereum-mainnet" />,
      );
    });
    await flush();

    expect(mockedGetWalletEvents).toHaveBeenNthCalledWith(2, 'wallet-1', 50, 50);
    expect(renderedEventIds(renderer!)).toEqual(['event-older-eth']);
  });

  it('offers a bounded continuation when several filtered pages have no matches', async () => {
    mockedGetWalletEvents
      .mockResolvedValueOnce(page([event('base-0', 'base-mainnet')], 0, true))
      .mockResolvedValueOnce(page([event('base-1', 'base-mainnet')], 50, true))
      .mockResolvedValueOnce(page([event('base-2', 'base-mainnet')], 100, true))
      .mockResolvedValueOnce(page([event('base-3', 'base-mainnet')], 150, true))
      .mockResolvedValueOnce(page([event('base-4', 'base-mainnet')], 200, true))
      .mockResolvedValueOnce(page([event('oldest-eth')], 250, false));

    await act(async () => {
      renderer = TestRenderer.create(
        <EventsScreen walletId="wallet-1" selectedChainId="ethereum-mainnet" />,
      );
    });
    await flush();

    expect(mockedGetWalletEvents).toHaveBeenCalledTimes(5);
    expect(renderedEventIds(renderer!)).toEqual([]);
    const footer = renderer!.root.findByType(FlatList).props.ListFooterComponent;
    expect(footer.props.actionLabel).toBe('Load older');

    act(() => {
      footer.props.onRetry();
    });
    await flush();

    expect(mockedGetWalletEvents).toHaveBeenNthCalledWith(6, 'wallet-1', 50, 250);
    expect(renderedEventIds(renderer!)).toEqual(['event-oldest-eth']);
  });
});
