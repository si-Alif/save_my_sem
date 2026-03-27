import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postJson } from '../lib/api/client';
import { TokenResponse } from '../lib/api/types';

interface AuthState {
  token: string | null;
  userId: number | null;
  login: (params: { email: string; password: string; userId?: number }) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const hasSecureStore = Platform.OS !== 'web' && typeof SecureStore?.getItemAsync === 'function';

async function persistToken(token: string | null) {
  if (token) {
    await AsyncStorage.setItem('auth_token', token);
    if (hasSecureStore) {
      await SecureStore.setItemAsync('auth_token', token);
    }
  } else {
    await AsyncStorage.removeItem('auth_token');
    if (hasSecureStore) {
      await SecureStore.deleteItemAsync('auth_token');
    }
  }
}

async function persistUserId(userId: number | null) {
  if (userId !== null) {
    await AsyncStorage.setItem('user_id', String(userId));
  } else {
    await AsyncStorage.removeItem('user_id');
  }
}

async function loadSession() {
  try {
    const [secureToken, asyncToken, userIdStr] = await Promise.all([
      hasSecureStore ? SecureStore.getItemAsync('auth_token') : Promise.resolve<string | null>(null),
      AsyncStorage.getItem('auth_token'),
      AsyncStorage.getItem('user_id'),
    ]);
    const token = secureToken ?? asyncToken ?? null;
    return { token, userId: userIdStr ? Number(userIdStr) : null };
  } catch (err) {
    console.warn('Session restore failed, falling back to AsyncStorage only', err);
    const [token, userIdStr] = await Promise.all([AsyncStorage.getItem('auth_token'), AsyncStorage.getItem('user_id')]);
    return { token: token ?? null, userId: userIdStr ? Number(userIdStr) : null };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadSession()
      .then(({ token, userId }) => {
        if (!mounted) return;
        setToken(token);
        setUserId(userId);
      })
      .catch((err) => {
        console.warn('Session load error', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = async ({ email, password, userId }: { email: string; password: string; userId?: number }) => {
    setLoading(true);
    try {
      const res = await postJson<TokenResponse>('/v1/tokens/authentication', { email, password });
      const t = res.authentication_token?.token;
      if (!t) throw new Error('Missing token');
      const uid = userId ?? res.authentication_token?.user_id ?? null;
      if (!uid) throw new Error('User ID is required (backend token response missing user_id)');
      setToken(t);
      setUserId(uid);
      await persistToken(t);
      await persistUserId(uid);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setUserId(null);
    await persistToken(null);
    await persistUserId(null);
  };

  const value = useMemo(() => ({ token, userId, login, logout, loading }), [token, userId, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
