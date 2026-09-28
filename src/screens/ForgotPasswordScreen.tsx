import React, {useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {requestPasswordResetCode} from '../api/auth';
import {emailError} from '../auth/validation';
import {AuthFooterLink, AuthHeader, AuthNotice, AuthScaffold, AuthTextField, PrimaryAuthButton} from '../components/AuthUI';

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
    <AuthScaffold
      testID="forgotPassword"
      navLeading="back"
      onBack={() => { if (!submittingRef.current) onBack(email.trim()); }}
      backDisabled={submitting}
      footer={<AuthFooterLink prompt="Remembered it?" linkLabel="Sign in" onPress={() => onBack(email.trim())} disabled={submitting} />}>
      <AuthHeader
        title="Reset password"
        subtitle="Enter your account email. We’ll send a 6-digit code to reset your password."
        showNavigationRow={false}
        showLogo={false}
      />
      <View style={styles.form}>
        <AuthTextField
          label="Email"
          emailPreset
          value={email}
          error={fieldError}
          onChangeText={value => {
            setEmail(value);
            setFieldError(undefined);
            setRequestError(null);
          }}
          onBlur={() => setFieldError(emailError(email))}
          autoFocus={focusEmail}
          returnKeyType="send"
          onSubmitEditing={handleSendCode}
          editable={!submitting}
          placeholder="you@email.com"
        />
        {requestError ? <View style={styles.notice}><AuthNotice tone="error" message={requestError} /></View> : null}
        <View style={styles.submitArea}>
          <PrimaryAuthButton
            label="Send code"
            accessibilityLabel="Send code"
            loadingLabel="Sending code…"
            loading={submitting}
            disabled={submitting || !email.trim()}
            onPress={handleSendCode}
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
