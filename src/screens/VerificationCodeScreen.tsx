import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {requestEmailVerificationCode, requestPasswordResetCode} from '../api/auth';
import {useAuth} from '../auth/AuthContext';
import {classifyAuthError, type AuthErrorKind} from '../auth/authErrors';
import {verificationModes, type VerificationMode} from '../auth/verificationModes';
import {AuthHeader, AuthNotice, AuthScaffold, AuthTextLink} from '../components/AuthUI';
import {authColors} from '../theme/auth';

type Props = {
  mode: VerificationMode;
  email: string;
  initialError?: string | null;
  initialCooldownEndsAt?: number | null;
  onBack?: () => void;
  onCodeRequested?: (cooldownEndsAt: number) => void;
  onCodeEntered?: (code: string) => void;
  onVerified?: () => void;
  shouldRequestInitialCode?: () => boolean;
  onSignOut?: () => void;
  onChangeEmail?: () => void;
};

const RESEND_SECONDS = 60;

export function VerificationCodeScreen({mode, email, initialError, initialCooldownEndsAt, onBack, onCodeRequested, onCodeEntered, onVerified, shouldRequestInitialCode, onSignOut, onChangeEmail}: Props) {
  const {verifyEmail} = useAuth();
  const modeCopy = verificationModes[mode];
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
  const [requestErrorKind, setRequestErrorKind] = useState<AuthErrorKind | null>(null);
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
    setRequestErrorKind(null);
    try {
      if (mode !== 'reset') {
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
      const kind = classifyAuthError(error);
      setRequestErrorKind(kind);
      setRequestError(kind === 'verificationRequestLimited' ? 'Too many code requests. Try again in a minute.' :
        kind === 'rateLimited' ? 'Too many requests. Try again in a minute.' :
        kind === 'networkFailure' ? 'Could not send a code. Check your connection and try again.' :
        'Could not send a code. Try again.');
      if (kind === 'verificationRequestLimited' || kind === 'rateLimited') {
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
    if (requestedOnMount.current) return;
    requestedOnMount.current = true;
    if (modeCopy.allowsInitialCodeRequest) {
      if (shouldRequestInitialCode?.()) sendCode();
      else setFocusWhenEditable(true);
    } else if (mode === 'restored') {
      setFocusWhenEditable(true);
    }
  }, [mode, modeCopy.allowsInitialCodeRequest, sendCode, shouldRequestInitialCode]);

  useEffect(() => {
    if (modeCopy.showsBack) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [modeCopy.showsBack]);

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
    setRequestErrorKind(null);
    try {
      await verifyEmail(nextCode);
      if (!mounted.current) return;
      onVerified?.();
    } catch (error) {
      if (!mounted.current) return;
      const kind = classifyAuthError(error);
      if (kind === 'invalidCode') {
        setCodeError('That code didn’t match. Try again or resend.');
        setCode('');
        lastSubmitted.current = '';
      } else {
        setRequestErrorKind(kind);
        setRequestError(kind === 'networkFailure' ? 'Could not verify the code. Check your connection and try again.' :
          kind === 'rateLimited' || kind === 'verificationRequestLimited' ? 'Too many attempts. Please wait before trying again.' :
          'Could not verify the code. Try again.');
        lastSubmitted.current = '';
      }
      setFocusWhenEditable(true);
    } finally {
      verifyInFlight.current = false;
      if (mounted.current) setVerifying(false);
    }
  }

  function handleCodeChange(value: string) {
    if (verifying || requesting) return;
    const nextCode = value.replace(/\D/g, '').slice(0, 6);
    setCode(nextCode);
    setCodeError(null);
    setRequestError(null);
    setRequestErrorKind(null);
    if (nextCode.length === 6 && nextCode !== lastSubmitted.current) {
      lastSubmitted.current = nextCode;
      checkCode(nextCode);
    }
  }

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const busy = requesting || verifying;

  return (
    <AuthScaffold
      testID="verification"
      navLeading={modeCopy.showsBack ? 'back' : 'none'}
      onBack={modeCopy.showsBack ? () => { if (!verifying) onBack?.(); } : undefined}
      backDisabled={verifying}
      navTrailing={modeCopy.showsSignOut && onSignOut ? {label: 'Sign out', onPress: onSignOut} : undefined}
      topSpacing={20}>
      <AuthHeader
        title={modeCopy.title}
        subtitle={modeCopy.subtitle}
        showNavigationRow={false}
        hideBrand
      />
      <View style={styles.emailRow}>
        <Text style={styles.email} numberOfLines={1}>{email}</Text>
        <AuthTextLink
          label={mode === 'reset' ? 'Change email' : modeCopy.emailActionLabel}
          disabled={busy}
          onPress={mode === 'reset' ? () => onBack?.() : () => onChangeEmail?.()}
        />
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
          <View style={styles.resendRow}>
            {codeRequested ? <Text style={styles.resendPrompt}>Didn’t get it?</Text> : null}
            <AuthTextLink label={codeRequested ? 'Resend code' : 'Send code'} disabled={busy} onPress={() => { sendCode(); }} />
          </View>
        )}
        {requestError ? <View style={styles.requestNotice}><AuthNotice tone={requestErrorKind === 'verificationRequestLimited' || requestErrorKind === 'rateLimited' ? 'warning' : 'error'} message={requestError} /></View> : null}
      </View>

      <View style={styles.secondaryArea}>
        <Text style={styles.hint}>Not there? Check spam or promotions.</Text>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  emailRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2},
  email: {color: authColors.text, fontSize: 14, fontWeight: '700'},
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
  resendPrompt: {color: authColors.textTertiary, fontSize: 13},
  statusText: {color: authColors.textTertiary, fontSize: 13},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12},
  resendRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4},
  requestNotice: {marginTop: 20},
  secondaryArea: {marginTop: 30},
  hint: {color: authColors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 14},
});
