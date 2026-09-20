import type { FloatingTabDefinition } from '../components/FloatingTabBar';

export type TabId = 'wallets' | 'activity' | 'alerts' | 'settings';

export const APP_TABS: readonly FloatingTabDefinition<TabId>[] = [
  { id: 'wallets', label: 'Wallets', iconName: 'wallet-outline' },
  { id: 'activity', label: 'Activity', iconName: 'analytics-outline' },
  { id: 'alerts', label: 'Alerts', iconName: 'diamond-outline' },
  { id: 'settings', label: 'Settings', iconName: 'settings-outline' },
];
