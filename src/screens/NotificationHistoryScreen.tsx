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
import {colors} from '../theme/colors';
import {formatActivityAmount} from '../utils/format';
import {formatChainDisplayName, getChainBadgeTheme} from '../utils/chains';

type NotificationHistoryScreenProps = {
  onBack: () => void;
  onOpenWalletHistory: (walletId: string) => void;
};

function formatNotificationTimestamp(item: NotificationHistoryItem) {
  const timestamp = item.sentAt ?? item.createdAt;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatEventType(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function formatDirection(value: string | null) {
  if (value === 'incoming') {
    return 'Received';
  }

  if (value === 'outgoing') {
    return 'Sent';
  }

  return 'Activity';
}

function formatStatusLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function NotificationHistoryCard({
  item,
  onPress,
}: {
  item: NotificationHistoryItem;
  onPress: () => void;
}) {
  const walletTitle = item.walletEvent.walletLabel || item.walletEvent.walletAddress || 'Tracked wallet';
  const amountLabel = formatActivityAmount(
    item.walletEvent.amount,
    item.walletEvent.assetSymbol,
    null,
  );
  const directionLabel = formatDirection(item.walletEvent.direction);
  const eventTypeLabel = formatEventType(item.walletEvent.eventType);
  const statusLabel = formatStatusLabel(item.status);
  const statusStyle =
    item.status === 'failed'
      ? styles.statusFailed
      : item.status === 'pending'
        ? styles.statusPending
        : styles.statusDelivered;
  const chainTheme = getChainBadgeTheme(item.walletEvent.chainId);
  const chainLabel = formatChainDisplayName(item.walletEvent.chainId).toUpperCase();
  const timeLabel = formatNotificationTimestamp(item);
  const statusTimePrefix =
    item.status === 'failed'
      ? 'Failed'
      : item.status === 'pending'
        ? 'Queued'
        : 'Delivered';

  return (
    <Pressable style={({pressed}) => [styles.notificationCard, pressed ? styles.notificationCardPressed : null]} onPress={onPress}>
      <View style={styles.notificationTopRow}>
        <View style={styles.notificationIdentity}>
          <Text style={styles.notificationWalletTitle} numberOfLines={1}>
            {walletTitle}
          </Text>
          <Text style={styles.notificationMetaLine} numberOfLines={1}>
            {directionLabel} · {eventTypeLabel}
          </Text>
        </View>
        <View style={[styles.statusBadge, statusStyle]}>
          <Text style={[styles.statusBadgeText, item.status === 'failed' ? styles.statusBadgeTextFailed : null]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.notificationAmount} numberOfLines={1}>
        {amountLabel}
      </Text>

      <View style={styles.notificationBottomRow}>
        <View style={styles.notificationBottomLeft}>
          <View
            style={[
              styles.chainPill,
              {
                backgroundColor: chainTheme.backgroundColor,
                borderColor: chainTheme.borderColor,
              },
            ]}>
            <Text style={[styles.chainPillText, {color: chainTheme.textColor}]}>
              {chainLabel}
            </Text>
          </View>
          <Text style={styles.notificationTimestamp} numberOfLines={1}>
            {statusTimePrefix} {timeLabel}
          </Text>
        </View>
      </View>

      {item.errorMessage ? (
        <Text style={styles.notificationError} numberOfLines={2}>
          {item.errorMessage}
        </Text>
      ) : null}
    </Pressable>
  );
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
              Recent wallet alerts sent to your device are saved here, even if you missed the push.
            </Text>
          </View>
        ) : null
      }
      renderItem={({item}) => (
        <NotificationHistoryCard
          item={item}
          onPress={() => onOpenWalletHistory(item.walletEvent.walletId)}
        />
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
  notificationCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 10,
  },
  notificationCardPressed: {
    opacity: 0.96,
    transform: [{scale: 0.995}],
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationIdentity: {
    flex: 1,
    minWidth: 0,
  },
  notificationWalletTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notificationMetaLine: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusDelivered: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
  },
  statusFailed: {
    backgroundColor: 'rgba(242, 84, 91, 0.12)',
    borderColor: 'rgba(242, 84, 91, 0.28)',
  },
  statusPending: {
    backgroundColor: 'rgba(94, 142, 245, 0.12)',
    borderColor: 'rgba(94, 142, 245, 0.28)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBadgeTextFailed: {
    color: colors.negative,
  },
  notificationAmount: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  notificationBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  notificationBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  chainPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chainPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: colors.textTertiary,
    flexShrink: 1,
  },
  notificationError: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
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
