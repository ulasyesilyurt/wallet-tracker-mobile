import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {requestEmailVerificationCode, requestPasswordResetCode} from '../api/auth';
import {ApiError} from '../api/client';
import {useAuth} from '../auth/AuthContext';
import {AuthFormLayout, AuthHeader, AuthRequestError} from '../components/AuthUI';
import {authColors} from '../theme/auth';

type Props = {
  mode: 'email' | 'reset';
  email: string;
  initialError?: string | null;
  initialCooldownEndsAt?: number | null;
  onBack?: () => void;
  onCodeRequested?: (cooldownEndsAt: number) => void;
  onCodeEntered?: (code: string) => void;
  onVerified?: () => void;
};

const RESEND_SECONDS = 60;

export function VerificationCodeScreen({mode, email, initialError, initialCooldownEndsAt, onBack, onCodeRequested, onCodeEntered, onVerified}: Props) {
  const {verifyEmail} = useAuth();
  const inputRef = useRef<TextInput>(null);
  const requestInFlight = useRef(false);
  const verifyInFlight = useRef(false);
  const mounted = useRef(true);
  const requestedOnMount = useRef(false);
  const lastSubmitted = useRef('');
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [focusWhenEditable, setFocusWhenEditable] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(initialError ?? null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [codeRequested, setCodeRequested] = useState(mode === 'reset');
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(
    mode === 'reset' ? initialCooldownEndsAt ?? Date.now() + RESEND_SECONDS * 1000 : null,
  );
  const [secondsLeft, setSecondsLeft] = useState(mode === 'reset'
    ? Math.max(0, Math.ceil(((initialCooldownEndsAt ?? Date.now() + RESEND_SECONDS * 1000) - Date.now()) / 1000))
    : 0);

  const sendCode = useCallback(async () => {
    if (requestInFlight.current || verifyInFlight.current) return;
    requestInFlight.current = true;
    setRequesting(true);
    setRequestError(null);
    try {
      if (mode === 'email') {
        await requestEmailVerificationCode();
      } else {
        await requestPasswordResetCode(email);
      }
      if (!mounted.current) return;
      const nextCooldownEndsAt = Date.now() + RESEND_SECONDS * 1000;
      setCooldownEndsAt(nextCooldownEndsAt);
      setSecondsLeft(RESEND_SECONDS);
      setCodeRequested(true);
      onCodeRequested?.(nextCooldownEndsAt);
      setCode('');
      setCodeError(null);
      lastSubmitted.current = '';
      setFocusWhenEditable(true);
    } catch (error) {
      if (!mounted.current) return;
      setRequestError(error instanceof Error ? error.message : 'Could not send a code. Try again.');
      if (error instanceof ApiError && error.code === 'AUTH_CODE_REQUEST_LIMITED') {
        setCooldownEndsAt(Date.now() + RESEND_SECONDS * 1000);
        setSecondsLeft(RESEND_SECONDS);
      }
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setRequesting(false);
    }
  }, [email, mode, onCodeRequested]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (mode === 'email' && !requestedOnMount.current) {
      requestedOnMount.current = true;
      sendCode();
    }
  }, [mode, sendCode]);

  useEffect(() => {
    if (focusWhenEditable && !requesting && !verifying) {
      setFocusWhenEditable(false);
      inputRef.current?.focus();
    }
  }, [focusWhenEditable, requesting, verifying]);

  useEffect(() => {
    if (cooldownEndsAt === null) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [cooldownEndsAt]);

  async function checkCode(nextCode: string) {
    if (verifyInFlight.current) return;
    if (mode === 'reset') {
      onCodeEntered?.(nextCode);
      return;
    }

    verifyInFlight.current = true;
    setVerifying(true);
    setRequestError(null);
    try {
      await verifyEmail(nextCode);
      onVerified?.();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_INVALID_CODE') {
        setCodeError('That code didn’t match or has expired. Try again or resend.');
        setCode('');
        lastSubmitted.current = '';
      } else {
        setRequestError(error instanceof Error ? error.message : 'Could not verify the code. Try again.');
        lastSubmitted.current = '';
      }
      setFocusWhenEditable(true);
    } finally {
      verifyInFlight.current = false;
      setVerifying(false);
    }
  }

  function handleCodeChange(value: string) {
    if (verifying || requesting) return;
    const nextCode = value.replace(/\D/g, '').slice(0, 6);
    setCode(nextCode);
    setCodeError(null);
    setRequestError(null);
    if (nextCode.length === 6 && nextCode !== lastSubmitted.current) {
      lastSubmitted.current = nextCode;
      checkCode(nextCode);
    }
  }

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const busy = requesting || verifying;

  return (
    <AuthFormLayout>
      <AuthHeader
        title="Check your email"
        subtitle={mode === 'reset'
          ? 'If an account exists for this email, a 6-digit code is on its way.'
          : codeRequested ? 'Enter the 6-digit code we sent to' : 'We’ll send a 6-digit code to'}
        onBack={mode === 'reset' ? () => { if (!verifying) onBack?.(); } : undefined}
        backLabel="Back to email"
        hideBrand
      />
      <View style={styles.emailRow}>
        <Text style={styles.email} numberOfLines={1}>{email}</Text>
        {mode === 'reset' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Change email" disabled={busy} onPress={onBack} style={styles.changeButton}>
            <Text style={styles.link}>Change</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.codeArea}>
        <Pressable onPress={() => { if (!busy) inputRef.current?.focus(); }} style={styles.cells} accessible={false}>
          {Array.from({length: 6}, (_, index) => (
            <View key={index} style={[
              styles.cell,
              focused && !busy && code.length === index && styles.cellActive,
              codeError && styles.cellError,
              busy && styles.cellBusy,
            ]} accessible={false}>
              {code[index] ? <Text style={styles.digit}>{code[index]}</Text> : null}
              {focused && !busy && code.length === index ? <View style={styles.caret} /> : null}
            </View>
          ))}
          <TextInput
            ref={inputRef}
            accessibilityLabel="6-digit verification code"
            value={code}
            onChangeText={handleCodeChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === 'ios' ? 'one-time-code' : 'sms-otp'}
            importantForAutofill="yes"
            autoFocus={mode === 'reset'}
            editable={!busy}
            caretHidden
            pointerEvents="none"
            style={styles.hiddenInput}
          />
        </Pressable>
        {codeError ? <Text style={styles.codeError} accessibilityLiveRegion="polite">{codeError}</Text> : null}
        {verifying ? (
          <View style={styles.statusRow}><ActivityIndicator size="small" color={authColors.focus} /><Text style={styles.statusText}>Verifying…</Text></View>
        ) : requesting ? (
          <View style={styles.statusRow}><ActivityIndicator size="small" color={authColors.focus} /><Text style={styles.statusText}>Sending code…</Text></View>
        ) : secondsLeft > 0 ? (
          <Text style={styles.muted}>Resend code in {countdown}</Text>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Resend code" disabled={busy} onPress={() => { sendCode(); }} style={styles.resendButton}>
            <Text style={styles.muted}>Didn’t get it? <Text style={styles.link}>Resend code</Text></Text>
          </Pressable>
        )}
        {requestError ? <View style={styles.requestNotice}><AuthRequestError message={requestError} /></View> : null}
      </View>

      <View style={styles.secondaryArea}>
        <Text style={styles.hint}>Not there? Check spam or promotions.</Text>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  emailRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2},
  email: {color: authColors.text, fontSize: 14, fontWeight: '700'},
  changeButton: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 2},
  link: {color: authColors.focus, fontSize: 13.5, fontWeight: '700'},
  codeArea: {marginTop: 28},
  cells: {height: 56, flexDirection: 'row', gap: 8, position: 'relative'},
  cell: {flex: 1, maxWidth: 48, height: 56, borderRadius: 12, borderWidth: 1, borderColor: authColors.line, backgroundColor: authColors.surface, alignItems: 'center', justifyContent: 'center'},
  cellActive: {borderColor: authColors.focus},
  cellError: {borderColor: authColors.error},
  cellBusy: {opacity: 0.5},
  digit: {color: authColors.text, fontFamily: 'monospace', fontSize: 24, fontWeight: '600'},
  caret: {width: 2, height: 24, backgroundColor: authColors.focus},
  hiddenInput: {position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, color: 'transparent'},
  codeError: {color: authColors.error, fontSize: 12, lineHeight: 18, marginTop: 12},
  muted: {color: authColors.textTertiary, fontSize: 13, marginTop: 14},
  statusText: {color: authColors.textTertiary, fontSize: 13},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12},
  resendButton: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center'},
  requestNotice: {marginTop: 20},
  secondaryArea: {marginTop: 30},
  hint: {color: authColors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 14},
});
