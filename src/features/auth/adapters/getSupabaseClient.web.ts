import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { resolveSupabaseConfig, type SupabaseConfig } from '@/features/auth/config/supabaseConfig';

let cached: { config: SupabaseConfig; client: SupabaseClient | null } | null = null;

function readConfig(): SupabaseConfig {
  return resolveSupabaseConfig({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
      storage: {
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: (key) => AsyncStorage.removeItem(key),
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  cached = { config, client };
  return client;
}
