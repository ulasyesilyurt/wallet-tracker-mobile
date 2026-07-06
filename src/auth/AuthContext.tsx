import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  storeAccessToken,
} from './authStorage';
import {getAuthenticatedUser, loginWithEmail, registerWithEmail} from '../api/auth';
import {setSessionAccessToken, setSessionUser} from './session';
import type {AuthUser} from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isInitializing: boolean;
  login: (payload: {email: string; password: string}) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function applyAuthenticatedSession(accessToken: string) {
  setSessionAccessToken(accessToken);
  const user = await getAuthenticatedUser();
  setSessionUser(user);
  await storeAccessToken(accessToken);

  return user;
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

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
      async login(payload) {
        const response = await loginWithEmail(payload);
        const nextUser = await applyAuthenticatedSession(response.accessToken);
        setUser(nextUser);
      },
      async register(payload) {
        const response = await registerWithEmail(payload);
        const nextUser = await applyAuthenticatedSession(response.accessToken);
        setUser(nextUser);
      },
      async logout() {
        await clearStoredAccessToken();
        setSessionAccessToken(null);
        setSessionUser(null);
        setUser(null);
      },
    }),
    [isInitializing, user],
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
