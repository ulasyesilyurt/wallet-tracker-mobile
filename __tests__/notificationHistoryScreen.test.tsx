import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { NotificationHistoryScreen } from '../src/screens/NotificationHistoryScreen';
import {
  getNotificationHistory,
  type NotificationHistoryItem,
} from '../src/api/notifications';

jest.mock('../src/api/notifications');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

const mockedGetNotificationHistory = jest.mocked(getNotificationHistory);
const item: NotificationHistoryItem = {
  id: 'notification-1',
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

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('NotificationHistoryScreen', () => {
  beforeEach(() => {
    mockedGetNotificationHistory.mockReset();
  });

  it('renders recent real data and preserves row navigation without another fetch', async () => {
    mockedGetNotificationHistory.mockResolvedValue({
      items: [item],
      pagination: { limit: 50, offset: 0, hasMore: false },
    });
    const onOpenWalletHistory = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationHistoryScreen onOpenWalletHistory={onOpenWalletHistory} />,
      );
    });
    await flush();

    const text = renderer!.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .flat()
      .join(' ');
    expect(text).toContain('1 alert in 7 days');
    expect(text).toContain('Sent 0.50 ETH');
    expect(mockedGetNotificationHistory).toHaveBeenCalledTimes(1);

    const row = renderer!.root.findByProps({
      accessibilityLabel: 'Sent 0.50 ETH, Main',
    });
    act(() => row.props.onPress());
    expect(onOpenWalletHistory).toHaveBeenCalledWith('wallet-1');
  });

  it('keeps the header mounted across error and retry states', async () => {
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
    await flush();
    let labels = renderer!.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .flat();
    expect(labels).toContain('Alerts');
    expect(labels).toContain('Could not load alerts');

    const retry = renderer!.root.findByProps({ accessibilityRole: 'button' });
    await act(async () => retry!.props.onPress());
    await flush();
    labels = renderer!.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .flat();
    expect(labels).toContain('All quiet');
  });
});
