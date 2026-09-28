import React, {useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {requestPasswordResetCode} from '../api/auth';
import {emailError} from '../auth/validation';
import {AuthFormLayout, AuthHeader, AuthPrimaryButton, AuthRequestError, AuthTextField} from '../components/AuthUI';
import {authColors} from '../theme/auth';

type Props = {
  initialEmail: string;
  focusEmail?: boolean;
  onBack: (email: string) => void;
  onCodeSent: (email: string) => void;
};

export function ForgotPasswordScreen({initialEmail, focusEmail = false, onBack, onCodeSent}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSendCode() {
    if (submittingRef.current) return;
    const nextError = emailError(email);
    setFieldError(nextError);
    if (nextError) return;

    submittingRef.current = true;
    setSubmitting(true);
    setRequestError(null);
    const normalizedEmail = email.trim();
    try {
      await requestPasswordResetCode(normalizedEmail);
      onCodeSent(normalizedEmail);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not send a code. Try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthFormLayout>
      <AuthHeader
        title="Reset password"
        subtitle="Enter your account email. We’ll send a 6-digit code to reset your password."
        onBack={() => { if (!submittingRef.current) onBack(email.trim()); }}
        hideBrand
      />
      <View style={styles.form}>
        <AuthTextField
          label="Email"
          value={email}
          error={fieldError}
          onChangeText={value => {
            setEmail(value);
            setFieldError(undefined);
            setRequestError(null);
          }}
          onBlur={() => setFieldError(emailError(email))}
          autoFocus={focusEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSendCode}
          editable={!submitting}
          placeholder="you@email.com"
        />
        {requestError ? <View style={styles.notice}><AuthRequestError message={requestError} /></View> : null}
        <View style={styles.submitArea}>
          <AuthPrimaryButton
            label="Send code"
            loadingLabel="Sending code…"
            loading={submitting}
            disabled={submitting || !email.trim()}
            onPress={handleSendCode}
          />
        </View>
      </View>
      <View style={styles.flexSpace} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Remembered it?</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign in" disabled={submitting} onPress={() => onBack(email.trim())} style={styles.footerLink}>
          <Text style={[styles.footerLinkText, submitting && styles.footerLinkDisabled]}>Sign in</Text>
        </Pressable>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  form: {marginTop: 12},
  notice: {marginTop: 20},
  submitArea: {marginTop: 24},
  flexSpace: {flexGrow: 1, minHeight: 32},
  footer: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap'},
  footerText: {color: authColors.textSecondary, fontSize: 13.5},
  footerLink: {minHeight: 44, paddingHorizontal: 6, justifyContent: 'center'},
  footerLinkText: {color: authColors.focus, fontSize: 13.5, fontWeight: '700'},
  footerLinkDisabled: {opacity: 0.4},
});
