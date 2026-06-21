import React, {useEffect, useRef, useState} from 'react';
import messaging, {type FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {getWalletById} from '../api/wallets';
import {useAuth} from '../auth/AuthContext';
import {FollowingScreen} from '../screens/FollowingScreen';
import {AddWalletScreen} from '../screens/AddWalletScreen';
import {WalletDetailScreen, type DetailTab} from '../screens/WalletDetailScreen';
import {WalletEditScreen} from '../screens/WalletEditScreen';
import {ActivityScreen} from '../screens/ActivityScreen';
import {NotificationHistoryScreen} from '../screens/NotificationHistoryScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {colors} from '../theme/colors';
import type {Wallet} from '../types/wallet';

type Route = 'tabs' | 'detail' | 'edit' | 'add' | 'notifications';
type TabId = 'wallets' | 'activity' | 'settings';

function extractWalletId(message: FirebaseMessagingTypes.RemoteMessage | null): string | null {
  const value = message?.data?.walletId;
  return typeof value === 'string' ? value : null;
}

export function AppNavigator() {
  const {logout} = useAuth();
  const [route, setRoute] = useState<Route>('tabs');
  const [activeTab, setActiveTab] = useState<TabId>('wallets');
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<DetailTab | undefined>(undefined);
  const [followingRefreshKey, setFollowingRefreshKey] = useState(0);
  const initialNotificationHandledRef = useRef(false);

  useEffect(() => {
    async function openWalletFromNotification(
      message: FirebaseMessagingTypes.RemoteMessage | null,
      source: 'background' | 'initial',
    ) {
      const walletId = extractWalletId(message);

      console.log('[notifications] notification opened', {
        source,
        walletId,
        messageId: message?.messageId,
        data: message?.data,
        notification: message?.notification,
      });

      if (walletId == null) {
        console.log('[notifications] walletId missing in notification payload');
        return;
      }

      try {
        const wallet = await getWalletById(walletId);

        console.log('[notifications] resolved wallet for notification', {
          source,
          walletId,
          found: Boolean(wallet),
        });

        if (wallet == null) {
          return;
        }

        console.log('[notifications] opening wallet detail with History tab', {
          source,
          walletId,
        });

        setActiveTab('wallets');
        setSelectedWallet(wallet);
        setDetailInitialTab('history');
        setRoute('detail');
      } catch (error) {
        console.log('[notifications] failed to resolve wallet for notification', {
          source,
          walletId,
          error,
        });
      }
    }

    const unsubscribeOnMessage = messaging().onMessage(remoteMessage => {
      console.log('[notifications] foreground message received', {
        messageId: remoteMessage.messageId,
        data: remoteMessage.data,
        notification: remoteMessage.notification,
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
          console.log('[notifications] getInitialNotification resolved', {
            hasNotification: Boolean(remoteMessage),
            messageId: remoteMessage?.messageId,
            data: remoteMessage?.data,
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
        onSaved={updatedWallet => {
          setSelectedWallet(updatedWallet);
          setFollowingRefreshKey(current => current + 1);
          setRoute('detail');
        }}
        onDeleted={() => {
          setSelectedWallet(null);
          setDetailInitialTab(undefined);
          setFollowingRefreshKey(current => current + 1);
          setActiveTab('wallets');
          setRoute('tabs');
        }}
      />
    );
  }

  if (route === 'detail' && selectedWallet) {
    return (
      <WalletDetailScreen
        wallet={selectedWallet}
        initialTab={detailInitialTab}
        onBack={() => {
          setSelectedWallet(null);
          setDetailInitialTab(undefined);
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
        <TabButton label="Wallets" active={activeTab === 'wallets'} onPress={() => setActiveTab('wallets')} />
        <TabButton label="Activity" active={activeTab === 'activity'} onPress={() => setActiveTab('activity')} />
        <TabButton label="Settings" active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabButton, active ? styles.tabButtonActive : null]} onPress={onPress}>
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
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.elevated,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryCtaFill,
  },
  tabButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: colors.primaryCtaText,
  },
});
