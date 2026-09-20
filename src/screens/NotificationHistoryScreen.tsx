import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaScreen } from '../components/SafeAreaScreen';
import { AlertHistoryRow } from '../components/AlertHistoryRow';
import {
  WalletIconButton,
  WalletListState,
} from '../components/WalletDetailUI';
import {
  getNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationHistoryItem,
} from '../api/notifications';
import { alertsColors as colors, getAlertsLayout } from '../theme/alerts';
import {
  filterNotificationHistory,
  getNotificationFilterOptions,
  groupNotificationHistory,
  hasUnreadCriticalNotification,
  isNotificationWithinDays,
  type NotificationHistoryFilter,
  type NotificationHistorySection,
} from '../utils/notificationHistoryPresentation';

type NotificationHistoryScreenProps = {
  onBack?: () => void;
  onOpenWalletHistory: (walletId: string) => void;
  unreadCount?: number | null;
  onUnreadCountRefresh?: () => void | Promise<void>;
};

export function NotificationHistoryScreen({
  onBack,
  onOpenWalletHistory,
  unreadCount,
  onUnreadCountRefresh,
}: NotificationHistoryScreenProps) {
  const { width } = useWindowDimensions();
  const layout = getAlertsLayout(width);
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [activeFilter, setActiveFilter] =
    useState<NotificationHistoryFilter>('all');
  const loadingMoreRef = useRef(false);
  const initialFilterAppliedRef = useRef(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await getNotificationHistory(50, 0);
      setItems(result.items);
      setPagination(result.pagination);
      setError(null);
      setPaginationError(null);
      if (!initialFilterAppliedRef.current) {
        setActiveFilter(
          hasUnreadCriticalNotification(result.items) ? 'critical' : 'all',
        );
        initialFilterAppliedRef.current = true;
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load notifications',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !pagination.hasMore) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const result = await getNotificationHistory(
        pagination.limit,
        pagination.offset + pagination.limit,
      );
      // Notification history is delivery-based. Keep every record returned by
      // the API, including multiple deliveries for the same wallet event.
      setItems(current => [...current, ...result.items]);
      setPagination(result.pagination);
    } catch (loadError) {
      setPaginationError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load more alerts',
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [pagination]);

  useEffect(() => {
    void loadNotifications();
    void onUnreadCountRefresh?.();
  }, [loadNotifications, onUnreadCountRefresh]);

  const recentCount = useMemo(
    () => items.filter(item => isNotificationWithinDays(item, 7)).length,
    [items],
  );
  const quiet = !loading && recentCount === 0;
  const filterOptions = useMemo(
    () => getNotificationFilterOptions(items),
    [items],
  );
  const filteredItems = useMemo(
    () => filterNotificationHistory(items, quiet ? 'all' : activeFilter),
    [activeFilter, items, quiet],
  );
  const sections = useMemo(
    () => groupNotificationHistory(filteredItems, quiet),
    [filteredItems, quiet],
  );
  const summary = loading
    ? 'Loading recent alerts'
    : error
    ? 'Alerts unavailable'
    : quiet
    ? 'Nothing new · all caught up'
    : `${recentCount} ${recentCount === 1 ? 'alert' : 'alerts'} in 7 days`;
  const unreadLoadedCount = items.filter(item => !item.isRead).length;
  const hasUnreadToMark = (unreadCount ?? unreadLoadedCount) > 0;

  useEffect(() => {
    if (!filterOptions.some(option => option.id === activeFilter)) {
      setActiveFilter('all');
    }
  }, [activeFilter, filterOptions]);

  async function handleOpenNotification(item: NotificationHistoryItem) {
    onOpenWalletHistory(item.walletId);
    if (item.isRead) return;

    const optimisticReadAt = new Date().toISOString();
    setMutationError(null);
    setItems(current =>
      current.map(candidate =>
        candidate.id === item.id
          ? { ...candidate, isRead: true, readAt: optimisticReadAt }
          : candidate,
      ),
    );

    try {
      const result = await markNotificationRead(item.id);
      setItems(current =>
        current.map(candidate =>
          candidate.id === item.id
            ? { ...candidate, isRead: true, readAt: result.readAt }
            : candidate,
        ),
      );
      await onUnreadCountRefresh?.();
    } catch (markError) {
      setItems(current =>
        current.map(candidate =>
          candidate.id === item.id && candidate.readAt === optimisticReadAt
            ? { ...candidate, isRead: false, readAt: null }
            : candidate,
        ),
      );
      setMutationError(
        markError instanceof Error
          ? markError.message
          : 'Could not mark alert read',
      );
    }
  }

  async function handleMarkAllRead() {
    if (markingAllRead || !hasUnreadToMark) return;

    setMarkingAllRead(true);
    setMutationError(null);
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems(current =>
        current.map(item =>
          item.isRead ? item : { ...item, isRead: true, readAt },
        ),
      );
      await onUnreadCountRefresh?.();
    } catch (markError) {
      setMutationError(
        markError instanceof Error
          ? markError.message
          : 'Could not mark all alerts read',
      );
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <SafeAreaScreen
      style={[styles.screen, { paddingHorizontal: layout.gutter }]}
    >
      <View style={[styles.header, { paddingBottom: layout.headerBottom }]}>
        <View style={styles.titleRow}>
          {onBack ? (
            <WalletIconButton
              name="chevron-back"
              label="Back"
              narrow={layout.narrow}
              onPress={onBack}
            />
          ) : null}
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.title, { fontSize: layout.titleSize }]}
          >
            {'Alerts'}
          </Text>
          <View style={styles.headerSpacer} />
          {!quiet && hasUnreadToMark ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all alerts read"
              disabled={markingAllRead}
              onPress={() => void handleMarkAllRead()}
              style={({ pressed }) => [
                styles.markAllButton,
                pressed && styles.markAllPressed,
              ]}
            >
              <Text style={styles.markAllText}>
                {markingAllRead ? 'Marking…' : 'Mark all read'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={[styles.summaryRow, onBack && styles.summaryWithBack]}>
          <View style={[styles.summaryDot, quiet && styles.quietDot]} />
          <Text style={[styles.summary, { fontSize: layout.summarySize }]}>
            {summary}
          </Text>
        </View>
      </View>

      {!loading && recentCount > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filterOptions.map(option => {
            const selected = activeFilter === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.label} alerts, ${option.count}`}
                onPress={() => setActiveFilter(option.id)}
                style={({ pressed }) => [
                  styles.filterTarget,
                  selected && styles.filterTargetSelected,
                  pressed && styles.filterPressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.filterCount,
                    selected && styles.filterCountSelected,
                  ]}
                >
                  {option.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {mutationError ? (
        <Text accessibilityRole="alert" style={styles.inlineError}>
          {mutationError}
        </Text>
      ) : null}

      {error && items.length > 0 ? (
        <View style={styles.cachedError}>
          <Text numberOfLines={1} style={styles.cachedErrorText}>
            Showing loaded alerts · {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => void loadNotifications(true)}
          >
            <Text style={styles.cachedRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <AlertsLoading
          rowHeight={layout.rowHeight}
          rowRadius={layout.rowRadius}
        />
      ) : error && items.length === 0 ? (
        <WalletListState
          title="Could not load alerts"
          body={error}
          onRetry={() => void loadNotifications()}
        />
      ) : (
        <SectionList<NotificationHistoryItem, NotificationHistorySection>
          sections={sections}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 && styles.grow,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadNotifications(true)}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={quiet ? <CoverageCard /> : null}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                section.title === 'Earlier' &&
                  quiet &&
                  styles.earlierAfterCoverage,
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  layout.narrow && styles.sectionTitleNarrow,
                ]}
              >
                {section.title}
              </Text>
              {section.meta ? (
                <Text style={styles.sectionMeta}>{section.meta}</Text>
              ) : null}
            </View>
          )}
          renderItem={({ item }) => (
            <AlertHistoryRow
              item={item}
              width={width}
              onPress={() => void handleOpenNotification(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => (
            <View style={styles.sectionSeparator} />
          )}
          ListEmptyComponent={
            !quiet && activeFilter !== 'all' ? (
              <FilteredEmptyState filter={activeFilter} />
            ) : null
          }
          ListFooterComponent={
            loadingMore || paginationError ? (
              <PaginationFooter
                loading={loadingMore}
                error={paginationError}
                onRetry={() => void loadMore()}
              />
            ) : null
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaScreen>
  );
}

function AlertsLoading({
  rowHeight,
  rowRadius,
}: {
  rowHeight: number;
  rowRadius: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading alerts"
      style={styles.loading}
    >
      {[0, 1, 2].map(index => (
        <View
          key={index}
          style={[
            styles.skeletonRow,
            { height: rowHeight, borderRadius: rowRadius },
          ]}
        >
          <View style={styles.skeletonTile} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonFact} />
            <View style={styles.skeletonBadges} />
          </View>
        </View>
      ))}
    </View>
  );
}

function CoverageCard() {
  return (
    <View style={styles.coverageCard}>
      <View style={styles.coverageHead}>
        <View style={styles.coverageTile}>
          <Text style={styles.coverageGlyph}>✓</Text>
        </View>
        <View style={styles.coverageBody}>
          <Text style={styles.coverageTitle}>All quiet</Text>
          <Text style={styles.coverageSubtitle}>
            No alerts in the last 7 days
          </Text>
        </View>
      </View>
    </View>
  );
}

function FilteredEmptyState({ filter }: { filter: NotificationHistoryFilter }) {
  const label =
    filter === 'critical'
      ? 'critical'
      : filter === 'warning'
      ? 'warning'
      : 'movement';
  return (
    <View style={styles.filteredEmpty}>
      <Text style={styles.filteredEmptyTitle}>No {label} alerts</Text>
      <Text style={styles.filteredEmptyBody}>
        No loaded alerts match this filter.
      </Text>
    </View>
  );
}

function PaginationFooter({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
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
      <Text numberOfLines={1} style={styles.paginationError}>
        {error}
      </Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onRetry}>
        <Text style={styles.paginationRetry}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 4 },
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerSpacer: { flex: 1 },
  title: {
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.75,
    color: colors.textPrimary,
  },
  summaryWithBack: { marginLeft: 54 },
  summaryRow: {
    marginTop: 3,
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  quietDot: { backgroundColor: colors.positive },
  summary: { fontWeight: '500', color: colors.textSecondary },
  markAllButton: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllPressed: { opacity: 0.65 },
  markAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filters: {
    minHeight: 52,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 8,
  },
  filterTarget: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTargetSelected: {
    backgroundColor: colors.elevated,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  filterPressed: { opacity: 0.7 },
  filterText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextSelected: { color: colors.textPrimary },
  filterCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textTertiary,
    backgroundColor: colors.neutralTint,
    fontVariant: ['tabular-nums'],
  },
  filterCountSelected: { color: colors.textSecondary },
  inlineError: {
    minHeight: 28,
    paddingHorizontal: 2,
    paddingBottom: 8,
    fontSize: 12,
    color: colors.negative,
  },
  cachedError: {
    minHeight: 40,
    paddingHorizontal: 2,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cachedErrorText: {
    flex: 1,
    fontSize: 12,
    color: colors.textTertiary,
  },
  cachedRetry: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  listContent: { paddingBottom: 8 },
  grow: { flexGrow: 1 },
  sectionHeader: {
    height: 28,
    paddingBottom: 10,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  earlierAfterCoverage: { height: 50, paddingTop: 22 },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitleNarrow: { fontSize: 13 },
  sectionMeta: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  separator: { height: 8 },
  sectionSeparator: { height: 4 },
  filteredEmpty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  filteredEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  filteredEmptyBody: {
    marginTop: 6,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  paginationFooter: {
    minHeight: 52,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  paginationError: {
    maxWidth: '75%',
    fontSize: 12,
    color: colors.textTertiary,
  },
  paginationRetry: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  loading: { gap: 8 },
  skeletonRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.neutralTint,
  },
  skeletonBody: { flex: 1, gap: 7 },
  skeletonTitle: {
    width: '72%',
    height: 15,
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
  skeletonFact: {
    width: '88%',
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
  skeletonBadges: {
    width: '58%',
    height: 18,
    borderRadius: 5,
    backgroundColor: colors.neutralTint,
  },
  coverageCard: {
    backgroundColor: colors.elevated,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(53,200,142,0.16)',
  },
  coverageHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  coverageTile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(53,200,142,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverageGlyph: { fontSize: 17, fontWeight: '700', color: colors.positive },
  coverageBody: { flex: 1, minWidth: 0 },
  coverageTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.42,
    color: colors.textPrimary,
  },
  coverageSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
