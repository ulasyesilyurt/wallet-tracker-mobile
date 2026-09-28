import React, {useRef, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {classifyAuthError} from '../auth/authErrors';
import {hasAuthFieldErrors, validateRegistration, type AuthFieldErrors} from '../auth/validation';
import {
  AuthFooterLink,
  AuthHeader,
  AuthNotice,
  AuthScaffold,
  AuthTextField,
  PasswordField,
  PasswordRules,
  PrimaryAuthButton,
} from '../components/AuthUI';

type RegisterScreenProps = {
  onShowLogin: () => void;
};

export function RegisterScreen({onShowLogin}: RegisterScreenProps) {
  const {register} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const submittingRef = useRef(false);
  const passwordInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const passwordMeetsRule = password.length >= 8;

  async function handleRegister() {
    if (submittingRef.current) return;

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
      backDisabled={submitting}
      footer={<AuthFooterLink prompt="Already have an account?" linkLabel="Sign in" onPress={onShowLogin} disabled={submitting} />}>
      <AuthHeader
        title="Create account"
        subtitle="Follow wallets. Get alerted in real time."
        showNavigationRow={false}
      />

      <View style={styles.form}>
        <AuthTextField
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
          editable={!submitting}
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
          editable={!submitting}
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
          editable={!submitting}
          placeholder="What should we call you?"
        />

        {error ? <View style={styles.notice}><AuthNotice tone="error" message={error} action={accountExists ? {label: 'Sign in', onPress: onShowLogin, testID: 'register.accountExists.signIn'} : undefined} /></View> : null}
        <View style={styles.submitArea}>
          <PrimaryAuthButton
            label="Create account"
            accessibilityLabel="Create account"
            loadingLabel="Creating account…"
            loading={submitting}
            disabled={submitting || !email.trim() || !passwordMeetsRule || name.trim().length > 120}
            onPress={handleRegister}
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
