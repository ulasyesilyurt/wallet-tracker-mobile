import React, {forwardRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NetworkBadge} from './WalletDetailUI';
import {
  getWalletManagementLayout,
  walletManagementColors as colors,
} from '../theme/walletManagement';

const monospace = Platform.select({ios: 'Menlo', android: 'monospace'});

export function PushedScreenHeader({
  title,
  onBack,
  backDisabled = false,
  walletLabel,
  description,
}: {
  title: string;
  onBack: () => void;
  backDisabled?: boolean;
  walletLabel?: string | null;
  description?: string;
}) {
  const {width} = useWindowDimensions();
  const layout = getWalletManagementLayout(width);
  const initial = walletLabel?.trim().charAt(0).toUpperCase() || 'W';

  return (
    <View>
      <View style={styles.backRow}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          accessibilityState={{disabled: backDisabled}}
          disabled={backDisabled}
          hitSlop={6}
          onPress={onBack}
          style={({pressed}) => [
            styles.backButton,
            backDisabled && styles.backButtonDisabled,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
            name="chevron-back"
            size={18}
            color={colors.textDim}
          />
        </Pressable>
      </View>
      <View
        style={[
          styles.titleRow,
          walletLabel ? styles.titleRowWithWallet : styles.titleRowDefault,
        ]}
      >
        {walletLabel ? (
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.titleAvatar}
          >
            <Text style={styles.titleAvatarText}>{initial}</Text>
          </View>
        ) : null}
        <Text
          maxFontSizeMultiplier={1.5}
          style={[styles.title, {fontSize: layout.titleSize}]}
        >
          {title}
        </Text>
      </View>
      {description ? (
        <Text
          maxFontSizeMultiplier={1.5}
          style={[styles.description, {fontSize: layout.bodySize}]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function WalletSubjectLine({
  label,
  address,
}: {
  label: string;
  address: string;
}) {
  const initial = label.trim().charAt(0).toUpperCase() || 'W';
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${address}`}
      style={styles.subject}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.subjectAvatar}
      >
        <Text style={styles.subjectAvatarText}>{initial}</Text>
      </View>
      <Text numberOfLines={1} style={styles.subjectLabel}>
        {label}
      </Text>
      <Text numberOfLines={1} style={styles.subjectAddress}>
        {address}
      </Text>
    </View>
  );
}

export type FormFieldState =
  | 'rest'
  | 'error'
  | 'warn'
  | 'valid'
  | 'readOnly';

type FormFieldProps = Omit<
  TextInputProps,
  'style' | 'placeholderTextColor' | 'onFocus' | 'onBlur'
> & {
  label: string;
  state?: FormFieldState;
  message?: string | null;
  mono?: boolean;
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
};

export const FormField = forwardRef<TextInput, FormFieldProps>(
  function FormField(
    {
      label,
      state = 'rest',
      message,
      mono = false,
      editable = true,
      onFocus,
      onBlur,
      ...inputProps
    },
    ref,
  ) {
    const {width} = useWindowDimensions();
    const layout = getWalletManagementLayout(width);
    const [focused, setFocused] = useState(false);
    const visualState = state === 'rest' && focused ? 'focus' : state;
    const error = visualState === 'error';
    const warn = visualState === 'warn';
    const valid = visualState === 'valid';
    const readOnly = visualState === 'readOnly' || editable === false;

    return (
      <View>
        <Text
          style={[
            styles.fieldLabel,
            {fontSize: layout.fieldLabelSize},
            visualState === 'focus' && styles.fieldLabelFocused,
            error && styles.fieldError,
            warn && styles.fieldWarn,
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.fieldRule,
            {height: layout.fieldHeight},
            visualState === 'focus' && styles.fieldRuleFocused,
            error && styles.fieldRuleError,
            warn && styles.fieldRuleWarn,
            readOnly && styles.fieldRuleReadOnly,
          ]}
        >
          <TextInput
            {...inputProps}
            ref={ref}
            accessibilityLabel={label}
            accessibilityHint={message ?? undefined}
            editable={!readOnly}
            onFocus={event => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={event => {
              setFocused(false);
              onBlur?.(event);
            }}
            placeholderTextColor="#4E5661"
            selectionColor={colors.positive}
            style={[
              styles.input,
              {
                fontSize: mono ? layout.addressSize : layout.inputSize,
                fontFamily: mono ? monospace : undefined,
              },
              readOnly && styles.inputReadOnly,
            ]}
          />
          {error || valid ? (
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.fieldGlyph, error ? styles.fieldError : styles.fieldValid]}
            >
              {error ? '✕' : '✓'}
            </Text>
          ) : null}
        </View>
        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.fieldMessage,
              error && styles.fieldError,
              warn && styles.fieldWarn,
            ]}
          >
            {message}
          </Text>
        ) : null}
      </View>
    );
  },
);

export type ChainSegmentOption = {
  chainId: string;
  label: string;
};

export function SegmentedChainSelect({
  options,
  selectedValues,
  onToggle,
  disabled = false,
}: {
  options: readonly ChainSegmentOption[];
  selectedValues: readonly string[];
  onToggle: (chainId: string) => void;
  disabled?: boolean;
}) {
  const {width} = useWindowDimensions();
  const layout = getWalletManagementLayout(width);

  return (
    <View
      accessibilityLabel="Networks"
      style={[
        styles.segmentTrack,
        {
          height: layout.segmentHeight,
          borderRadius: layout.segmentRadius,
        },
        disabled && styles.segmentDisabled,
      ]}
    >
      {options.map(option => {
        const selected = selectedValues.includes(option.chainId);
        return (
          <Pressable
            key={option.chainId}
            accessibilityLabel={option.label}
            accessibilityRole="checkbox"
            accessibilityState={{checked: selected, disabled}}
            disabled={disabled}
            hitSlop={{top: 2, bottom: 2}}
            onPress={() => onToggle(option.chainId)}
            style={({pressed}) => [
              styles.segment,
              {borderRadius: layout.segmentInnerRadius},
              selected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}
          >
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={!selected ? styles.badgeMuted : undefined}
            >
              <NetworkBadge chainId={option.chainId} narrow={layout.narrow} />
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[
                styles.segmentName,
                {fontSize: layout.segmentNameSize},
                selected && styles.segmentNameSelected,
              ]}
            >
              {option.label}
            </Text>
            {selected ? (
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={styles.segmentCheck}
              >
                ✓
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function FormActionBar({
  label,
  onPress,
  busy,
  disabled,
  bottomInset,
  error,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
  bottomInset: number;
  error?: string | null;
}) {
  const {width} = useWindowDimensions();
  const layout = getWalletManagementLayout(width);

  return (
    <View
      style={[
        styles.actionBar,
        {
          paddingHorizontal: layout.actionPaddingHorizontal,
          paddingTop: layout.actionPaddingVertical,
          paddingBottom: layout.actionPaddingVertical + bottomInset,
        },
      ]}
    >
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.actionError}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{disabled: disabled || busy, busy}}
        disabled={disabled || busy}
        onPress={onPress}
        style={({pressed}) => [
          styles.primaryButton,
          {height: layout.buttonHeight},
          disabled && styles.primaryButtonDisabled,
          busy && styles.primaryButtonBusy,
          pressed && styles.primaryButtonPressed,
        ]}
      >
        {busy ? (
          <View style={styles.busyContent}>
            <ActivityIndicator color={colors.primaryCtaText} size="small" />
            <Text style={styles.primaryButtonText}>Saving…</Text>
          </View>
        ) : (
          <Text
            style={[
              styles.primaryButtonText,
              disabled && styles.primaryButtonTextDisabled,
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export function DestructiveRow({
  label,
  consequence,
  onPress,
  disabled,
}: {
  label: string;
  consequence: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.destructiveBlock, disabled && styles.segmentDisabled]}>
      <Pressable
        accessibilityHint={consequence}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({pressed}) => [
          styles.destructiveRow,
          pressed && styles.destructivePressed,
        ]}
      >
        <Text style={styles.destructiveLabel}>{label}</Text>
      </Pressable>
      <Text style={styles.destructiveConsequence}>{consequence}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: {height: 44, justifyContent: 'center'},
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {backgroundColor: 'rgba(255,255,255,0.10)'},
  backButtonDisabled: {opacity: 0.55},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 11},
  titleRowDefault: {marginTop: 12},
  titleRowWithWallet: {marginTop: 10},
  titleAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(79,125,243,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleAvatarText: {fontSize: 15, fontWeight: '800', color: colors.accentText},
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 30,
  },
  description: {
    marginTop: 6,
    maxWidth: 300,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 19.5,
  },
  subject: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  subjectAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(79,125,243,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectAvatarText: {fontSize: 9, fontWeight: '800', color: colors.accentText},
  subjectLabel: {maxWidth: '42%', fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  subjectAddress: {
    flex: 1,
    minWidth: 0,
    fontFamily: monospace,
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  fieldLabel: {fontWeight: '700', color: colors.textTertiary},
  fieldLabelFocused: {color: colors.textPrimary},
  fieldRule: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldRuleFocused: {borderBottomWidth: 1.5, borderBottomColor: colors.textDim},
  fieldRuleError: {borderBottomWidth: 1.5, borderBottomColor: colors.negative},
  fieldRuleWarn: {borderBottomWidth: 1.5, borderBottomColor: colors.warning},
  fieldRuleReadOnly: {borderBottomColor: 'rgba(255,255,255,0.055)'},
  input: {flex: 1, minWidth: 0, height: '100%', paddingHorizontal: 0, paddingVertical: 0, color: colors.textPrimary, fontWeight: '600'},
  inputReadOnly: {color: colors.textTertiary},
  fieldGlyph: {width: 20, textAlign: 'right', fontSize: 13, fontWeight: '700'},
  fieldValid: {color: colors.positive},
  fieldError: {color: colors.negative},
  fieldWarn: {color: colors.warning},
  fieldMessage: {marginTop: 7, fontSize: 12, fontWeight: '500', color: colors.textTertiary},
  segmentTrack: {
    padding: 4,
    gap: 4,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.055)',
  },
  segment: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: 'transparent'},
  segmentSelected: {backgroundColor: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.10)'},
  segmentPressed: {opacity: 0.62},
  segmentDisabled: {opacity: 0.55},
  badgeMuted: {opacity: 0.55},
  segmentName: {minWidth: 0, color: colors.textTertiary, fontWeight: '600'},
  segmentNameSelected: {color: colors.textPrimary, fontWeight: '700'},
  segmentCheck: {fontSize: 11, fontWeight: '700', color: colors.textPrimary},
  actionBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.055)',
    backgroundColor: colors.background,
  },
  primaryButton: {width: '100%', borderRadius: 12, backgroundColor: colors.primaryCtaFill, alignItems: 'center', justifyContent: 'center'},
  primaryButtonDisabled: {backgroundColor: 'rgba(255,255,255,0.08)'},
  primaryButtonBusy: {backgroundColor: 'rgba(244,246,248,0.55)'},
  primaryButtonPressed: {opacity: 0.85},
  primaryButtonText: {fontSize: 15, fontWeight: '800', letterSpacing: -0.15, color: colors.primaryCtaText},
  primaryButtonTextDisabled: {color: colors.textTertiary},
  busyContent: {flexDirection: 'row', alignItems: 'center', gap: 9},
  actionError: {marginBottom: 9, fontSize: 12.5, fontWeight: '500', color: colors.negative},
  destructiveBlock: {marginTop: 20, paddingTop: 1, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.055)'},
  destructiveRow: {minHeight: 52, justifyContent: 'center'},
  destructivePressed: {backgroundColor: 'rgba(245,85,93,0.06)'},
  destructiveLabel: {fontSize: 15, fontWeight: '700', color: colors.negative},
  destructiveConsequence: {fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textTertiary},
});
