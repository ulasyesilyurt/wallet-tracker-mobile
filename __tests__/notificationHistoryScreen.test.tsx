import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ScrollView, SectionList, StyleSheet, Text } from 'react-native';
import { NotificationHistoryScreen } from '../src/screens/NotificationHistoryScreen';
import {
  getNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationHistoryItem,
} from '../src/api/notifications';

jest.mock('../src/api/notifications');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

const mockedGetNotificationHistory = jest.mocked(getNotificationHistory);
const mockedMarkNotificationRead = jest.mocked(markNotificationRead);
const mockedMarkAllNotificationsRead = jest.mocked(markAllNotificationsRead);

const item: NotificationHistoryItem = {
  id: 'notification-1',
  walletId: 'wallet-1',
  chainId: 'ethereum-mainnet',
  type: 'token_transfer',
  category: 'movement',
  severity: 'warning',
  title: 'Large outgoing transfer',
  body: '0.50 ETH sent from Main',
  readAt: null,
  isRead: false,
  relatedEventId: 'event-1',
  transactionHash: `0x${'2'.repeat(64)}`,
  status: 'delivered',
  providerMessageId: null,
  errorMessage: null,
  createdAt: new Date().toISOString(),
  sentAt: new Date().toISOString(),
  walletEvent: {
    id: 'event-1',
    walletId: 'wallet-1',
    walletLabel: 'Main',
    walletAddress: `0x${'1'.repeat(40)}`,
    transactionHash: `0x${'2'.repeat(64)}`,
    eventType: 'token_transfer',
    direction: 'outgoing',
    assetSymbol: 'ETH',
    amount: '0.5',
    fromAddress: `0x${'3'.repeat(40)}`,
    toAddress: `0x${'4'.repeat(40)}`,
    chainId: 'ethereum-mainnet',
    createdAt: new Date().toISOString(),
    occurredAt: new Date().toISOString(),
  },
};

function notification(
  overrides: Partial<NotificationHistoryItem> = {},
): NotificationHistoryItem {
  return {
    ...item,
    ...overrides,
    walletEvent: { ...item.walletEvent, ...(overrides.walletEvent ?? {}) },
  };
}

function notificationFromDaysAgo(
  daysAgo: number,
  overrides: Partial<NotificationHistoryItem> = {},
): NotificationHistoryItem {
  const timestamp = new Date(
    Date.now() - daysAgo * 24 * 60 * 60 * 1000,
  ).toISOString();
  return notification({
    ...overrides,
    createdAt: timestamp,
    sentAt: timestamp,
    walletEvent: {
      ...item.walletEvent,
      ...(overrides.walletEvent ?? {}),
      createdAt: timestamp,
      occurredAt: timestamp,
    },
  });
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
    .flat()
    .join(' ');
}

describe('NotificationHistoryScreen', () => {
  let mounted: TestRenderer.ReactTestRenderer[];

  beforeEach(() => {
    mounted = [];
    mockedGetNotificationHistory.mockReset();
    mockedMarkNotificationRead.mockReset();
    mockedMarkAllNotificationsRead.mockReset();
    mockedMarkNotificationRead.mockResolvedValue({
      id: item.id,
      isRead: true,
      readAt: new Date().toISOString(),
    });
    mockedMarkAllNotificationsRead.mockResolvedValue(1);
  });

  afterEach(() => {
    act(() => mounted.forEach(renderer => renderer.unmount()));
  });

  it('renders backend copy, marks an opened row read, refreshes the badge, and preserves navigation', async () => {
    mockedGetNotificationHistory.mockResolvedValue({
      items: [item],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });
    const onOpenWalletHistory = jest.fn();
    const onUnreadCountRefresh = jest.fn().mockResolvedValue(undefined);
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen
          onOpenWalletHistory={onOpenWalletHistory}
          onUnreadCountRefresh={onUnreadCountRefresh}
        />,
      );
    });
    mounted.push(renderer!);
    await flush();

    expect(allText(renderer!)).toContain('Large outgoing transfer');
    expect(allText(renderer!)).toContain('0.50 ETH sent from Main');
    expect(mockedGetNotificationHistory).toHaveBeenCalledWith(50, 0);
    expect(onUnreadCountRefresh).toHaveBeenCalledTimes(1);

    const row = renderer!.root.findByProps({
      accessibilityLabel: 'Unread, Large outgoing transfer, Main',
    });
    expect(
      StyleSheet.flatten(row.props.style({ pressed: false })).opacity,
    ).toBeUndefined();
    act(() => row.props.onPress());
    await flush();

    expect(onOpenWalletHistory).toHaveBeenCalledWith('wallet-1');
    expect(mockedMarkNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(onUnreadCountRefresh).toHaveBeenCalledTimes(2);
    const readRow = renderer!.root.findByProps({
      accessibilityLabel: 'Large outgoing transfer, Main',
    });
    expect(
      StyleSheet.flatten(readRow.props.style({ pressed: false })).opacity,
    ).toBe(0.72);
  });

  it('marks all loaded rows read through the backend endpoint', async () => {
    const second = notification({
      id: 'notification-2',
      title: 'NFT received',
      body: 'Collectible received by Main',
      type: 'nft_transfer',
      category: 'nft',
      severity: 'info',
      relatedEventId: 'event-2',
      walletEvent: {
        ...item.walletEvent,
        id: 'event-2',
        eventType: 'nft_transfer',
      },
    });
    mockedGetNotificationHistory.mockResolvedValue({
      items: [item, second],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });
    const onUnreadCountRefresh = jest.fn().mockResolvedValue(undefined);
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen
          onOpenWalletHistory={jest.fn()}
          onUnreadCountRefresh={onUnreadCountRefresh}
        />,
      );
    });
    mounted.push(renderer!);
    await flush();

    const markAll = renderer!.root.findByProps({
      accessibilityLabel: 'Mark all alerts read',
    });
    act(() => markAll.props.onPress());
    await flush();

    expect(mockedMarkAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(onUnreadCountRefresh).toHaveBeenCalledTimes(2);
    expect(
      renderer!.root.findAll(
        node =>
          typeof node.props.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith('Unread, '),
      ),
    ).toHaveLength(0);
  });

  it('filters loaded backend data without refetching or showing Critical', async () => {
    const nft = notification({
      id: 'notification-nft',
      title: 'NFT received',
      body: 'Collectible received',
      type: 'nft_transfer',
      category: 'nft',
      severity: 'info',
      relatedEventId: 'event-nft',
      walletEvent: {
        ...item.walletEvent,
        id: 'event-nft',
        eventType: 'nft_transfer',
      },
    });
    mockedGetNotificationHistory.mockResolvedValue({
      items: [item, nft],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen onOpenWalletHistory={jest.fn()} />,
      );
    });
    mounted.push(renderer!);
    await flush();

    expect(allText(renderer!)).not.toContain('Critical');
    const warning = renderer!.root.findByProps({
      accessibilityLabel: 'Warning alerts, 1',
    });
    act(() => warning.props.onPress());
    expect(allText(renderer!)).toContain('Large outgoing transfer');
    expect(allText(renderer!)).not.toContain('NFT received');

    const moves = renderer!.root.findByProps({
      accessibilityLabel: 'Moves alerts, 1',
    });
    act(() => moves.props.onPress());
    expect(allText(renderer!)).toContain('Large outgoing transfer');
    expect(mockedGetNotificationHistory).toHaveBeenCalledTimes(1);
  });

  it('hides filters and mark-all while preserving older history in quiet state', async () => {
    const olderAlert = notificationFromDaysAgo(8, {
      id: 'notification-older',
      title: 'Older warning',
    });
    mockedGetNotificationHistory.mockResolvedValue({
      items: [olderAlert],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });
    const onUnreadCountRefresh = jest.fn().mockResolvedValue(undefined);
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen
          onOpenWalletHistory={jest.fn()}
          unreadCount={1}
          onUnreadCountRefresh={onUnreadCountRefresh}
        />,
      );
    });
    mounted.push(renderer!);
    await flush();

    expect(allText(renderer!)).toContain('Nothing new · all caught up');
    expect(allText(renderer!)).toContain('All quiet');
    expect(allText(renderer!)).toContain('Earlier');
    expect(allText(renderer!)).toContain('Older warning');
    expect(
      renderer!.root.findAllByProps({ accessibilityRole: 'tab' }),
    ).toHaveLength(0);
    expect(
      renderer!.root
        .findAllByType(ScrollView)
        .filter(scrollView => scrollView.props.horizontal),
    ).toHaveLength(0);
    expect(
      renderer!.root.findAllByProps({
        accessibilityLabel: 'Mark all alerts read',
      }),
    ).toHaveLength(0);
    expect(onUnreadCountRefresh).toHaveBeenCalledTimes(1);
    const earlierTitle = renderer!.root
      .findAllByType(Text)
      .find(node => node.props.children === 'Earlier');
    expect(
      StyleSheet.flatten(earlierTitle!.parent!.props.style).paddingHorizontal,
    ).toBeUndefined();

    const sections = renderer!.root.findByType(SectionList).props.sections;
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Earlier');
    expect(
      sections[0].data.map((alert: NotificationHistoryItem) => alert.id),
    ).toEqual(['notification-older']);
  });

  it('shows filters and mark-all when the recent window contains an alert', async () => {
    mockedGetNotificationHistory.mockResolvedValue({
      items: [item],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen
          onOpenWalletHistory={jest.fn()}
          unreadCount={1}
        />,
      );
    });
    mounted.push(renderer!);
    await flush();

    expect(
      renderer!.root.findByProps({ accessibilityLabel: 'All alerts, 1' }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({
        accessibilityLabel: 'Mark all alerts read',
      }),
    ).toBeTruthy();
  });

  it('restores the filter strip when refresh brings in a recent alert', async () => {
    const olderAlert = notificationFromDaysAgo(8, {
      id: 'notification-older',
      title: 'Older warning',
    });
    mockedGetNotificationHistory
      .mockResolvedValueOnce({
        items: [olderAlert],
        pagination: { limit: 50, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({
        items: [item, olderAlert],
        pagination: { limit: 50, offset: 0, hasMore: false },
      });
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen onOpenWalletHistory={jest.fn()} />,
      );
    });
    mounted.push(renderer!);
    await flush();

    expect(
      renderer!.root.findAllByProps({ accessibilityRole: 'tab' }),
    ).toHaveLength(0);

    await act(async () => {
      renderer!.root
        .findByType(SectionList)
        .props.refreshControl.props.onRefresh();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    expect(
      renderer!.root.findByProps({ accessibilityLabel: 'All alerts, 2' }),
    ).toBeTruthy();
    expect(allText(renderer!)).toContain('Older warning');
  });

  it('appends delivery-based pagination records without deduplicating events', async () => {
    const secondDelivery = notification({
      id: 'notification-2',
      title: 'Second device delivery',
    });
    mockedGetNotificationHistory
      .mockResolvedValueOnce({
        items: [item],
        pagination: { limit: 50, offset: 0, hasMore: true },
      })
      .mockResolvedValueOnce({
        items: [secondDelivery],
        pagination: { limit: 50, offset: 50, hasMore: false },
      });
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen onOpenWalletHistory={jest.fn()} />,
      );
    });
    mounted.push(renderer!);
    await flush();

    act(() => renderer!.root.findByType(SectionList).props.onEndReached());
    await flush();

    expect(mockedGetNotificationHistory).toHaveBeenNthCalledWith(2, 50, 50);
    expect(allText(renderer!)).toContain('Large outgoing transfer');
    expect(allText(renderer!)).toContain('Second device delivery');
  });

  it('rolls back optimistic read styling and reports mutation errors', async () => {
    mockedGetNotificationHistory.mockResolvedValue({
      items: [item],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });
    mockedMarkNotificationRead.mockRejectedValue(new Error('Read failed'));
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen onOpenWalletHistory={jest.fn()} />,
      );
    });
    mounted.push(renderer!);
    await flush();

    act(() =>
      renderer!.root
        .findByProps({
          accessibilityLabel: 'Unread, Large outgoing transfer, Main',
        })
        .props.onPress(),
    );
    await flush();

    expect(allText(renderer!)).toContain('Read failed');
    expect(
      renderer!.root.findByProps({
        accessibilityLabel: 'Unread, Large outgoing transfer, Main',
      }),
    ).toBeTruthy();
  });

  it('keeps the header mounted across history errors and preserves quiet state', async () => {
    mockedGetNotificationHistory
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        items: [],
        pagination: { limit: 50, offset: 0, hasMore: false },
      });
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen onOpenWalletHistory={jest.fn()} />,
      );
    });
    mounted.push(renderer!);
    await flush();
    expect(allText(renderer!)).toContain('Alerts');
    expect(allText(renderer!)).toContain('Could not load alerts');

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
