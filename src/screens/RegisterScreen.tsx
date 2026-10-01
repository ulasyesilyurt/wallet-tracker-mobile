import React, {useRef, useState} from 'react';
import {Platform, StyleSheet, TextInput, useWindowDimensions, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {classifyAuthError} from '../auth/authErrors';
import {hasAuthFieldErrors, validateRegistration, type AuthFieldErrors} from '../auth/validation';
import {
  AuthFooterLink,
  AuthHeader,
  AuthNotice,
  AuthOrDivider,
  AuthScaffold,
  AuthTextField,
  PasswordField,
  PasswordRules,
  PrimaryAuthButton,
} from '../components/AuthUI';
import {SocialAuthButtons, type SocialAuthButtonsHandle} from '../components/SocialAuthButtons';

type RegisterScreenProps = {
  onShowLogin: () => void;
  initialEmail?: string;
};

export function RegisterScreen({onShowLogin, initialEmail = ''}: RegisterScreenProps) {
  const compact = useWindowDimensions().height < 780;
  const {register} = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [hasProviders, setHasProviders] = useState(Platform.OS === 'ios' || Platform.OS === 'android');
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const submittingRef = useRef(false);
  const socialBusyRef = useRef(false);
  const passwordInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const socialRef = useRef<SocialAuthButtonsHandle>(null);
  const passwordMeetsRule = password.length >= 8;

  async function handleRegister() {
    if (submittingRef.current || socialBusyRef.current) return;
    socialRef.current?.clearNotice();

    const nextErrors = validateRegistration(email, password, name);
    setFieldErrors(nextErrors);
    if (hasAuthFieldErrors(nextErrors)) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await register({email: email.trim(), password, name: name.trim() || undefined});
    } catch (registerError) {
      if (classifyAuthError(registerError) === 'accountExists') {
        setAccountExists(true);
        setError('An account with this email already exists.');
      } else {
        setError(registerError instanceof Error ? registerError.message : 'Could not create account');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function updateField(field: 'email' | 'password' | 'name', value: string) {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'name') setName(value);
    setFieldErrors(current => ({...current, [field]: undefined}));
    setError(null);
    setAccountExists(false);
  }

  return (
    <AuthScaffold
      testID="register"
      navLeading="back"
      onBack={onShowLogin}
      backDisabled={submitting || socialBusy}
      footer={<AuthFooterLink prompt="Already have an account?" linkLabel="Sign in" onPress={onShowLogin} disabled={submitting || socialBusy} />}>
      <AuthHeader
        title="Create account"
        subtitle="Follow wallets. Get alerted in real time."
        showNavigationRow={false}
      />

      <View style={hasProviders ? compact ? styles.socialCompact : styles.socialNormal : undefined}>
        <SocialAuthButtons
          ref={socialRef}
          testID="register.social"
          disabled={submitting}
          onAvailabilityChange={setHasProviders}
          onBusyChange={busy => { socialBusyRef.current = busy; setSocialBusy(busy); }}
          linkAction={{label: 'Sign in', onPress: onShowLogin}}
          emailRequiredAction={{label: 'Use email', onPress: () => emailInputRef.current?.focus()}}
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
          onChangeText={value => updateField('email', value)}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            email: validateRegistration(email, password, name).email,
          }))}
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          editable={!submitting && !socialBusy}
          placeholder="you@email.com"
        />
        <PasswordField
          ref={passwordInputRef}
          variant="new"
          label="Password"
          error={fieldErrors.password}
          value={password}
          onChangeText={value => updateField('password', value)}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            password: validateRegistration(email, password, name).password,
          }))}
          returnKeyType="next"
          onSubmitEditing={() => nameInputRef.current?.focus()}
          editable={!submitting && !socialBusy}
          placeholder="Password"
        />
        <PasswordRules password={password} />
        <AuthTextField
          ref={nameInputRef}
          label="Name (optional)"
          error={fieldErrors.name}
          value={name}
          onChangeText={value => updateField('name', value)}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            name: validateRegistration(email, password, name).name,
          }))}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          editable={!submitting && !socialBusy}
          placeholder="What should we call you?"
        />

        {error ? <View style={styles.notice}><AuthNotice tone="error" message={error} action={accountExists && !socialBusy ? {label: 'Sign in', onPress: onShowLogin, testID: 'register.accountExists.signIn'} : undefined} /></View> : null}
        <View style={[styles.submitArea, socialBusy && styles.emailPathDisabled]}>
          <PrimaryAuthButton
            label="Create account"
            accessibilityLabel="Create account"
            loadingLabel="Creating account…"
            loading={submitting}
            disabled={submitting || socialBusy || !email.trim() || !passwordMeetsRule || name.trim().length > 120}
            onPress={handleRegister}
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
