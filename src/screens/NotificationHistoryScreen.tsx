import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
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
  type NotificationHistoryItem,
} from '../api/notifications';
import { alertsColors as colors, getAlertsLayout } from '../theme/alerts';
import {
  groupNotificationHistory,
  isNotificationWithinDays,
  type NotificationHistorySection,
} from '../utils/notificationHistoryPresentation';

type NotificationHistoryScreenProps = {
  onBack?: () => void;
  onOpenWalletHistory: (walletId: string) => void;
};

export function NotificationHistoryScreen({
  onBack,
  onOpenWalletHistory,
}: NotificationHistoryScreenProps) {
  const { width } = useWindowDimensions();
  const layout = getAlertsLayout(width);
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await getNotificationHistory();
      setItems(result.items);
      setError(null);
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
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const recentCount = useMemo(
    () => items.filter(item => isNotificationWithinDays(item, 7)).length,
    [items],
  );
  const quiet = !loading && error == null && recentCount === 0;
  const sections = useMemo(
    () => groupNotificationHistory(items, quiet),
    [items, quiet],
  );
  const summary = loading
    ? 'Loading recent alerts'
    : error
    ? 'Alerts unavailable'
    : quiet
    ? 'Nothing new · all caught up'
    : `${recentCount} ${recentCount === 1 ? 'alert' : 'alerts'} in 7 days`;

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
        </View>
        <View style={[styles.summaryRow, onBack && styles.summaryWithBack]}>
          <View style={[styles.summaryDot, quiet && styles.quietDot]} />
          <Text style={[styles.summary, { fontSize: layout.summarySize }]}>
            {summary}
          </Text>
        </View>
      </View>

      {loading ? (
        <AlertsLoading
          rowHeight={layout.rowHeight}
          rowRadius={layout.rowRadius}
        />
      ) : error ? (
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
              onPress={() => onOpenWalletHistory(item.walletEvent.walletId)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => (
            <View style={styles.sectionSeparator} />
          )}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 4 },
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
  listContent: { paddingBottom: 8 },
  grow: { flexGrow: 1 },
  sectionHeader: {
    height: 28,
    paddingHorizontal: 2,
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
