import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getNotificationHistory, type NotificationHistoryItem} from '../api/notifications';
import {EventCard} from '../components/EventCard';
import {colors} from '../theme/colors';
import type {WalletEvent} from '../api/events';

type NotificationHistoryScreenProps = {
  onBack: () => void;
  onOpenWalletHistory: (walletId: string) => void;
};

function mapNotificationToEvent(item: NotificationHistoryItem): WalletEvent {
  return {
    id: item.walletEvent.id,
    walletId: item.walletEvent.walletId,
    walletLabel: item.walletEvent.walletLabel,
    walletAddress: item.walletEvent.walletAddress,
    chainId: item.walletEvent.chainId,
    transactionHash: item.walletEvent.transactionHash,
    eventType: item.walletEvent.eventType,
    assetSymbol: item.walletEvent.assetSymbol,
    amount: item.walletEvent.amount,
    direction: item.walletEvent.direction,
    occurredAt: item.walletEvent.occurredAt,
    createdAt: item.walletEvent.createdAt,
    fromAddress: item.walletEvent.fromAddress,
    toAddress: item.walletEvent.toAddress,
  };
}

export function NotificationHistoryScreen({
  onBack,
  onOpenWalletHistory,
}: NotificationHistoryScreenProps) {
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getNotificationHistory();
      setItems(result.items);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.stateText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Could not load notifications</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadNotifications()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Back</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNotifications(true)}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Notification history</Text>
              <Text style={styles.summaryBody}>
                Recent wallet alerts are saved here even if you missed the system push.
              </Text>
            </View>
          ) : null
        }
        renderItem={({item}) => (
          <Pressable
            style={styles.notificationRow}
            onPress={() => onOpenWalletHistory(item.walletEvent.walletId)}>
            <EventCard event={mapNotificationToEvent(item)} />
            <View style={styles.statusRow}>
              <Text
                style={[
                  styles.statusText,
                  item.status === 'failed' ? styles.statusFailed : styles.statusDelivered,
                ]}>
                {item.status}
              </Text>
              {item.errorMessage ? (
                <Text style={styles.errorMessage} numberOfLines={1}>
                  {item.errorMessage}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No notification history yet</Text>
            <Text style={styles.stateText}>
              Delivered wallet alerts will appear here once notifications are sent.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  headerRow: {
    marginBottom: 12,
  },
  headerButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  notificationRow: {
    marginBottom: 10,
  },
  statusRow: {
    marginTop: -2,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusDelivered: {
    color: colors.textSecondary,
  },
  statusFailed: {
    color: colors.negative,
  },
  errorMessage: {
    flex: 1,
    fontSize: 12,
    color: colors.textTertiary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorText: {
    marginTop: 10,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: colors.primaryCtaFill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: colors.primaryCtaText,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
