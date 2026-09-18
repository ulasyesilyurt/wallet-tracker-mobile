import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  getWalletEvents,
  isTransactionActivityItem,
  type WalletHistoryItem,
} from '../api/events';
import {EventCard} from '../components/EventCard';
import {EventDetailModal} from '../components/EventDetailModal';
import {TransactionActivityCard} from '../components/TransactionActivityCard';
import {walletDetailColors as colors} from '../theme/walletDetail';
import {WalletSectionHeader, WalletListLoading, WalletListState} from '../components/WalletDetailUI';
import {formatEventDayLabel, getEventDayKey} from '../utils/format';
import {
  resolveEventTarget,
  shouldHandleOpenKey,
} from '../notifications/notificationTarget';

type EventsScreenProps = {
  walletId: string;
  selectedChainId?: string | null;
  targetEventId?: string | null;
  targetOpenKey?: number;
  onTargetConsumed?: (openKey: number) => void;
  networkFilter?: React.ReactNode;
  narrow?: boolean;
  bottomPadding?: number;
};

type EventListItem =
  | {
      type: 'separator';
      key: string;
      label: string;
    }
  | {
      type: 'event';
      key: string;
      event: WalletHistoryItem;
    };

function buildEventListItems(events: WalletHistoryItem[]): EventListItem[] {
  const items: EventListItem[] = [];
  let lastDayKey: string | null = null;

  events.forEach((event) => {
    const dayKey = getEventDayKey(event.occurredAt);

    if (dayKey !== lastDayKey) {
      items.push({
        type: 'separator',
        key: `separator:${dayKey}`,
        label: formatEventDayLabel(event.occurredAt),
      });
      lastDayKey = dayKey;
    }

    items.push({
      type: 'event',
      key: `event:${event.id}`,
      event,
    });
  });

  return items;
}

export function EventsScreen({
  walletId,
  selectedChainId = null,
  targetEventId,
  targetOpenKey,
  onTargetConsumed,
  networkFilter,
  narrow = false,
  bottomPadding = 16,
}: EventsScreenProps) {
  const [events, setEvents] = useState<WalletHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WalletHistoryItem | null>(null);
  const [loadedTargetOpenKey, setLoadedTargetOpenKey] = useState<number | null>(null);
  const handledTargetOpenKeyRef = useRef<number | null>(null);
  const attemptedTargetOpenKeyRef = useRef<number | null>(null);
  const initialTargetOpenKeyRef = useRef(targetOpenKey ?? null);
  const latestRequestIdRef = useRef(0);

  const loadEvents = useCallback(async (
    isRefresh = false,
    requestTargetOpenKey: number | null = null,
  ) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    attemptedTargetOpenKeyRef.current = requestTargetOpenKey;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextEvents = await getWalletEvents(walletId);

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setEvents(nextEvents);
      setLoadedTargetOpenKey(requestTargetOpenKey);
      setError(null);
    } catch (loadError) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Could not load events');
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [walletId]);

  useEffect(() => {
    loadEvents(false, initialTargetOpenKeyRef.current);
  }, [loadEvents]);

  useEffect(() => {
    if (
      targetOpenKey == null ||
      attemptedTargetOpenKeyRef.current === targetOpenKey
    ) {
      return;
    }

    loadEvents(false, targetOpenKey);
  }, [loadEvents, targetOpenKey]);

  useEffect(() => {
    if (!shouldHandleOpenKey(handledTargetOpenKeyRef.current, targetOpenKey)) {
      return;
    }

    const resolution = resolveEventTarget({
      events,
      targetEventId,
      loading,
      loadFailed: error != null,
      targetLoadComplete: loadedTargetOpenKey === targetOpenKey,
    });

    if (resolution.status === 'none' || resolution.status === 'pending') {
      return;
    }

    handledTargetOpenKeyRef.current = targetOpenKey ?? null;

    if (resolution.status === 'found') {
      setSelectedEvent(resolution.event);
    }

    if (targetOpenKey != null) {
      onTargetConsumed?.(targetOpenKey);
    }
  }, [
    error,
    events,
    loadedTargetOpenKey,
    loading,
    onTargetConsumed,
    targetEventId,
    targetOpenKey,
  ]);

  if (loading) {
    return <View style={styles.tabContent}><WalletSectionHeader label="History" networkFilter={networkFilter} narrow={narrow} />
      <WalletListLoading label="Loading history" narrow={narrow} /></View>;
  }
  if (error) {
    return <View style={styles.tabContent}><WalletSectionHeader label="History" networkFilter={networkFilter} narrow={narrow} />
      <WalletListState title="Could not load history" body={error} onRetry={() => loadEvents(false, targetOpenKey ?? null)} /></View>;
  }

  const filteredEvents = selectedChainId
    ? events.filter((event) => event.chainId === selectedChainId)
    : events;
  const listItems = buildEventListItems(filteredEvents);
  const firstDate = listItems[0]?.type === 'separator' ? listItems[0].label : 'History';
  const displayedItems = listItems[0]?.type === 'separator' ? listItems.slice(1) : listItems;

  const renderItem: ListRenderItem<EventListItem> = ({item}) => {
    if (item.type === 'separator') {
      return <WalletSectionHeader label={item.label} narrow={narrow} />;
    }

    if (isTransactionActivityItem(item.event)) {
      return (
        <TransactionActivityCard
          activity={item.event}
          walletDetail narrow={narrow}
          onPress={() => setSelectedEvent(item.event)}
        />
      );
    }

    return <EventCard event={item.event} walletDetail narrow={narrow} onPress={() => setSelectedEvent(item.event)} />;
  };

  return (
    <>
      <FlatList
        data={displayedItems}
        keyExtractor={item => item.key}
        contentContainerStyle={[filteredEvents.length === 0 && styles.emptyListContent, {paddingBottom: bottomPadding}]}
        ListHeaderComponent={<WalletSectionHeader label={firstDate} networkFilter={networkFilter} narrow={narrow} />}
        ListHeaderComponentStyle={styles.listHeader}
        removeClippedSubviews={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              loadEvents(true, targetOpenKey ?? null);
            }}
            tintColor={colors.accent}
          />
        }
        renderItem={renderItem}
        ListEmptyComponent={<WalletListState title="No history yet" body="Wallet activity will appear here once events are available." />}
        showsVerticalScrollIndicator={false}
      />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  listHeader: {zIndex: 10}, tabContent: {flex: 1}, emptyListContent: {flexGrow: 1}, separator: {height: 8},
});
