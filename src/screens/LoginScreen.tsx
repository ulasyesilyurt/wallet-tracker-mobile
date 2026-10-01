import React, {useEffect, useRef, useState} from 'react';
import {Platform, StyleSheet, TextInput, useWindowDimensions, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {classifyAuthError} from '../auth/authErrors';
import {hasAuthFieldErrors, validateLogin, type AuthFieldErrors} from '../auth/validation';
import {
  AuthFooterLink,
  AuthHeader,
  AuthNotice,
  AuthOrDivider,
  AuthScaffold,
  AuthTextField,
  AuthTextLink,
  PasswordField,
  PrimaryAuthButton,
} from '../components/AuthUI';
import {SocialAuthButtons, type SocialAuthButtonsHandle} from '../components/SocialAuthButtons';

type LoginScreenProps = {
  onShowRegister: () => void;
  onForgotPassword: (email: string) => void;
  initialEmail?: string;
  focusEmail?: boolean;
};

export function LoginScreen({onShowRegister, onForgotPassword, initialEmail = '', focusEmail = false}: LoginScreenProps) {
  const compact = useWindowDimensions().height < 780;
  const {login} = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [hasProviders, setHasProviders] = useState(Platform.OS === 'ios' || Platform.OS === 'android');
  const [error, setError] = useState<string | null>(null);
  const [focusPasswordAfterError, setFocusPasswordAfterError] = useState(false);
  const submittingRef = useRef(false);
  const socialBusyRef = useRef(false);
  const passwordInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const socialRef = useRef<SocialAuthButtonsHandle>(null);

  useEffect(() => {
    if (focusEmail) emailInputRef.current?.focus();
  }, [focusEmail]);

  useEffect(() => {
    if (focusPasswordAfterError && !submitting) {
      passwordInputRef.current?.focus();
      setFocusPasswordAfterError(false);
    }
  }, [focusPasswordAfterError, submitting]);

  async function handleLogin() {
    if (submittingRef.current || socialBusyRef.current) return;
    socialRef.current?.clearNotice();

    const nextErrors = validateLogin(email, password);
    setFieldErrors(nextErrors);
    if (hasAuthFieldErrors(nextErrors)) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await login({email: email.trim(), password});
    } catch (loginError) {
      if (classifyAuthError(loginError) === 'invalidCredentials') {
        setPassword('');
        setFieldErrors(current => ({...current, password: undefined}));
        setError('Email or password is incorrect.');
        setFocusPasswordAfterError(true);
      } else {
        setError(loginError instanceof Error ? loginError.message : 'Could not sign in');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function updateEmail(value: string) {
    setEmail(value);
    setFieldErrors(current => ({...current, email: undefined}));
    setError(null);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setFieldErrors(current => ({...current, password: undefined}));
    setError(null);
  }

  return (
    <AuthScaffold
      testID="login"
      navLeading="none"
      footer={<AuthFooterLink prompt="New to ChainBell?" linkLabel="Create account" onPress={onShowRegister} disabled={submitting || socialBusy} />}>
      <AuthHeader title="Sign in" subtitle="Welcome back to ChainBell." showNavigationRow={false} />

      <View style={hasProviders ? compact ? styles.socialCompact : styles.socialNormal : undefined}>
        <SocialAuthButtons
          ref={socialRef}
          testID="login.social"
          disabled={submitting}
          onAvailabilityChange={setHasProviders}
          onBusyChange={busy => { socialBusyRef.current = busy; setSocialBusy(busy); }}
          linkAction={{label: 'Use password', onPress: () => emailInputRef.current?.focus()}}
          emailRequiredAction={{label: 'Use email', onPress: onShowRegister}}
        />
      </View>
      {hasProviders ? <View style={compact ? styles.dividerCompact : styles.dividerNormal}><AuthOrDivider /></View> : null}

      <View style={[styles.form, hasProviders && (compact ? styles.formSocialCompact : styles.formSocialNormal)]}>
        <AuthTextField
          ref={emailInputRef}
          label="Email"
          emailPreset
          error={fieldErrors.email}
          value={email}
          onChangeText={updateEmail}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            email: validateLogin(email, password).email,
          }))}
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          editable={!submitting && !socialBusy}
          placeholder="you@email.com"
        />
        <PasswordField
          ref={passwordInputRef}
          variant="current"
          label="Password"
          error={fieldErrors.password}
          value={password}
          onChangeText={updatePassword}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            password: validateLogin(email, password).password,
          }))}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          editable={!submitting && !socialBusy}
          placeholder="Password"
        />

        <AuthTextLink
          label="Forgot password?"
          disabled={submitting || socialBusy}
          onPress={() => onForgotPassword(email.trim())}
          align="right"
        />

        {error ? <View style={styles.notice}><AuthNotice tone="error" message={error} /></View> : null}
        <View style={[styles.submitArea, socialBusy && styles.emailPathDisabled]}>
          <PrimaryAuthButton
            label="Sign in"
            accessibilityLabel="Sign in"
            loadingLabel="Signing in…"
            loading={submitting}
            disabled={submitting || socialBusy || !email.trim() || !password}
            onPress={handleLogin}
          />
        </View>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: {marginTop: 12},
  formSocialNormal: {marginTop: 20},
  formSocialCompact: {marginTop: 16},
  socialNormal: {marginTop: 24},
  socialCompact: {marginTop: 20},
  dividerNormal: {marginTop: 20},
  dividerCompact: {marginTop: 16},
  notice: {marginTop: 20},
  submitArea: {marginTop: 24},
  emailPathDisabled: {opacity: 0.4},
});
