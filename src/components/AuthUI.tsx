import React, {useState} from 'react';
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
  View,
  type TextInputProps,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {authColors} from '../theme/auth';

const chainBellLogo = require('../assets/chainbell-logo.png');

export function AuthFormLayout({children}: {children: React.ReactNode}) {
  const insets = useSafeAreaInsets();
  const safePadding = {
    paddingTop: 20 + (Platform.OS === 'android' ? insets.top : 0),
    paddingBottom: Platform.OS === 'ios' ? 8 : Math.max(16, insets.bottom + 8),
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.scrollContent, safePadding]}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  return (
    <View>
      <View style={styles.navRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Sign In"
            onPress={onBack}
            style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={authColors.text} />
          </Pressable>
        ) : null}
      </View>
      <Image source={chainBellLogo} style={styles.brandMark} accessibilityLabel="ChainBell logo" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

type AuthTextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  accessory?: React.ReactNode;
};

export const AuthTextField = React.forwardRef<TextInput, AuthTextFieldProps>(function AuthTextField(
  {label, error, accessory, editable, onFocus, onBlur, ...props},
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, focused && styles.fieldLabelFocused, error && styles.fieldLabelError]}>
        {label}
      </Text>
      <View style={[
        styles.fieldLine,
        focused && styles.fieldLineFocused,
        error && styles.fieldLineError,
      ]}>
        <TextInput
          {...props}
          ref={ref}
          editable={editable}
          accessibilityLabel={label}
          placeholderTextColor={authColors.textDisabled}
          selectionColor={authColors.focus}
          style={[styles.input, editable === false && styles.inputDisabled]}
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
      {error ? <Text style={styles.fieldError} accessibilityLiveRegion="polite">{error}</Text> : null}
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
      disabled={disabled}
      onPress={onPress}
      style={styles.passwordToggle}>
      <Text style={styles.passwordToggleText}>{visible ? 'Hide' : 'Show'}</Text>
    </Pressable>
  );
}

export function AuthPrimaryButton({
  label,
  loadingLabel,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled, busy: loading}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.primaryButton,
        pressed && !disabled && styles.primaryButtonPressed,
        loading && styles.primaryButtonPressed,
        disabled && !loading && styles.primaryButtonDisabled,
      ]}>
      {loading ? <ActivityIndicator size="small" color={authColors.text} /> : null}
      <Text style={[styles.primaryButtonText, disabled && !loading && styles.primaryButtonTextDisabled]}>
        {loading ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

export function AuthRequestError({message}: {message: string}) {
  return (
    <View style={styles.requestError} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={17} color={authColors.error} />
      <Text style={styles.requestErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: authColors.background},
  scrollContent: {flexGrow: 1, paddingHorizontal: 20},
  content: {flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center'},
  navRow: {height: 44, justifyContent: 'center'},
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1A1F2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {width: 36, height: 36, borderRadius: 10, marginTop: 12, marginBottom: 16},
  title: {color: authColors.text, fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7},
  subtitle: {color: authColors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 6},
  field: {marginTop: 16},
  fieldLabel: {color: authColors.textTertiary, fontSize: 12, fontWeight: '700'},
  fieldLabelFocused: {color: authColors.text},
  fieldLabelError: {color: authColors.error},
  fieldLine: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: authColors.line,
  },
  fieldLineFocused: {borderBottomWidth: 2, borderBottomColor: authColors.focus},
  fieldLineError: {borderBottomColor: authColors.error},
  input: {
    flex: 1,
    minWidth: 0,
    height: 52,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: authColors.text,
    fontSize: 15.5,
    fontWeight: '600',
  },
  inputDisabled: {color: authColors.textDisabled},
  fieldError: {color: authColors.error, fontSize: 12, lineHeight: 17, marginTop: 7},
  passwordToggle: {minWidth: 48, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center'},
  passwordToggleText: {color: authColors.textSecondary, fontSize: 13, fontWeight: '700'},
  primaryButton: {
    minHeight: 52,
    backgroundColor: authColors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonPressed: {backgroundColor: authColors.primaryPressed},
  primaryButtonDisabled: {backgroundColor: authColors.disabledFill},
  primaryButtonText: {color: authColors.text, fontSize: 15, fontWeight: '800'},
  primaryButtonTextDisabled: {color: authColors.textDisabled},
  requestError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#5C2933',
    backgroundColor: '#24151D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  requestErrorText: {flex: 1, color: '#FFB0B4', fontSize: 12.5, lineHeight: 18},
});
