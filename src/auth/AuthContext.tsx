import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {subscribeToEmailVerificationRequired} from '../api/client';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  storeAccessToken,
} from './authStorage';
import {
  getAuthenticatedUser,
  loginWithEmail,
  registerWithEmail,
  verifyEmailVerificationCode,
} from '../api/auth';
import {getSessionUser, setSessionAccessToken, setSessionUser} from './session';
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
  consumeInitialVerificationCodeRequest: (userId: string) => boolean;
  verifyEmail: (code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function applyAuthenticatedSession(accessToken: string, authUser?: AuthUser) {
  setSessionAccessToken(accessToken);
  const meUser = await getAuthenticatedUser();
  // Keep the auth response's verification status if /auth/me omits this newer field.
  const user = typeof meUser.emailVerified === 'boolean' ||
    typeof authUser?.emailVerified !== 'boolean' ||
    authUser.id !== meUser.id
    ? meUser
    : {...meUser, emailVerified: authUser.emailVerified};
  setSessionUser(user);
  await storeAccessToken(accessToken);

  return user;
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [verificationEntryMode, setVerificationEntryMode] = useState<'register' | 'signin' | null>(null);
  const initialVerificationCodeRequestUserId = useRef<string | null>(null);
  const sessionEpoch = useRef(0);

  useEffect(() => subscribeToEmailVerificationRequired(() => {
    const sessionUser = getSessionUser();
    if (sessionUser && sessionUser.emailVerified !== false) {
      setSessionUser({...sessionUser, emailVerified: false});
    }
    setUser(currentUser => {
      if (!currentUser || currentUser.emailVerified === false) return currentUser;
      return {...currentUser, emailVerified: false};
    });
  }), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      try {
        const storedAccessToken = await getStoredAccessToken();

        if (!storedAccessToken) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const nextUser = await applyAuthenticatedSession(storedAccessToken);

        if (!cancelled) {
          setUser(nextUser);
        }
      } catch (error) {
        console.log('[auth] restoring session failed', error);
        await clearStoredAccessToken();
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      verificationEntryMode,
      async login(payload) {
        const response = await loginWithEmail(payload);
        const nextUser = await applyAuthenticatedSession(response.accessToken, response.user);
        initialVerificationCodeRequestUserId.current = nextUser.emailVerified !== true ? nextUser.id : null;
        setVerificationEntryMode(nextUser.emailVerified !== true ? 'signin' : null);
        setUser(nextUser);
      },
      async register(payload) {
        const response = await registerWithEmail(payload);
        const nextUser = await applyAuthenticatedSession(response.accessToken, response.user);
        initialVerificationCodeRequestUserId.current = nextUser.emailVerified !== true ? nextUser.id : null;
        setVerificationEntryMode(nextUser.emailVerified !== true ? 'register' : null);
        setUser(nextUser);
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
        sessionEpoch.current += 1;
        initialVerificationCodeRequestUserId.current = null;
        setVerificationEntryMode(null);
        setSessionAccessToken(null);
        setSessionUser(null);
        setUser(null);
        await clearStoredAccessToken();
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
