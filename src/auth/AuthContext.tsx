import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  ApiError,
  subscribeToEmailVerificationRequired,
  subscribeToSessionInvalidated,
  subscribeToSessionRefreshed,
} from '../api/client';
import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeAuthTokens,
} from './authStorage';
import {
  getAuthenticatedUser,
  loginWithApple,
  loginWithEmail,
  loginWithGoogle,
  logoutCurrentSession,
  registerWithEmail,
  verifyEmailVerificationCode,
} from '../api/auth';
import type {AuthResponse} from '../api/auth';
import {requestAppleIdentity} from './appleProvider';
import {requestGoogleIdentity} from './googleProvider';
import {getSessionAccessToken, getSessionUser, setSessionAccessToken, setSessionUser} from './session';
import type {AuthUser} from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isInitializing: boolean;
  verificationEntryMode: 'register' | 'signin' | null;
  login: (payload: {email: string; password: string}) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<void>;
  signInWithApple: () => Promise<{status: 'cancelled' | 'success'}>;
  signInWithGoogle: () => Promise<{status: 'cancelled' | 'success'}>;
  consumeInitialVerificationCodeRequest: (userId: string) => boolean;
  verifyEmail: (code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function applyAuthenticatedSession(
  accessToken: string,
  authUser?: AuthUser,
  refreshToken?: string | null,
  isCurrent: () => boolean = () => true,
): Promise<AuthUser | null> {
  if (!isCurrent()) return null;
  setSessionAccessToken(accessToken);
  if (refreshToken !== undefined) await storeAuthTokens(accessToken, refreshToken);
  if (!isCurrent()) return null;
  const meUser = await getAuthenticatedUser();
  if (!isCurrent()) return null;
  // Keep the auth response's verification status if /auth/me omits this newer field.
  const user = typeof meUser.emailVerified === 'boolean' ||
    typeof authUser?.emailVerified !== 'boolean' ||
    authUser.id !== meUser.id
    ? meUser
    : {...meUser, emailVerified: authUser.emailVerified};
  setSessionUser(user);

  return user;
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [verificationEntryMode, setVerificationEntryMode] = useState<'register' | 'signin' | null>(null);
  const initialVerificationCodeRequestUserId = useRef<string | null>(null);
  const sessionEpoch = useRef(0);

  useEffect(() => {
    const unsubscribeVerification = subscribeToEmailVerificationRequired(() => {
      const sessionUser = getSessionUser();
      if (sessionUser && sessionUser.emailVerified !== false) {
        setSessionUser({...sessionUser, emailVerified: false});
      }
      setUser(currentUser => {
        if (!currentUser || currentUser.emailVerified === false) return currentUser;
        return {...currentUser, emailVerified: false};
      });
    });
    const unsubscribeInvalidation = subscribeToSessionInvalidated(() => {
      sessionEpoch.current += 1;
      initialVerificationCodeRequestUserId.current = null;
      setVerificationEntryMode(null);
      setUser(null);
    });
    const unsubscribeRefresh = subscribeToSessionRefreshed(nextUser => {
      setUser(currentUser => currentUser?.id === nextUser.id ? nextUser : currentUser);
    });
    return () => {
      unsubscribeVerification();
      unsubscribeInvalidation();
      unsubscribeRefresh();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      const epoch = sessionEpoch.current;
      try {
        const storedAccessToken = await getStoredAccessToken();
        const storedRefreshToken = await getStoredRefreshToken();

        if (!storedAccessToken) {
          if (storedRefreshToken) await clearStoredAuthTokens();
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const nextUser = await applyAuthenticatedSession(
          storedAccessToken, undefined, undefined, () => !cancelled && epoch === sessionEpoch.current,
        );

        if (nextUser && !cancelled && epoch === sessionEpoch.current) {
          setUser(nextUser);
        }
      } catch (error) {
        // Retain secure credentials after network/server failures so a later launch can restore.
        if (error instanceof ApiError && error.status === 401 && getSessionAccessToken()) {
          await clearStoredAuthTokens();
        }
        setSessionAccessToken(null);
        setSessionUser(null);

        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  async function completeInteractiveSession(
    response: AuthResponse,
    mode: 'register' | 'signin',
    epoch: number,
  ) {
    const nextUser = await applyAuthenticatedSession(
      response.accessToken, response.user, response.refreshToken ?? null,
      () => epoch === sessionEpoch.current,
    );
    if (!nextUser) return;
    initialVerificationCodeRequestUserId.current = nextUser.emailVerified !== true ? nextUser.id : null;
    setVerificationEntryMode(nextUser.emailVerified !== true ? mode : null);
    setUser(nextUser);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      verificationEntryMode,
      async login(payload) {
        const epoch = sessionEpoch.current;
        const response = await loginWithEmail(payload);
        await completeInteractiveSession(response, 'signin', epoch);
      },
      async register(payload) {
        const epoch = sessionEpoch.current;
        const response = await registerWithEmail(payload);
        await completeInteractiveSession(response, 'register', epoch);
      },
      async signInWithApple() {
        const epoch = sessionEpoch.current;
        const providerResult = await requestAppleIdentity();
        if (providerResult.status === 'cancelled') return {status: 'cancelled'};
        const response = await loginWithApple(providerResult.credential);
        await completeInteractiveSession(response, 'signin', epoch);
        return {status: 'success'};
      },
      async signInWithGoogle() {
        const epoch = sessionEpoch.current;
        const providerResult = await requestGoogleIdentity();
        if (providerResult.status === 'cancelled') return {status: 'cancelled'};
        const response = await loginWithGoogle(providerResult.credential.idToken);
        await completeInteractiveSession(response, 'signin', epoch);
        return {status: 'success'};
      },
      consumeInitialVerificationCodeRequest(userId) {
        if (initialVerificationCodeRequestUserId.current !== userId) return false;
        initialVerificationCodeRequestUserId.current = null;
        return true;
      },
      async verifyEmail(code) {
        const epoch = sessionEpoch.current;
        const verifiedUser = await verifyEmailVerificationCode(code);
        if (epoch !== sessionEpoch.current) return;
        if (verifiedUser.emailVerified !== true) {
          throw new Error('Could not confirm email verification. Try again.');
        }
        initialVerificationCodeRequestUserId.current = null;
        setVerificationEntryMode(null);
        setSessionUser(verifiedUser);
        setUser(verifiedUser);
      },
      async logout() {
        if (getSessionAccessToken()) logoutCurrentSession().catch(() => {});
        sessionEpoch.current += 1;
        initialVerificationCodeRequestUserId.current = null;
        setVerificationEntryMode(null);
        setSessionAccessToken(null);
        setSessionUser(null);
        setUser(null);
        await clearStoredAuthTokens();
      },
    }),
    [isInitializing, user, verificationEntryMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
