import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getWalletEvents,
  isTransactionActivityItem,
  type WalletHistoryItem,
  type WalletEventsPagination,
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

const PAGE_SIZE = 50;
const FILTER_AUTO_FILL_MINIMUM = 8;
const MAX_FILTER_AUTO_LOADS = 4;

function appendUniqueEvents(
  current: WalletHistoryItem[],
  incoming: WalletHistoryItem[],
) {
  const knownIds = new Set(current.map(event => event.id));
  const uniqueIncoming = incoming.filter(event => {
    if (knownIds.has(event.id)) {
      return false;
    }

    knownIds.add(event.id);
    return true;
  });

  return [...current, ...uniqueIncoming];
}

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

function EventItemSeparator() {
  return <View style={styles.separator} />;
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
  const [pagination, setPagination] = useState<WalletEventsPagination>({
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WalletHistoryItem | null>(null);
  const [loadedTargetOpenKey, setLoadedTargetOpenKey] = useState<number | null>(null);
  const handledTargetOpenKeyRef = useRef<number | null>(null);
  const attemptedTargetOpenKeyRef = useRef<number | null>(null);
  const initialTargetOpenKeyRef = useRef(targetOpenKey ?? null);
  const latestRequestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const replacingEventsRef = useRef(false);
  const filterAutoLoadCountRef = useRef(0);

  const loadEvents = useCallback(async (
    isRefresh = false,
    requestTargetOpenKey: number | null = null,
  ) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    attemptedTargetOpenKeyRef.current = requestTargetOpenKey;
    replacingEventsRef.current = true;
    loadingMoreRef.current = false;
    setLoadingMore(false);

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getWalletEvents(walletId, PAGE_SIZE, 0);

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setEvents(result.items);
      setPagination(result.pagination);
      setLoadedTargetOpenKey(requestTargetOpenKey);
      setError(null);
      setPaginationError(null);
      filterAutoLoadCountRef.current = 0;
    } catch (loadError) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Could not load events');
    } finally {
      if (latestRequestIdRef.current === requestId) {
        replacingEventsRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [walletId]);

  const loadMore = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      replacingEventsRef.current ||
      !pagination.hasMore
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setPaginationError(null);
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    try {
      const result = await getWalletEvents(
        walletId,
        pagination.limit,
        pagination.offset + pagination.limit,
      );

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setEvents(current => appendUniqueEvents(current, result.items));
      setPagination(result.pagination);
    } catch (loadError) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setPaginationError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load more history',
      );
    } finally {
      loadingMoreRef.current = false;
      if (latestRequestIdRef.current === requestId) {
        setLoadingMore(false);
      }
    }
  }, [pagination, walletId]);

  useEffect(() => {
    loadEvents(false, initialTargetOpenKeyRef.current);
  }, [loadEvents]);

  useEffect(() => {
    filterAutoLoadCountRef.current = 0;
  }, [selectedChainId, walletId]);

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

  const filteredEvents = selectedChainId
    ? events.filter((event) => event.chainId === selectedChainId)
    : events;

  useEffect(() => {
    if (
      !selectedChainId ||
      loading ||
      refreshing ||
      error ||
      loadingMore ||
      paginationError ||
      !pagination.hasMore ||
      filteredEvents.length >= FILTER_AUTO_FILL_MINIMUM ||
      filterAutoLoadCountRef.current >= MAX_FILTER_AUTO_LOADS
    ) {
      return;
    }

    filterAutoLoadCountRef.current += 1;
    loadMore();
  }, [
    error,
    filteredEvents.length,
    loadMore,
    loading,
    loadingMore,
    pagination.hasMore,
    paginationError,
    refreshing,
    selectedChainId,
  ]);

  if (loading) {
    return <View style={styles.tabContent}><WalletSectionHeader label="History" networkFilter={networkFilter} narrow={narrow} />
      <WalletListLoading label="Loading history" narrow={narrow} /></View>;
  }
  if (error) {
    return <View style={styles.tabContent}><WalletSectionHeader label="History" networkFilter={networkFilter} narrow={narrow} />
      <WalletListState title="Could not load history" body={error} onRetry={() => loadEvents(false, targetOpenKey ?? null)} /></View>;
  }

  const listItems = buildEventListItems(filteredEvents);
  const firstDate = listItems[0]?.type === 'separator' ? listItems[0].label : 'History';
  const displayedItems = listItems[0]?.type === 'separator' ? listItems.slice(1) : listItems;
  const filteredSearchPaused =
    selectedChainId != null &&
    filteredEvents.length < FILTER_AUTO_FILL_MINIMUM &&
    pagination.hasMore &&
    filterAutoLoadCountRef.current >= MAX_FILTER_AUTO_LOADS;

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
        ItemSeparatorComponent={EventItemSeparator}
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
        ListFooterComponent={
          pagination.hasMore && (loadingMore || paginationError || filteredSearchPaused) ? (
            <HistoryPaginationFooter
              loading={loadingMore}
              message={paginationError ?? 'Older matching history may still be available'}
              actionLabel={paginationError ? 'Retry' : 'Load older'}
              onRetry={() => loadMore()}
            />
          ) : null
        }
        onEndReached={() => loadMore()}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
      />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}

function HistoryPaginationFooter({
  loading,
  message,
  actionLabel,
  onRetry,
}: {
  loading: boolean;
  message: string | null;
  actionLabel: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View accessibilityRole="progressbar" style={styles.paginationFooter}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.paginationFooter}>
      <Text numberOfLines={1} style={styles.paginationError}>{message}</Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onRetry}>
        <Text style={styles.paginationRetry}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: {zIndex: 10},
  tabContent: {flex: 1},
  emptyListContent: {flexGrow: 1},
  separator: {height: 8},
  paginationFooter: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  paginationError: {fontSize: 12, color: colors.textTertiary},
  paginationRetry: {fontSize: 12, fontWeight: '700', color: colors.accent},
});
