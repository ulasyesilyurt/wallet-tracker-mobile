import React, {useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {resetPasswordWithCode} from '../api/auth';
import {ApiError} from '../api/client';
import {newPasswordError} from '../auth/validation';
import {AuthFormLayout, AuthHeader, AuthPasswordToggle, AuthPrimaryButton, AuthRequestError, AuthTextField} from '../components/AuthUI';
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
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthFormLayout>
      <AuthHeader
        title="Set a new password"
        subtitle={`For ${email}`}
        onBack={() => { if (!submittingRef.current) onBack(); }}
        backLabel="Back to code"
        hideBrand
      />
      <View style={styles.form}>
        <AuthTextField
          label="New password"
          value={password}
          error={fieldError}
          onChangeText={value => {
            setPassword(value);
            setFieldError(undefined);
            setRequestError(null);
          }}
          onBlur={() => setFieldError(newPasswordError(password))}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry={!showPassword}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          editable={!submitting}
          placeholder="New password"
          accessory={<AuthPasswordToggle visible={showPassword} disabled={submitting} onPress={() => setShowPassword(value => !value)} />}
        />
        <View style={styles.passwordRule}>
          <Ionicons name={passwordMeetsRule ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={passwordMeetsRule ? '#35C995' : authColors.textTertiary} />
          <Text style={styles.passwordRuleText}>8+ characters</Text>
        </View>
        {requestError ? <View style={styles.notice}><AuthRequestError message={requestError} /></View> : null}
        <View style={styles.submitArea}>
          <AuthPrimaryButton
            label="Save new password"
            loadingLabel="Saving password…"
            loading={submitting}
            disabled={submitting || !passwordMeetsRule}
            onPress={handleSave}
          />
          <Text style={styles.helper}>Sign in with your new password after saving.</Text>
        </View>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  form: {marginTop: 24},
  passwordRule: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10},
  passwordRuleText: {color: authColors.textSecondary, fontSize: 12},
  notice: {marginTop: 20},
  submitArea: {marginTop: 24},
  helper: {color: authColors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 14},
});
