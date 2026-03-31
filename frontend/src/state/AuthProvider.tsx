import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postJson } from '../lib/api/client';
import { AuthUser, TokenResponse } from '../lib/api/types';
import { DEFAULT_SEMESTER_KEY, isValidSemesterKey, normalizeSemesterKey } from '../lib/semester';

interface AuthState {
  token: string | null;
  userId: number | null;
  userInfo: AuthUser | null;
  semesterKey: string;
  setSemesterKey: (semesterKey: string) => Promise<void>;
  login: (params: { email: string; password: string }) => Promise<void>;
  register: (params: { fullname: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  authBusy: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const hasSecureStore = Platform.OS !== 'web' && typeof SecureStore?.getItemAsync === 'function';
const tokenStorageKey = 'auth_token';
const tokenExpiryStorageKey = 'auth_token_expiry';
const userIDStorageKey = 'user_id';
const userInfoStorageKey = 'user_info';
const semesterStorageKey = 'semester_key';

async function persistToken(token: string | null) {
  if (token) {
    await AsyncStorage.setItem(tokenStorageKey, token);
    if (hasSecureStore) {
      await SecureStore.setItemAsync(tokenStorageKey, token);
    }
  } else {
    await AsyncStorage.removeItem(tokenStorageKey);
    if (hasSecureStore) {
      await SecureStore.deleteItemAsync(tokenStorageKey);
    }
  }
}

async function persistTokenExpiry(expiry: string | null) {
  if (expiry) {
    await AsyncStorage.setItem(tokenExpiryStorageKey, expiry);
  } else {
    await AsyncStorage.removeItem(tokenExpiryStorageKey);
  }
}

async function persistUserId(userId: number | null) {
  if (userId !== null) {
    await AsyncStorage.setItem(userIDStorageKey, String(userId));
  } else {
    await AsyncStorage.removeItem(userIDStorageKey);
  }
}

async function persistUserInfo(userInfo: AuthUser | null) {
  if (userInfo) {
    await AsyncStorage.setItem(userInfoStorageKey, JSON.stringify(userInfo));
  } else {
    await AsyncStorage.removeItem(userInfoStorageKey);
  }
}

async function persistSemesterKey(semesterKey: string) {
  await AsyncStorage.setItem(semesterStorageKey, semesterKey);
}

async function clearPersistedAuthSession() {
  await Promise.all([
    persistToken(null),
    persistTokenExpiry(null),
    persistUserId(null),
    persistUserInfo(null),
  ]);
}

function readSemesterKeyOrDefault(value: string | null) {
  if (!value) return DEFAULT_SEMESTER_KEY;
  const normalized = normalizeSemesterKey(value);
  return isValidSemesterKey(normalized) ? normalized : DEFAULT_SEMESTER_KEY;
}

function parseUserInfo(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function tokenExpired(expiry: string | null) {
  if (!expiry) return false;
  const expiresAt = new Date(expiry).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return Date.now() >= expiresAt;
}

async function loadSession() {
  try {
    const [secureToken, asyncToken, tokenExpiry, userIdStr, userInfoRaw, storedSemesterKey] = await Promise.all([
      hasSecureStore ? SecureStore.getItemAsync(tokenStorageKey) : Promise.resolve<string | null>(null),
      AsyncStorage.getItem(tokenStorageKey),
      AsyncStorage.getItem(tokenExpiryStorageKey),
      AsyncStorage.getItem(userIDStorageKey),
      AsyncStorage.getItem(userInfoStorageKey),
      AsyncStorage.getItem(semesterStorageKey),
    ]);

    const token = secureToken ?? asyncToken ?? null;
    if (token && tokenExpired(tokenExpiry)) {
      await clearPersistedAuthSession();
      return {
        token: null,
        userId: null,
        userInfo: null,
        semesterKey: readSemesterKeyOrDefault(storedSemesterKey),
      };
    }

    const userInfo = parseUserInfo(userInfoRaw);
    const userId = userIdStr ? Number(userIdStr) : userInfo?.id ?? null;

    return {
      token,
      userId,
      userInfo,
      semesterKey: readSemesterKeyOrDefault(storedSemesterKey),
    };
  } catch (err) {
    console.warn('Session restore failed, falling back to AsyncStorage only', err);
    const [token, tokenExpiry, userIdStr, userInfoRaw, storedSemesterKey] = await Promise.all([
      AsyncStorage.getItem(tokenStorageKey),
      AsyncStorage.getItem(tokenExpiryStorageKey),
      AsyncStorage.getItem(userIDStorageKey),
      AsyncStorage.getItem(userInfoStorageKey),
      AsyncStorage.getItem(semesterStorageKey),
    ]);

    if (token && tokenExpired(tokenExpiry)) {
      await clearPersistedAuthSession();
      return {
        token: null,
        userId: null,
        userInfo: null,
        semesterKey: readSemesterKeyOrDefault(storedSemesterKey),
      };
    }

    const userInfo = parseUserInfo(userInfoRaw);
    const userId = userIdStr ? Number(userIdStr) : userInfo?.id ?? null;

    return {
      token: token ?? null,
      userId,
      userInfo,
      semesterKey: readSemesterKeyOrDefault(storedSemesterKey),
    };
  }
}

async function authenticate(email: string, password: string, fallbackUser?: AuthUser) {
  const res = await postJson<TokenResponse>('/v1/tokens/authentication', { email, password });
  const token = res.authentication_token?.token;
  const userID = res.authentication_token?.user_id;

  if (!token || !userID) {
    throw new Error('Authentication response is incomplete.');
  }

  const profile: AuthUser = {
    id: userID,
    email: res.user?.email || fallbackUser?.email || email,
    fullname: res.user?.fullname || fallbackUser?.fullname,
    activated: res.user?.activated ?? fallbackUser?.activated,
  };

  return {
    token,
    userID,
    expiry: res.authentication_token?.expiry ?? null,
    profile,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState<AuthUser | null>(null);
  const [semesterKey, setSemesterKeyState] = useState<string>(DEFAULT_SEMESTER_KEY);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadSession()
      .then(({ token, userId, userInfo, semesterKey }) => {
        if (!mounted) return;
        setToken(token);
        setUserId(userId);
        setUserInfo(userInfo);
        setSemesterKeyState(semesterKey);
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

  const login = async ({ email, password }: { email: string; password: string }) => {
    setAuthBusy(true);
    try {
      const session = await authenticate(email, password);
      setToken(session.token);
      setUserId(session.userID);
      setUserInfo(session.profile);

      await Promise.all([
        persistToken(session.token),
        persistTokenExpiry(session.expiry),
        persistUserId(session.userID),
        persistUserInfo(session.profile),
      ]);
    } finally {
      setAuthBusy(false);
    }
  };

  const register = async ({ fullname, email, password }: { fullname: string; email: string; password: string }) => {
    setAuthBusy(true);
    try {
      const registered = await postJson<{ user: AuthUser }>('/v1/users', { fullname, email, password });
      const session = await authenticate(email, password, registered.user);
      const mergedProfile: AuthUser = {
        ...session.profile,
        fullname: session.profile.fullname || registered.user?.fullname,
      };

      setToken(session.token);
      setUserId(session.userID);
      setUserInfo(mergedProfile);

      await Promise.all([
        persistToken(session.token),
        persistTokenExpiry(session.expiry),
        persistUserId(session.userID),
        persistUserInfo(mergedProfile),
      ]);
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setUserId(null);
    setUserInfo(null);
    await clearPersistedAuthSession();
  };

  const setSemesterKey = async (nextSemesterKey: string) => {
    const normalized = normalizeSemesterKey(nextSemesterKey);
    if (!isValidSemesterKey(normalized)) {
      throw new Error('Semester format must be level-term:batch (e.g., 2-1:2023)');
    }
    setSemesterKeyState(normalized);
    await persistSemesterKey(normalized);
  };

  const value = useMemo(
    () => ({
      token,
      userId,
      userInfo,
      semesterKey,
      setSemesterKey,
      login,
      register,
      logout,
      loading,
      authBusy,
    }),
    [token, userId, userInfo, semesterKey, loading, authBusy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
