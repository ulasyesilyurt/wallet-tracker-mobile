import React, {useImperativeHandle, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {newPasswordError} from '../auth/validation';
import {authColors} from '../theme/auth';

const chainBellLogo = require('../assets/chainbell-logo.png');

type AuthScaffoldProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  navLeading?: 'back' | 'none';
  onBack?: () => void;
  backDisabled?: boolean;
  navTrailing?: {label: string; onPress: () => void; disabled?: boolean; testID?: string};
  navHidden?: boolean;
  testID?: string;
  topSpacing?: number;
};

export function AuthScaffold({
  children, footer, navLeading, onBack, backDisabled = false, navTrailing,
  navHidden = false, testID, topSpacing = 0,
}: AuthScaffoldProps) {
  const insets = useSafeAreaInsets();
  // App.tsx already applies iOS safe areas; Android keeps its existing inset handling.
  const safePadding = {
    paddingTop: topSpacing + (Platform.OS === 'android' ? insets.top : 0),
    paddingBottom: Platform.OS === 'ios' ? 8 : Math.max(16, insets.bottom + 8),
    paddingLeft: 20 + (Platform.OS === 'android' ? insets.left : 0),
    paddingRight: 20 + (Platform.OS === 'android' ? insets.right : 0),
  };
  const hasNavRow = navLeading !== undefined || navTrailing !== undefined || navHidden;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
      testID={testID}>
      <ScrollView
        testID={testID ? `${testID}.scroll` : undefined}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, safePadding]}>
        <View style={styles.content}>
          {hasNavRow ? (
            <View style={styles.navRow}>
              {!navHidden && navLeading === 'back' && onBack ? (
                <Pressable
                  testID={testID ? `${testID}.back` : undefined}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  accessibilityState={{disabled: backDisabled}}
                  disabled={backDisabled}
                  onPress={onBack}
                  style={[styles.backHitTarget, backDisabled && styles.linkDisabled]}>
                  <View style={styles.backCircle}>
                    <Ionicons name="chevron-back" size={22} color={authColors.text} />
                  </View>
                </Pressable>
              ) : null}
              {!navHidden && navTrailing ? (
                <Pressable
                  testID={navTrailing.testID ?? (testID ? `${testID}.navTrailing` : undefined)}
                  accessibilityRole="button"
                  accessibilityLabel={navTrailing.label}
                  accessibilityState={{disabled: navTrailing.disabled ?? false}}
                  disabled={navTrailing.disabled}
                  onPress={navTrailing.onPress}
                  style={styles.navTrailing}>
                  <Text style={[styles.navTrailingText, navTrailing.disabled && styles.linkDisabled]}>
                    {navTrailing.label}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {children}
          {footer ? <><View style={styles.footerSpacer} /><View>{footer}</View></> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Existing screens keep their header/nav composition until their later UX phase.
export function AuthFormLayout({children}: {children: React.ReactNode}) {
  return <AuthScaffold topSpacing={20}>{children}</AuthScaffold>;
}

export function AuthHeader({
  title,
  subtitle,
  onBack,
  hideBrand = false,
  showLogo,
  backLabel = 'Back to Sign In',
  showNavigationRow = true,
  children,
  testID,
}: {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  hideBrand?: boolean;
  showLogo?: boolean;
  backLabel?: string;
  showNavigationRow?: boolean;
  children?: React.ReactNode;
  testID?: string;
}) {
  const {height} = useWindowDimensions();
  const compact = height < 780;
  const logoVisible = (showLogo ?? !hideBrand) && !compact;
  return (
    <View>
      {showNavigationRow ? <View style={styles.navRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
            style={styles.backHitTarget}>
            <View style={styles.backCircle}>
              <Ionicons name="chevron-back" size={22} color={authColors.text} />
            </View>
          </Pressable>
        ) : null}
      </View> : null}
      {logoVisible ? <Image source={chainBellLogo} style={styles.brandMark} accessible={false} /> : null}
      <Text testID={testID ? `${testID}.title` : undefined} accessibilityRole="header" style={[styles.title, compact && styles.titleCompact, !logoVisible && styles.titleWithoutBrand]}>{title}</Text>
      {subtitle ? <Text testID={testID ? `${testID}.subtitle` : undefined} style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export type AuthTextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  helper?: string | null;
  accessory?: React.ReactNode;
  loading?: boolean;
  emailPreset?: boolean;
  testID?: string;
};

export const AuthTextField = React.forwardRef<TextInput, AuthTextFieldProps>(function AuthTextField(
  {label, error, helper, accessory, loading = false, emailPreset = false, editable, onFocus, onBlur, testID, ...props},
  ref,
) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);
  const isEditable = editable !== false && !loading;
  const emailProps: TextInputProps = emailPreset ? {
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
    textContentType: 'emailAddress',
    autoComplete: 'email',
  } : {};
  return (
    <View style={[styles.field, loading ? styles.fieldLoading : !isEditable && styles.fieldDisabled]}>
      <Pressable accessible={false} onPress={() => { if (isEditable) inputRef.current?.focus(); }}>
        <Text style={[styles.fieldLabel, focused && styles.fieldLabelFocused, error && styles.fieldLabelError]}>
          {label}
        </Text>
      </Pressable>
      <View style={[
        styles.fieldLine,
        focused && styles.fieldLineFocused,
        error && styles.fieldLineError,
        !isEditable && styles.fieldLineDisabled,
      ]}>
        <TextInput
          {...emailProps}
          {...props}
          ref={inputRef}
          testID={testID}
          editable={isEditable}
          accessibilityLabel={label}
          accessibilityHint={error ?? props.accessibilityHint}
          accessibilityState={{disabled: !isEditable}}
          placeholderTextColor={authColors.placeholder}
          selectionColor={authColors.focus}
          style={styles.input}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {accessory}
      </View>
      {error ? <Text testID={testID ? `${testID}.error` : undefined} style={styles.fieldError} accessibilityLiveRegion="polite">{error}</Text> :
        helper ? <Text testID={testID ? `${testID}.helper` : undefined} style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
});

export function AuthPasswordToggle({
  visible,
  onPress,
  disabled,
}: {
  visible: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={styles.passwordToggle}>
      <Text style={styles.passwordToggleText}>{visible ? 'Hide' : 'Show'}</Text>
    </Pressable>
  );
}

type PasswordFieldProps = Omit<AuthTextFieldProps, 'accessory' | 'emailPreset' | 'secureTextEntry' | 'textContentType' | 'autoComplete' | 'label'> & {
  variant: 'current' | 'new';
  value: string;
  label?: string;
};

export const PasswordField = React.forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
  {variant, value, label = 'Password', loading, editable, testID, ...props}, ref,
) {
  const [visible, setVisible] = useState(false);
  const disabled = editable === false || loading === true;
  return (
    <AuthTextField
      {...props}
      ref={ref}
      testID={testID}
      label={label}
      value={value}
      loading={loading}
      editable={editable}
      secureTextEntry={!visible}
      textContentType={variant === 'current' ? 'password' : 'newPassword'}
      autoComplete={variant === 'current' ? 'current-password' : 'new-password'}
      autoCapitalize="none"
      autoCorrect={false}
      accessory={
        <Pressable
          testID={testID ? `${testID}.toggle` : undefined}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          accessibilityState={{disabled}}
          disabled={disabled}
          onPress={() => setVisible(current => !current)}
          style={styles.passwordToggle}>
          <Text style={[styles.passwordToggleText, !value && styles.passwordToggleEmpty]}>
            {visible ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      }
    />
  );
});

export function PasswordRules({password, testID}: {password: string; testID?: string}) {
  const meetsMinimum = newPasswordError(password) === undefined;
  return (
    <View style={styles.passwordRules}>
      <View
        testID={testID ? `${testID}.length` : undefined}
        accessible
        accessibilityLabel="8+ characters"
        accessibilityState={{checked: meetsMinimum}}
        style={styles.passwordRule}>
        <View style={[styles.ruleMark, meetsMinimum && styles.ruleMarkMet]}>
          {meetsMinimum ? <Text style={styles.ruleCheck}>✓</Text> : null}
        </View>
        <Text style={styles.ruleText}>8+ characters</Text>
      </View>
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  accessibilityLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

export function PrimaryAuthButton({
  label,
  accessibilityLabel,
  loadingLabel,
  loading = false,
  disabled = false,
  onPress,
  testID,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;
  const visibleLabel = loading ? loadingLabel ?? label : label;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? visibleLabel}
      accessibilityState={{disabled: isDisabled, busy: loading}}
      disabled={isDisabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.primaryButton,
        ((pressed && !isDisabled) || loading) && styles.primaryButtonPressed,
        disabled && !loading && styles.primaryButtonDisabled,
      ]}>
      {loading ? <ActivityIndicator testID={testID ? `${testID}.spinner` : undefined} size="small" color="#FFFFFF" /> : null}
      <Text style={[styles.primaryButtonText, disabled && !loading && styles.primaryButtonTextDisabled]}>
        {visibleLabel}
      </Text>
    </Pressable>
  );
}

// Current screens retain their stable accessibility label during loading.
export function AuthPrimaryButton(props: AuthButtonProps) {
  return <PrimaryAuthButton {...props} accessibilityLabel={props.label} />;
}

export function SecondaryAuthButton({
  label, loadingLabel, loading = false, disabled = false, onPress, testID,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;
  const visibleLabel = loading ? loadingLabel ?? label : label;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={visibleLabel}
      accessibilityState={{disabled: isDisabled, busy: loading}}
      disabled={isDisabled}
      onPress={onPress}
      style={({pressed}) => [styles.secondaryButton, pressed && !isDisabled && styles.secondaryButtonPressed]}>
      {loading ? <ActivityIndicator size="small" color={authColors.focus} /> : null}
      <Text style={[styles.secondaryButtonText, isDisabled && styles.secondaryButtonTextDisabled]}>{visibleLabel}</Text>
    </Pressable>
  );
}

export function AuthOrDivider() {
  return (
    <View style={styles.orDivider}>
      <View style={styles.orDividerLine} accessible={false} importantForAccessibility="no" />
      <Text style={styles.orDividerText}>or continue with email</Text>
      <View style={styles.orDividerLine} accessible={false} importantForAccessibility="no" />
    </View>
  );
}

type AuthNoticeProps = {
  tone: 'error' | 'warning' | 'neutral';
  message: string;
  action?: {label: string; onPress: () => void; loading?: boolean; testID?: string};
  testID?: string;
};

export function AuthNotice({tone, message, action, testID}: AuthNoticeProps) {
  return (
    <View
      testID={testID}
      accessibilityRole={tone === 'neutral' ? undefined : 'alert'}
      style={[styles.notice, tone === 'error' ? styles.noticeError : tone === 'warning' ? styles.noticeWarning : styles.noticeNeutral]}>
      {tone !== 'neutral' ? (
        <View style={[styles.noticeMark, tone === 'error' ? styles.noticeMarkError : styles.noticeMarkWarning]} accessible={false}>
          <Text style={styles.noticeMarkText}>!</Text>
        </View>
      ) : null}
      <Text style={[styles.noticeText, tone === 'error' ? styles.noticeErrorText : tone === 'warning' ? styles.noticeWarningText : styles.noticeNeutralText]}>
        {message}
      </Text>
      {action ? (
        <Pressable
          testID={action.testID ?? (testID ? `${testID}.action` : undefined)}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{disabled: action.loading ?? false, busy: action.loading ?? false}}
          disabled={action.loading}
          onPress={action.onPress}
          style={styles.noticeAction}>
          {action.loading ? <ActivityIndicator size="small" color={authColors.focus} /> :
            <Text style={[styles.noticeActionText, tone === 'error' && styles.noticeActionErrorText]}>{action.label}</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

// Compatibility for current screens; later screen work can choose warning/neutral tones.
export function AuthRequestError({message}: {message: string}) {
  return <AuthNotice tone="error" message={message} />;
}

export function AuthTextLink({
  label, onPress, disabled = false, testID, align = 'left',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  align?: 'left' | 'right';
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={[styles.textLink, align === 'right' && styles.textLinkRight]}>
      <Text style={[styles.textLinkText, disabled && styles.linkDisabled]}>{label}</Text>
    </Pressable>
  );
}

export function AuthFooterLink({
  prompt, linkLabel, onPress, disabled = false, testID,
}: {
  prompt: string;
  linkLabel: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${prompt} ${linkLabel}`}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={styles.footerLink}>
      <Text style={[styles.footerPrompt, disabled && styles.linkDisabled]}>{prompt}</Text>
      <Text style={[styles.footerLinkText, disabled && styles.linkDisabled]}>{linkLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: authColors.background},
  scrollContent: {flexGrow: 1},
  content: {flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center'},
  navRow: {height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  backHitTarget: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  backCircle: {width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center'},
  navTrailing: {minHeight: 44, justifyContent: 'center', paddingLeft: 12, paddingRight: 2},
  navTrailingText: {color: authColors.textSecondary, fontSize: 14, fontWeight: '700'},
  footerSpacer: {flexGrow: 1, minHeight: 16},
  brandMark: {width: 36, height: 36, borderRadius: 9, marginTop: 12, marginBottom: 16},
  title: {color: authColors.text, fontSize: 28, lineHeight: 31, fontWeight: '800', letterSpacing: -0.7},
  titleCompact: {fontSize: 26, lineHeight: 29, letterSpacing: -0.65},
  titleWithoutBrand: {marginTop: 12},
  subtitle: {color: authColors.textSecondary, fontSize: 15, lineHeight: 22.5, marginTop: 6},
  field: {marginTop: 16},
  fieldDisabled: {opacity: 0.45},
  fieldLoading: {opacity: 0.55},
  fieldLabel: {color: authColors.textTertiary, fontSize: 12, lineHeight: 16, fontWeight: '700'},
  fieldLabelFocused: {color: authColors.text},
  fieldLabelError: {color: authColors.error},
  fieldLine: {minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: authColors.lineHairline},
  fieldLineFocused: {borderBottomWidth: 1.5, borderBottomColor: authColors.focus},
  fieldLineError: {borderBottomWidth: 1.5, borderBottomColor: authColors.error},
  fieldLineDisabled: {borderBottomColor: authColors.lineOutline},
  input: {flex: 1, minWidth: 0, height: 52, paddingHorizontal: 0, paddingVertical: 0, color: authColors.text, fontSize: 15.5, fontWeight: '600'},
  fieldError: {color: authColors.errorText, fontSize: 12, lineHeight: 17, marginTop: 7},
  fieldHelper: {color: authColors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 7},
  passwordToggle: {minWidth: 48, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center'},
  passwordToggleText: {color: authColors.textSecondary, fontSize: 13, fontWeight: '700'},
  passwordToggleEmpty: {color: authColors.textDisabled},
  passwordRules: {marginTop: 9, flexDirection: 'row', gap: 16},
  passwordRule: {flexDirection: 'row', alignItems: 'center', gap: 6},
  ruleMark: {width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: authColors.textDisabled, alignItems: 'center', justifyContent: 'center'},
  ruleMarkMet: {backgroundColor: authColors.success, borderColor: authColors.success},
  ruleCheck: {color: authColors.background, fontSize: 9, fontWeight: '800'},
  ruleText: {color: authColors.textSecondary, fontSize: 12, fontWeight: '600'},
  primaryButton: {minHeight: 52, width: '100%', backgroundColor: authColors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10},
  primaryButtonPressed: {backgroundColor: authColors.primaryPressed},
  primaryButtonDisabled: {backgroundColor: authColors.disabledFill},
  primaryButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.15},
  primaryButtonTextDisabled: {color: authColors.textDisabled},
  secondaryButton: {minHeight: 48, width: '100%', borderRadius: 12, borderWidth: 1, borderColor: authColors.lineOutline, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  secondaryButtonPressed: {backgroundColor: 'rgba(255,255,255,0.04)'},
  secondaryButtonText: {color: authColors.text, fontSize: 15, fontWeight: '700'},
  secondaryButtonTextDisabled: {color: authColors.textDisabled},
  orDivider: {minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 12},
  orDividerLine: {flex: 1, height: 1, backgroundColor: authColors.lineHairline},
  orDividerText: {color: authColors.textTertiary, fontSize: 12, fontWeight: '600'},
  notice: {borderWidth: 1, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10},
  noticeError: {backgroundColor: 'rgba(255,92,102,0.08)', borderColor: 'rgba(255,92,102,0.22)'},
  noticeWarning: {backgroundColor: 'rgba(242,169,59,0.08)', borderColor: 'rgba(242,169,59,0.24)'},
  noticeNeutral: {backgroundColor: 'rgba(255,255,255,0.04)', borderColor: authColors.lineHairline},
  noticeMark: {width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  noticeMarkError: {backgroundColor: authColors.error},
  noticeMarkWarning: {backgroundColor: authColors.warning},
  noticeMarkText: {color: authColors.background, fontSize: 10, fontWeight: '800'},
  noticeText: {flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600'},
  noticeErrorText: {color: authColors.errorNoticeText},
  noticeWarningText: {color: authColors.warningText},
  noticeNeutralText: {color: authColors.textSecondary},
  noticeAction: {minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center'},
  noticeActionText: {color: authColors.link, fontSize: 13, fontWeight: '800'},
  noticeActionErrorText: {color: authColors.text},
  textLink: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 2},
  textLinkRight: {alignSelf: 'flex-end'},
  textLinkText: {color: authColors.link, fontSize: 13.5, fontWeight: '700'},
  footerLink: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 5},
  footerPrompt: {color: authColors.textSecondary, fontSize: 14, fontWeight: '500'},
  footerLinkText: {color: authColors.link, fontSize: 14, fontWeight: '700'},
  linkDisabled: {opacity: 0.4},
});
