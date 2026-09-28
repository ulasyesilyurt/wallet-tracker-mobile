import React, {useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {hasAuthFieldErrors, validateLogin, type AuthFieldErrors} from '../auth/validation';
import {
  AuthFormLayout,
  AuthHeader,
  AuthPasswordToggle,
  AuthPrimaryButton,
  AuthRequestError,
  AuthTextField,
} from '../components/AuthUI';
import {authColors} from '../theme/auth';

type LoginScreenProps = {
  onShowRegister: () => void;
  onForgotPassword: (email: string) => void;
  onSignedIn: () => void;
  initialEmail?: string;
};

export function LoginScreen({onShowRegister, onForgotPassword, onSignedIn, initialEmail = ''}: LoginScreenProps) {
  const {login} = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const passwordInputRef = useRef<TextInput>(null);

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
      onSignedIn();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not sign in');
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
    <AuthFormLayout>
      <AuthHeader title="Sign in" subtitle="Welcome back to ChainBell." />

      <View style={styles.form}>
        <AuthTextField
          label="Email"
          error={fieldErrors.email}
          value={email}
          onChangeText={updateEmail}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            email: validateLogin(email, password).email,
          }))}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          editable={!submitting}
          placeholder="you@email.com"
        />
        <AuthTextField
          ref={passwordInputRef}
          label="Password"
          error={fieldErrors.password}
          value={password}
          onChangeText={updatePassword}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            password: validateLogin(email, password).password,
          }))}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          secureTextEntry={!showPassword}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          editable={!submitting}
          placeholder="Password"
          accessory={
            <AuthPasswordToggle
              visible={showPassword}
              disabled={submitting}
              onPress={() => setShowPassword(value => !value)}
            />
          }
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot password?"
          disabled={submitting}
          onPress={() => onForgotPassword(email.trim())}
          style={styles.forgotLink}>
          <Text style={[styles.forgotLinkText, submitting && styles.footerLinkDisabled]}>Forgot password?</Text>
        </Pressable>

        {error ? <View style={styles.notice}><AuthRequestError message={error} /></View> : null}
        <View style={styles.submitArea}>
          <AuthPrimaryButton
            label="Sign in"
            loadingLabel="Signing in…"
            loading={submitting}
            disabled={submitting || !email.trim() || !password}
            onPress={handleLogin}
          />
        </View>
      </View>

      <View style={styles.flexSpace} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to ChainBell?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create account"
          disabled={submitting}
          onPress={onShowRegister}
          style={styles.footerLink}>
          <Text style={[styles.footerLinkText, submitting && styles.footerLinkDisabled]}>
            Create account
          </Text>
        </Pressable>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  form: {marginTop: 12},
  forgotLink: {minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center'},
  forgotLinkText: {color: authColors.focus, fontSize: 13.5, fontWeight: '700'},
  notice: {marginTop: 20},
  submitArea: {marginTop: 24},
  flexSpace: {flexGrow: 1, minHeight: 32},
  footer: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap'},
  footerText: {color: authColors.textSecondary, fontSize: 13.5},
  footerLink: {minHeight: 44, paddingHorizontal: 6, justifyContent: 'center'},
  footerLinkText: {color: authColors.focus, fontSize: 13.5, fontWeight: '700'},
  footerLinkDisabled: {opacity: 0.4},
});
