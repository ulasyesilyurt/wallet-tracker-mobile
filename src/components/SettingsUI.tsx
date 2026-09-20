import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { getSettingsLayout, settingsColors as colors } from '../theme/settings';

export function ListSectionHeader({
  title,
  meta,
  first = false,
  compact = false,
}: {
  title: string;
  meta?: string | null;
  first?: boolean;
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const layout = getSettingsLayout(width);

  return (
    <View
      style={[
        styles.sectionHeader,
        compact
          ? layout.narrow
            ? styles.sectionHeaderCompactNarrow
            : styles.sectionHeaderCompact
          : first
          ? styles.sectionHeaderFirst
          : layout.narrow
          ? styles.sectionHeaderNarrow
          : styles.sectionHeaderRegular,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.4}
        style={[styles.sectionTitle, { fontSize: layout.sectionTitleSize }]}
      >
        {title}
      </Text>
      {meta ? (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
          style={[styles.sectionMeta, { fontSize: layout.sectionMetaSize }]}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

type SettingRowBase = {
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
};

type NavigationSettingRow = SettingRowBase & {
  type: 'navigation';
  value?: string | null;
  valueMonospace?: boolean;
  onPress: () => void;
};

type ActionSettingRow = SettingRowBase & {
  type: 'action';
  value?: string | null;
  valueMonospace?: boolean;
  onPress: () => void;
};

type SwitchSettingRow = SettingRowBase & {
  type: 'switch';
  switchValue: boolean;
  onPress?: () => void;
};

export type SettingRowProps =
  | NavigationSettingRow
  | ActionSettingRow
  | SwitchSettingRow;

export function SettingRow(props: SettingRowProps) {
  const { width, fontScale } = useWindowDimensions();
  const layout = getSettingsLayout(width);
  const isSwitch = props.type === 'switch';
  const interactive = props.type !== 'switch' || props.onPress != null;

  return (
    <Pressable
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      accessibilityState={
        isSwitch
          ? { checked: props.switchValue, disabled: props.disabled }
          : { disabled: props.disabled }
      }
      disabled={!interactive}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.row,
        { minHeight: layout.rowMinHeight },
        props.disabled && styles.disabled,
        pressed &&
          !isSwitch &&
          (props.destructive ? styles.destructivePressed : styles.pressed),
      ]}
    >
      <Text
        numberOfLines={fontScale > 1.3 ? 2 : 1}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={1.7}
        style={[
          styles.rowLabel,
          { fontSize: layout.rowLabelSize },
          props.destructive && styles.destructiveLabel,
        ]}
      >
        {props.label}
      </Text>

      {isSwitch ? (
        <View pointerEvents="none" style={styles.switchSlot}>
          <Switch
            disabled={props.disabled}
            value={props.switchValue}
            trackColor={{
              false: 'rgba(255,255,255,0.12)',
              true: colors.positive,
            }}
            thumbColor={props.switchValue ? colors.textPrimary : colors.textDim}
            ios_backgroundColor="rgba(255,255,255,0.12)"
            style={Platform.OS === 'android' ? styles.androidSwitch : undefined}
          />
        </View>
      ) : (
        <View style={styles.rightSlot}>
          {props.value ? (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              style={[
                styles.rowValue,
                {
                  fontSize: props.valueMonospace
                    ? layout.rowMonoSize
                    : layout.rowValueSize,
                },
                props.valueMonospace && styles.monospace,
              ]}
            >
              {props.value}
            </Text>
          ) : null}
          {props.type === 'navigation' ? (
            <Text
              importantForAccessibility="no"
              style={[styles.chevron, { fontSize: layout.chevronSize }]}
            >
              ›
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    height: 29,
    paddingHorizontal: 2,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderFirst: { marginTop: 0 },
  sectionHeaderNarrow: { marginTop: 20 },
  sectionHeaderRegular: { marginTop: 22 },
  sectionHeaderCompact: { height: 29, marginTop: 16, paddingBottom: 8 },
  sectionHeaderCompactNarrow: {
    height: 27,
    marginTop: 14,
    paddingBottom: 7,
  },
  sectionTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionMeta: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  destructivePressed: { backgroundColor: 'rgba(245,85,93,0.06)' },
  disabled: { opacity: 0.55 },
  rowLabel: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  destructiveLabel: { color: colors.negative },
  rightSlot: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowValue: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  monospace: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  chevron: {
    lineHeight: 19,
    color: colors.textTertiary,
    fontWeight: '400',
    flexShrink: 0,
  },
  switchSlot: {
    width: 46,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  androidSwitch: { transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }] },
});
