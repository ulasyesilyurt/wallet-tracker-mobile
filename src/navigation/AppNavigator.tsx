import React, {useCallback, useEffect, useRef, useState} from 'react';
import messaging, {type FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {getWalletById} from '../api/wallets';
import {useAuth} from '../auth/AuthContext';
import {FollowingScreen} from '../screens/FollowingScreen';
import {AddWalletScreen} from '../screens/AddWalletScreen';
import {WalletDetailScreen, type DetailTab} from '../screens/WalletDetailScreen';
import {WalletEditScreen} from '../screens/WalletEditScreen';
import {WalletAlertSettingsScreen} from '../screens/WalletAlertSettingsScreen';
import {ActivityScreen} from '../screens/ActivityScreen';
import {NotificationHistoryScreen} from '../screens/NotificationHistoryScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {colors} from '../theme/colors';
import type {Wallet} from '../types/wallet';
import {parseNotificationTarget} from '../notifications/notificationTarget';

type Route =
  | 'tabs'
  | 'detail'
  | 'edit'
  | 'alertSettings'
  | 'add'
  | 'notifications';
type TabId = 'wallets' | 'activity' | 'settings';
type NotificationEventTarget = {
  eventId: string | null;
  openKey: number;
};

export function AppNavigator() {
  const {logout} = useAuth();
  const [route, setRoute] = useState<Route>('tabs');
  const [activeTab, setActiveTab] = useState<TabId>('wallets');
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<DetailTab | undefined>(undefined);
  const [notificationEventTarget, setNotificationEventTarget] =
    useState<NotificationEventTarget | null>(null);
  const [followingRefreshKey, setFollowingRefreshKey] = useState(0);
  const initialNotificationHandledRef = useRef(false);
  const notificationOpenKeyRef = useRef(0);

  const consumeNotificationEventTarget = useCallback((openKey: number) => {
    setNotificationEventTarget(currentTarget =>
      currentTarget?.openKey === openKey ? null : currentTarget,
    );
  }, []);

  useEffect(() => {
    async function openWalletFromNotification(
      message: FirebaseMessagingTypes.RemoteMessage | null,
      source: 'background' | 'initial',
    ) {
      const {walletId, walletEventId} = parseNotificationTarget(message?.data);

      console.log('[notifications] notification opened', {
        source,
        hasWalletId: walletId != null,
        hasWalletEventId: walletEventId != null,
      });

      if (walletId == null) {
        console.log('[notifications] walletId missing in notification payload');
        return;
      }

      const openKey = notificationOpenKeyRef.current + 1;
      notificationOpenKeyRef.current = openKey;
      setNotificationEventTarget(null);

      try {
        const wallet = await getWalletById(walletId);

        console.log('[notifications] resolved wallet for notification', {
          source,
          found: Boolean(wallet),
        });

        if (wallet == null || notificationOpenKeyRef.current !== openKey) {
          return;
        }

        console.log('[notifications] opening wallet detail with History tab', {
          source,
          hasWalletEventId: walletEventId != null,
        });

        setActiveTab('wallets');
        setSelectedWallet(wallet);
        setDetailInitialTab('history');
        setNotificationEventTarget({eventId: walletEventId, openKey});
        setRoute('detail');
      } catch {
        console.log('[notifications] failed to resolve wallet for notification', {
          source,
        });
      }
    }

    const unsubscribeOnMessage = messaging().onMessage(remoteMessage => {
      const target = parseNotificationTarget(remoteMessage.data);

      console.log('[notifications] foreground message received', {
        hasWalletId: target.walletId != null,
        hasWalletEventId: target.walletEventId != null,
      });
    });

    const unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      void openWalletFromNotification(remoteMessage, 'background');
    });

    if (initialNotificationHandledRef.current === false) {
      initialNotificationHandledRef.current = true;

      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          const target = parseNotificationTarget(remoteMessage?.data);

          console.log('[notifications] getInitialNotification resolved', {
            hasNotification: Boolean(remoteMessage),
            hasWalletId: target.walletId != null,
            hasWalletEventId: target.walletEventId != null,
          });

          if (remoteMessage) {
            void openWalletFromNotification(remoteMessage, 'initial');
          }
        })
        .catch(error => {
          console.log('[notifications] getInitialNotification failed', error);
        });
    }

    return () => {
      unsubscribeOnMessage();
      unsubscribeOpened();
    };
  }, []);

  async function handleLogout() {
    console.log('[auth] logout requested from app navigator');
    setSelectedWallet(null);
    setDetailInitialTab(undefined);
    setNotificationEventTarget(null);
    setActiveTab('wallets');
    setRoute('tabs');
    await logout();
  }

  if (route === 'add') {
    return (
      <AddWalletScreen
        onBack={() => setRoute('tabs')}
        onSaved={wallet => {
          setFollowingRefreshKey(current => current + 1);
          setSelectedWallet(wallet);
          setDetailInitialTab(undefined);
          setNotificationEventTarget(null);
          setActiveTab('wallets');
          setRoute('tabs');
        }}
      />
    );
  }

  if (route === 'edit' && selectedWallet) {
    return (
      <WalletEditScreen
        wallet={selectedWallet}
        onBack={() => setRoute('detail')}
        onOpenAlertSettings={() => setRoute('alertSettings')}
        onSaved={updatedWallet => {
          setSelectedWallet(updatedWallet);
          setFollowingRefreshKey(current => current + 1);
          setRoute('detail');
        }}
        onDeleted={() => {
          setSelectedWallet(null);
          setDetailInitialTab(undefined);
          setNotificationEventTarget(null);
          setFollowingRefreshKey(current => current + 1);
          setActiveTab('wallets');
          setRoute('tabs');
        }}
      />
    );
  }

  if (route === 'alertSettings' && selectedWallet) {
    return (
      <WalletAlertSettingsScreen
        wallet={selectedWallet}
        onBack={() => setRoute('edit')}
      />
    );
  }

  if (route === 'detail' && selectedWallet) {
    return (
      <WalletDetailScreen
        wallet={selectedWallet}
        initialTab={detailInitialTab}
        targetEventId={notificationEventTarget?.eventId}
        targetOpenKey={notificationEventTarget?.openKey}
        onTargetConsumed={consumeNotificationEventTarget}
        onBack={() => {
          setSelectedWallet(null);
          setDetailInitialTab(undefined);
          setNotificationEventTarget(null);
          setActiveTab('wallets');
          setRoute('tabs');
        }}
        onEdit={() => setRoute('edit')}
      />
    );
  }

  if (route === 'notifications') {
    return (
      <NotificationHistoryScreen
        onBack={() => setRoute('tabs')}
        onOpenWalletHistory={async walletId => {
          const wallet = await getWalletById(walletId);

          if (!wallet) {
            return;
          }

          setActiveTab('wallets');
          setSelectedWallet(wallet);
          setDetailInitialTab('history');
          setNotificationEventTarget(null);
          setRoute('detail');
        }}
      />
    );
  }

  let tabContent: React.ReactNode = null;

  if (activeTab === 'wallets') {
    tabContent = (
      <FollowingScreen
        refreshKey={followingRefreshKey}
        onAddWallet={() => setRoute('add')}
        onSelectWallet={wallet => {
          setSelectedWallet(wallet);
          setDetailInitialTab(undefined);
          setNotificationEventTarget(null);
          setRoute('detail');
        }}
      />
    );
  } else if (activeTab === 'activity') {
    tabContent = <ActivityScreen />;
  } else {
    tabContent = (
      <SettingsScreen
        onOpenNotificationHistory={() => setRoute('notifications')}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>{tabContent}</View>
      <View style={styles.tabBar}>
        <TabButton
          iconName="wallet-outline"
          label="Wallets"
          active={activeTab === 'wallets'}
          onPress={() => setActiveTab('wallets')}
        />
        <TabButton
          iconName="analytics-outline"
          label="Activity"
          active={activeTab === 'activity'}
          onPress={() => setActiveTab('activity')}
        />
        <TabButton
          iconName="settings-outline"
          label="Settings"
          active={activeTab === 'settings'}
          onPress={() => setActiveTab('settings')}
        />
      </View>
    </View>
  );
}

function TabButton({
  iconName,
  label,
  active,
  onPress,
}: {
  iconName: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabButton, active ? styles.tabButtonActive : null]} onPress={onPress}>
      <Ionicons
        name={iconName}
        size={16}
        color={active ? colors.textPrimary : colors.textSecondary}
        style={styles.tabButtonIcon}
      />
      <Text style={[styles.tabButtonText, active ? styles.tabButtonTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonIcon: {
    marginBottom: 1,
  },
  tabButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
