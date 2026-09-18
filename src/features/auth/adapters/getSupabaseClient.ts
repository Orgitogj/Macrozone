import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { createChunkedSecureStorage } from '@/features/auth/adapters/chunkedSecureStorage';
import { resolveSupabaseConfig, type SupabaseConfig } from '@/features/auth/config/supabaseConfig';

let cached: { config: SupabaseConfig; client: SupabaseClient | null } | null = null;
let appStateBound = false;

function readConfig(): SupabaseConfig {
  return resolveSupabaseConfig({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

function bindAppState(client: SupabaseClient): void {
  if (appStateBound) {
    return;
  }
  appStateBound = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void client.auth.startAutoRefresh();
    } else {
      void client.auth.stopAutoRefresh();
    }
  });
}

export function getSupabaseConfig(): SupabaseConfig {
  cached ??= { config: readConfig(), client: null };
  return cached.config;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (config.status !== 'ready') {
    return null;
  }
  if (cached !== null && cached.client !== null) {
    return cached.client;
  }
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      storage: createChunkedSecureStorage({
        store: {
          getItemAsync: (key) => SecureStore.getItemAsync(key),
          setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
          deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
        },
      }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  bindAppState(client);
  cached = { config, client };
  return client;
}
