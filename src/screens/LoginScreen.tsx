import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {classifyAuthError} from '../auth/authErrors';
import {hasAuthFieldErrors, validateLogin, type AuthFieldErrors} from '../auth/validation';
import {
  AuthFooterLink,
  AuthHeader,
  AuthNotice,
  AuthScaffold,
  AuthTextField,
  AuthTextLink,
  PasswordField,
  PrimaryAuthButton,
} from '../components/AuthUI';

type LoginScreenProps = {
  onShowRegister: () => void;
  onForgotPassword: (email: string) => void;
  initialEmail?: string;
  focusEmail?: boolean;
};

export function LoginScreen({onShowRegister, onForgotPassword, initialEmail = '', focusEmail = false}: LoginScreenProps) {
  const {login} = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusPasswordAfterError, setFocusPasswordAfterError] = useState(false);
  const submittingRef = useRef(false);
  const passwordInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);

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
    if (submittingRef.current) return;

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
      footer={<AuthFooterLink prompt="New to ChainBell?" linkLabel="Create account" onPress={onShowRegister} disabled={submitting} />}>
      <AuthHeader title="Sign in" subtitle="Welcome back to ChainBell." showNavigationRow={false} />

      <View style={styles.form}>
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
          editable={!submitting}
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
          editable={!submitting}
          placeholder="Password"
        />

        <AuthTextLink
          label="Forgot password?"
          disabled={submitting}
          onPress={() => onForgotPassword(email.trim())}
          align="right"
        />

        {error ? <View style={styles.notice}><AuthNotice tone="error" message={error} /></View> : null}
        <View style={styles.submitArea}>
          <PrimaryAuthButton
            label="Sign in"
            accessibilityLabel="Sign in"
            loadingLabel="Signing in…"
            loading={submitting}
            disabled={submitting || !email.trim() || !password}
            onPress={handleLogin}
          />
        </View>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: {marginTop: 12},
  notice: {marginTop: 20},
  submitArea: {marginTop: 24},
});
