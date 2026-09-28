import React, {useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {resetPasswordWithCode} from '../api/auth';
import {ApiError} from '../api/client';
import {newPasswordError} from '../auth/validation';
import {AuthHeader, AuthNotice, AuthScaffold, PasswordField, PasswordRules, PrimaryAuthButton} from '../components/AuthUI';
import {authColors} from '../theme/auth';

type Props = {
  email: string;
  code: string;
  onBack: () => void;
  onInvalidCode: () => void;
  onResetSuccess: () => void;
};

export function NewPasswordScreen({email, code, onBack, onInvalidCode, onResetSuccess}: Props) {
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const passwordMeetsRule = password.length >= 8;

  async function handleSave() {
    if (submittingRef.current) return;
    const nextError = newPasswordError(password);
    setFieldError(nextError);
    if (nextError) return;

    submittingRef.current = true;
    setSubmitting(true);
    setRequestError(null);
    try {
      await resetPasswordWithCode({email, code, newPassword: password});
      onResetSuccess();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_INVALID_CODE') {
        onInvalidCode();
      } else {
        setRequestError(error instanceof Error ? error.message : 'Could not save your password. Try again.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthScaffold
      testID="newPassword"
      navLeading="back"
      onBack={() => { if (!submittingRef.current) onBack(); }}
      backDisabled={submitting}>
      <AuthHeader
        title="Set a new password"
        subtitle={`For ${email}`}
        showNavigationRow={false}
        showLogo={false}
      />
      <View style={styles.form}>
        <PasswordField
          variant="new"
          label="New password"
          value={password}
          error={fieldError}
          onChangeText={value => {
            setPassword(value);
            setFieldError(undefined);
            setRequestError(null);
          }}
          onBlur={() => setFieldError(newPasswordError(password))}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          editable={!submitting}
          placeholder="New password"
        />
        <PasswordRules password={password} />
        {requestError ? <View style={styles.notice}><AuthNotice tone="error" message={requestError} /></View> : null}
        <View style={styles.submitArea}>
          <PrimaryAuthButton
            label="Save new password"
            accessibilityLabel="Save new password"
            loadingLabel="Saving password…"
            loading={submitting}
            disabled={submitting || !passwordMeetsRule}
            onPress={handleSave}
          />
          <Text style={styles.helper}>Sign in with your new password after saving.</Text>
        </View>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: {marginTop: 24},
  notice: {marginTop: 20},
  submitArea: {marginTop: 24},
  helper: {color: authColors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 14},
});
