import React, {useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../auth/AuthContext';
import {hasAuthFieldErrors, validateRegistration, type AuthFieldErrors} from '../auth/validation';
import {
  AuthFormLayout,
  AuthHeader,
  AuthPasswordToggle,
  AuthPrimaryButton,
  AuthRequestError,
  AuthTextField,
} from '../components/AuthUI';
import {authColors} from '../theme/auth';

type RegisterScreenProps = {
  onShowLogin: () => void;
  onRegistered: () => void;
};

export function RegisterScreen({onShowLogin, onRegistered}: RegisterScreenProps) {
  const {register} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      onRegistered();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Could not create account');
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
  }

  return (
    <AuthFormLayout>
      <AuthHeader
        title="Create account"
        subtitle="Follow wallets. Get alerted in real time."
        onBack={onShowLogin}
      />

      <View style={styles.form}>
        <AuthTextField
          label="Email"
          error={fieldErrors.email}
          value={email}
          onChangeText={value => updateField('email', value)}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            email: validateRegistration(email, password, name).email,
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
          onChangeText={value => updateField('password', value)}
          onBlur={() => setFieldErrors(current => ({
            ...current,
            password: validateRegistration(email, password, name).password,
          }))}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry={!showPassword}
          returnKeyType="next"
          onSubmitEditing={() => nameInputRef.current?.focus()}
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
        <View style={styles.passwordRule}>
          <Ionicons
            name={passwordMeetsRule ? 'checkmark-circle' : 'ellipse-outline'}
            size={15}
            color={passwordMeetsRule ? '#35C995' : authColors.textTertiary}
          />
          <Text style={styles.passwordRuleText}>8+ characters</Text>
        </View>
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

        {error ? <View style={styles.notice}><AuthRequestError message={error} /></View> : null}
        <View style={styles.submitArea}>
          <AuthPrimaryButton
            label="Create account"
            loadingLabel="Creating account…"
            loading={submitting}
            disabled={submitting || !email.trim() || !passwordMeetsRule || name.trim().length > 120}
            onPress={handleRegister}
          />
        </View>
      </View>

      <View style={styles.flexSpace} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          disabled={submitting}
          onPress={onShowLogin}
          style={styles.footerLink}>
          <Text style={[styles.footerLinkText, submitting && styles.footerLinkDisabled]}>Sign in</Text>
        </Pressable>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  form: {marginTop: 12},
  passwordRule: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10},
  passwordRuleText: {color: authColors.textSecondary, fontSize: 12},
  notice: {marginTop: 20},
  submitArea: {marginTop: 24},
  flexSpace: {flexGrow: 1, minHeight: 32},
  footer: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap'},
  footerText: {color: authColors.textSecondary, fontSize: 13.5},
  footerLink: {minHeight: 44, paddingHorizontal: 6, justifyContent: 'center'},
  footerLinkText: {color: authColors.focus, fontSize: 13.5, fontWeight: '700'},
  footerLinkDisabled: {opacity: 0.4},
});
