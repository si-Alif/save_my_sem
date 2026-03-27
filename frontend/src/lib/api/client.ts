import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

const hasSecureStore = Platform.OS !== 'web' && typeof SecureStore?.getItemAsync === 'function';

async function getStoredToken() {
  const token = hasSecureStore ? await SecureStore.getItemAsync('auth_token') : null;
  if (token) return token;
  return AsyncStorage.getItem('auth_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, overrideToken?: string): Promise<T> {
  const token = overrideToken ?? (await getStoredToken()) ?? undefined;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      else if (body?.errors && typeof body.errors === 'object') {
        const first = Object.values(body.errors as Record<string, string[]>)[0];
        if (Array.isArray(first) && first.length > 0) message = first[0];
      }
    } catch (_) {
      // ignore
    }
    const err = new Error(message);
    (err as any).status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

// Convenience helpers
export async function postJson<T>(path: string, body: unknown, token?: string) {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function getJson<T>(path: string, token?: string) {
  return apiFetch<T>(path, { method: 'GET' }, token);
}
