import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {AppNavigator} from '../src/navigation/AppNavigator';
import {AddWalletScreen} from '../src/screens/AddWalletScreen';
import {FollowingScreen} from '../src/screens/FollowingScreen';
import {WalletDetailScreen} from '../src/screens/WalletDetailScreen';
import {WalletEditScreen} from '../src/screens/WalletEditScreen';
import type {Wallet} from '../src/types/wallet';

jest.mock('@react-native-firebase/messaging', () => () => ({
  onMessage: () => () => undefined,
  onNotificationOpenedApp: () => () => undefined,
  getInitialNotification: () => Promise.resolve(null),
}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: () => ({logout: jest.fn()})}));
jest.mock('../src/notifications/useNotificationUnreadCount', () => ({
  useNotificationUnreadCount: () => ({unreadCount: 0, refreshUnreadCount: jest.fn()}),
}));
jest.mock('../src/navigation/TabBarInsetContext', () => ({
  TabBarInsetProvider: ({children}: {children: React.ReactNode}) => children,
}));
jest.mock('../src/components/FloatingTabBar', () => ({FloatingTabBar: () => null}));
jest.mock('../src/screens/AddWalletScreen', () => ({AddWalletScreen: () => null}));
jest.mock('../src/screens/FollowingScreen', () => ({FollowingScreen: () => null}));
jest.mock('../src/screens/WalletDetailScreen', () => ({WalletDetailScreen: () => null}));
jest.mock('../src/screens/WalletEditScreen', () => ({WalletEditScreen: () => null}));
jest.mock('../src/screens/WalletAlertSettingsScreen', () => ({WalletAlertSettingsScreen: () => null}));
jest.mock('../src/screens/ActivityScreen', () => ({ActivityScreen: () => null}));
jest.mock('../src/screens/NotificationHistoryScreen', () => ({NotificationHistoryScreen: () => null}));
jest.mock('../src/screens/SettingsScreen', () => ({SettingsScreen: () => null}));

const wallet: Wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  chainId: 'ethereum-mainnet',
  address: '0x1111111111111111111111111111111111111111',
  label: 'Main',
  status: 'active',
  trackTypes: ['native_transfer'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

it('carries reconciled Add state into the list and clears deleted selection', async () => {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AppNavigator />);
  });

  act(() => renderer!.root.findByType(FollowingScreen).props.onAddWallet());
  act(() => renderer!.root.findByType(AddWalletScreen).props.onSaved(
    wallet,
    'Monitoring needs attention',
    [wallet],
  ));
  const following = renderer!.root.findByType(FollowingScreen);
  expect(following.props.initialWallets).toEqual([wallet]);
  expect(following.props.syncNotice).toBe('Monitoring needs attention');

  act(() => following.props.onSelectWallet(wallet));
  act(() => renderer!.root.findByType(WalletDetailScreen).props.onEdit());
  act(() => renderer!.root.findByType(WalletEditScreen).props.onDeleted(
    wallet.id,
    'Monitoring needs attention',
    [],
  ));

  expect(renderer!.root.findAllByType(WalletDetailScreen)).toHaveLength(0);
  expect(renderer!.root.findAllByType(WalletEditScreen)).toHaveLength(0);
  expect(renderer!.root.findByType(FollowingScreen).props.initialWallets).toEqual([]);
  expect(renderer!.root.findByType(FollowingScreen).props.syncNotice).toBe('Monitoring needs attention');
  act(() => renderer!.unmount());
});

it('keeps Edit navigation on detail with the refreshed wallet', async () => {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AppNavigator />);
  });
  act(() => renderer!.root.findByType(FollowingScreen).props.onSelectWallet(wallet));
  act(() => renderer!.root.findByType(WalletDetailScreen).props.onEdit());
  const updated = {...wallet, label: 'Renamed'};
  act(() => renderer!.root.findByType(WalletEditScreen).props.onSaved(
    updated,
    'Monitoring needs attention',
    [updated],
  ));
  expect(renderer!.root.findByType(WalletDetailScreen).props.wallet).toEqual(updated);
  expect(renderer!.root.findByType(WalletDetailScreen).props.syncNotice)
    .toBe('Monitoring needs attention');
  act(() => renderer!.unmount());
});
