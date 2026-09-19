import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Pressable, Text, View } from 'react-native';
import { getNotificationUnreadCount } from '../src/api/notifications';
import { NotificationUnreadBadge } from '../src/components/NotificationUnreadBadge';
import { useNotificationUnreadCount } from '../src/notifications/useNotificationUnreadCount';

jest.mock('../src/api/notifications');

const mockedGetUnreadCount = jest.mocked(getNotificationUnreadCount);

function Harness() {
  const { unreadCount, refreshUnreadCount } = useNotificationUnreadCount();
  return (
    <View>
      <NotificationUnreadBadge count={unreadCount ?? 0} />
      <Text>{unreadCount}</Text>
      <Pressable
        accessibilityLabel="Refresh unread count"
        onPress={() => void refreshUnreadCount()}
      />
    </View>
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('notification unread count', () => {
  it('loads and refreshes the centralized badge count', async () => {
    mockedGetUnreadCount.mockResolvedValueOnce(7).mockResolvedValueOnce(2);
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Harness />);
    });
    await flush();

    expect(
      renderer!.root.findByProps({ accessibilityLabel: '7 unread alerts' }),
    ).toBeTruthy();

    act(() =>
      renderer!.root
        .findByProps({ accessibilityLabel: 'Refresh unread count' })
        .props.onPress(),
    );
    await flush();

    expect(
      renderer!.root.findByProps({ accessibilityLabel: '2 unread alerts' }),
    ).toBeTruthy();
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(2);
    act(() => renderer!.unmount());
  });

  it('keeps the last known badge when refresh fails', async () => {
    mockedGetUnreadCount
      .mockResolvedValueOnce(3)
      .mockRejectedValueOnce(new Error('offline'));
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Harness />);
    });
    await flush();
    act(() =>
      renderer!.root
        .findByProps({ accessibilityLabel: 'Refresh unread count' })
        .props.onPress(),
    );
    await flush();
    expect(
      renderer!.root.findByProps({ accessibilityLabel: '3 unread alerts' }),
    ).toBeTruthy();
    act(() => renderer!.unmount());
  });
});
