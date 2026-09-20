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
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { getGlobalActivity } from '../api/activity';
import type { WalletEvent } from '../api/events';
import { ActivityRow } from '../components/ActivityRow';
import { EventDetailModal } from '../components/EventDetailModal';
import { SafeAreaScreen } from '../components/SafeAreaScreen';
import { WalletListState } from '../components/WalletDetailUI';
import { activityColors as colors, getActivityLayout } from '../theme/activity';
import {
  filterActivityEvents,
  getActivityFilterOptions,
  getActivityQuietState,
  getMostRecentActivityLabel,
  groupActivityEvents,
  isActivityWithinDays,
  resolveActivityRow,
  sortActivityChronologically,
  type ActivityFilter,
  type ActivityFilterOption,
  type ActivitySection,
} from '../utils/activityPresentation';

const PAGE_SIZE = 50;

type ActivityScreenProps = {
  onManageWallets?: () => void;
};

export function ActivityScreen({ onManageWallets }: ActivityScreenProps) {
  const { width } = useWindowDimensions();
  const layout = getActivityLayout(width);
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<WalletEvent | null>(null);
  const loadingMoreRef = useRef(false);

  const loadActivity = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getGlobalActivity(PAGE_SIZE, 0);
      setEvents(sortActivityChronologically(result.items));
      setPagination(result.pagination);
      setError(null);
      setPaginationError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load activity',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !pagination.hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const result = await getGlobalActivity(
        pagination.limit,
        pagination.offset + pagination.limit,
      );
      // Activity is event-based. Preserve every API record and its order for
      // equal timestamps; no client-side deduplication is applied.
      setEvents(current =>
        sortActivityChronologically([...current, ...result.items]),
      );
      setPagination(result.pagination);
    } catch (loadError) {
      setPaginationError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load more activity',
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [pagination]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const recentCount = useMemo(
    () => events.filter(event => isActivityWithinDays(event, 7)).length,
    [events],
  );
  const quiet = !loading && !error && getActivityQuietState(events);
  const filterOptions = useMemo(
    () => getActivityFilterOptions(events),
    [events],
  );
  const visibleEvents = useMemo(
    () => filterActivityEvents(events, quiet ? 'all' : activeFilter),
    [activeFilter, events, quiet],
  );
  const sections = useMemo(
    () => groupActivityEvents(events, visibleEvents, quiet),
    [events, quiet, visibleEvents],
  );
  const summary = loading
    ? 'Syncing recent activity'
    : error && events.length === 0
    ? 'Activity unavailable'
    : quiet
    ? 'Live · nothing in 7 days'
    : `Live · ${recentCount} ${
        recentCount === 1 ? 'event' : 'events'
      } in 7 days`;

  return (
    <SafeAreaScreen
      style={[styles.screen, { paddingHorizontal: layout.gutter }]}
    >
      <View style={[styles.header, { paddingBottom: layout.headerBottom }]}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.title, { fontSize: layout.titleSize }]}
        >
          Activity
        </Text>
        <View style={styles.stateLine}>
          <View
            style={[
              styles.stateDot,
              quiet && styles.quietDot,
              error && styles.errorDot,
            ]}
          />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.stateText, { fontSize: layout.stateSize }]}
          >
            {summary}
          </Text>
        </View>
      </View>

      {!loading && !quiet && events.length > 0 ? (
        <ActivityFilterStrip
          activeFilter={activeFilter}
          options={filterOptions}
          width={width}
          onChange={setActiveFilter}
        />
      ) : null}

      {error && events.length > 0 ? (
        <View style={styles.cachedError}>
          <Text numberOfLines={1} style={styles.cachedErrorText}>
            Showing loaded activity · {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry activity refresh"
            hitSlop={10}
            onPress={() => loadActivity(true)}
          >
            <Text style={styles.cachedRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <ActivityLoading width={width} />
      ) : error && events.length === 0 ? (
        <WalletListState
          title="Could not load activity"
          body={error}
          onRetry={() => loadActivity()}
        />
      ) : (
        <View style={styles.listFrame}>
          <SectionList<WalletEvent, ActivitySection>
            style={styles.list}
            sections={sections}
            keyExtractor={(item, index) => `${item.id}:${index}`}
            stickySectionHeadersEnabled
            contentContainerStyle={[
              styles.listContent,
              sections.length === 0 && styles.grow,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadActivity(true)}
                tintColor={colors.accent}
              />
            }
            ListHeaderComponent={
              quiet ? (
                <CoverageCard
                  lastEvent={getMostRecentActivityLabel(events)}
                  onManageWallets={onManageWallets}
                  width={width}
                />
              ) : null
            }
            renderSectionHeader={({ section }) => (
              <ActivitySectionHeader section={section} width={width} />
            )}
            renderItem={({ item, section }) => (
              <ActivityRow
                item={resolveActivityRow(item)}
                width={width}
                dimmed={section.dimmed}
                onPress={() => setSelectedEvent(item)}
              />
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
                  onRetry={() => loadMore()}
                />
              ) : null
            }
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.35}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </SafeAreaScreen>
  );
}

function ActivityFilterStrip({
  activeFilter,
  options,
  width,
  onChange,
}: {
  activeFilter: ActivityFilter;
  options: ActivityFilterOption[];
  width: number;
  onChange: (filter: ActivityFilter) => void;
}) {
  const layout = getActivityLayout(width);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.filters,
        {
          height: layout.filterHeight,
          borderRadius: layout.filterRadius,
          marginBottom: layout.filterBottom,
        },
      ]}
    >
      {options.map(option => {
        const selected = option.id === activeFilter;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label} activity${
              option.count == null ? '' : `, ${option.count}`
            }`}
            hitSlop={4}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.filter,
              { borderRadius: layout.filterItemRadius },
              selected && styles.filterSelected,
              pressed && styles.filterPressed,
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                { fontSize: layout.filterLabelSize },
                selected && styles.filterLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            {option.count != null ? (
              <Text
                style={[
                  styles.filterCount,
                  { fontSize: layout.filterCountSize },
                  selected && styles.filterCountSelected,
                ]}
              >
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function ActivitySectionHeader({
  section,
  width,
}: {
  section: ActivitySection;
  width: number;
}) {
  const layout = getActivityLayout(width);

  return (
    <View
      style={[
        styles.sectionHeader,
        section.key === 'earlier' && styles.earlierHeader,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={[
          styles.sectionTitle,
          layout.narrow && styles.sectionTitleNarrow,
        ]}
      >
        {section.title}
      </Text>
      {section.meta ? (
        <Text maxFontSizeMultiplier={1.2} style={styles.sectionMeta}>
          {section.meta}
        </Text>
      ) : null}
    </View>
  );
}

function CoverageCard({
  lastEvent,
  onManageWallets,
  width,
}: {
  lastEvent: string | null;
  onManageWallets?: () => void;
  width: number;
}) {
  const layout = getActivityLayout(width);

  return (
    <View
      style={[
        styles.coverageCard,
        {
          borderRadius: layout.coverageRadius,
          padding: layout.coveragePadding,
        },
      ]}
    >
      <View
        style={[
          styles.coverageTile,
          {
            width: layout.coverageTile,
            height: layout.coverageTile,
          },
        ]}
      >
        <Text style={styles.coverageGlyph}>✓</Text>
      </View>
      <Text
        maxFontSizeMultiplier={1.2}
        style={[styles.coverageTitle, { fontSize: layout.coverageTitle }]}
      >
        All quiet
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={styles.coverageBody}>
        No wallet activity in the last 7 days.
      </Text>
      {lastEvent ? (
        <View style={styles.coverageFact}>
          <Text style={styles.coverageFactLabel}>Last event</Text>
          <Text style={styles.coverageFactValue}>{lastEvent}</Text>
        </View>
      ) : null}
      {onManageWallets ? (
        <Pressable
          accessibilityRole="button"
          onPress={onManageWallets}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Manage watched wallets</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ActivityLoading({ width }: { width: number }) {
  const layout = getActivityLayout(width);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading activity"
      style={styles.loading}
    >
      {[0, 1, 2, 3, 4].map(index => (
        <View
          key={index}
          style={[styles.skeletonRow, { height: layout.rowHeight }]}
        >
          <View
            style={[
              styles.skeletonTile,
              { width: layout.tileSize, height: layout.tileSize },
            ]}
          />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonFact} />
            <View style={styles.skeletonAttribution} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FilteredEmptyState({ filter }: { filter: ActivityFilter }) {
  const label =
    filter === 'in' ? 'incoming' : filter === 'out' ? 'outgoing' : 'other';
  return (
    <View style={styles.filteredEmpty}>
      <Text style={styles.filteredEmptyText}>
        No {label} activity in the loaded history.
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
  return (
    <View style={styles.paginationFooter}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <>
          <Text numberOfLines={2} style={styles.paginationError}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.paginationRetry,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.paginationRetryText}>Try again</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 11 },
  title: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  stateLine: {
    height: 22,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.positive,
  },
  quietDot: { backgroundColor: colors.textTertiary },
  errorDot: { backgroundColor: colors.negative },
  stateText: { color: colors.textSecondary, fontWeight: '500' },
  filters: {
    padding: 3,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.tabBorder,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  filter: {
    flex: 1,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  filterSelected: { backgroundColor: colors.selected },
  filterPressed: { opacity: 0.72 },
  filterLabel: { color: colors.tabInactive, fontWeight: '700' },
  filterLabelSelected: { color: colors.textPrimary },
  filterCount: {
    color: colors.textTertiary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  filterCountSelected: { color: colors.textSecondary },
  listFrame: { flex: 1, overflow: 'hidden' },
  list: { flex: 1 },
  listContent: { paddingBottom: 12 },
  grow: { flexGrow: 1 },
  sectionHeader: {
    minHeight: 34,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  earlierHeader: { paddingTop: 13 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  sectionTitleNarrow: { fontSize: 13 },
  sectionMeta: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cachedError: {
    minHeight: 36,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(245,85,93,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cachedErrorText: { flex: 1, color: colors.textSecondary, fontSize: 11.5 },
  cachedRetry: { color: colors.textPrimary, fontSize: 11.5, fontWeight: '700' },
  coverageCard: {
    marginTop: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  coverageTile: {
    borderRadius: 14,
    backgroundColor: 'rgba(53,200,142,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverageGlyph: { color: colors.positive, fontSize: 17, fontWeight: '800' },
  coverageTitle: {
    marginTop: 12,
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  coverageBody: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  coverageFact: {
    marginTop: 14,
    width: '100%',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  coverageFactLabel: { color: colors.textTertiary, fontSize: 11.5 },
  coverageFactValue: {
    color: colors.textDim,
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  secondaryButton: {
    minHeight: 44,
    marginTop: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.iconBorder,
    backgroundColor: colors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: { opacity: 0.7 },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  loading: { flex: 1, paddingTop: 3 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  skeletonTile: { borderRadius: 11, backgroundColor: colors.neutralTint },
  skeletonBody: { flex: 1, paddingTop: 1, gap: 6 },
  skeletonTitle: {
    height: 14,
    width: '68%',
    borderRadius: 4,
    backgroundColor: colors.neutralTint,
  },
  skeletonFact: {
    height: 10,
    width: '48%',
    borderRadius: 4,
    backgroundColor: colors.neutralTint,
  },
  skeletonAttribution: {
    height: 11,
    width: '58%',
    borderRadius: 4,
    backgroundColor: colors.neutralTint,
  },
  filteredEmpty: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filteredEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  paginationFooter: {
    minHeight: 60,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paginationError: {
    color: colors.textSecondary,
    fontSize: 11.5,
    textAlign: 'center',
  },
  paginationRetry: {
    minWidth: 88,
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: colors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationRetryText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
