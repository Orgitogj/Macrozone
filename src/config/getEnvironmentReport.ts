import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  describeEnvironment,
  formatEnvironmentProblems,
  type EnvironmentReport,
  type EnvironmentValues,
} from '@/config/environment';
import { getAiEndpointConfig } from '@/features/ai-meal/config/aiEndpoint';
import { getSupabaseConfig } from '@/features/auth/adapters/getSupabaseClient';
import { resolveOpenFoodFactsConfig } from '@/features/barcode/providers/openFoodFacts/openFoodFactsConfig';

function environmentValues(): EnvironmentValues {
  return {
    EXPO_PUBLIC_AI_ENDPOINT_URL: process.env.EXPO_PUBLIC_AI_ENDPOINT_URL,
    EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT: process.env.EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT,
    EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV: process.env.EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getEnvironmentReport(): EnvironmentReport {
  const barcode = resolveOpenFoodFactsConfig({
    platform: Platform.OS,
    contact: process.env.EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT,
    environment: process.env.EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV,
    appVersion: Constants.expoConfig?.version,
    isDevelopment: __DEV__,
  });
  return describeEnvironment({
    values: environmentValues(),
    aiStatus: getAiEndpointConfig().status,
    barcodeStatus: barcode.status === 'ready' ? 'ready' : barcode.status === 'unsupported_platform' ? 'unsupported_platform' : 'not_configured',
    accountsStatus: getSupabaseConfig().status === 'ready' ? 'ready' : 'not_configured',
  });
}

export function logEnvironmentProblems(): void {
  if (!__DEV__) {
    return;
  }
  for (const line of formatEnvironmentProblems(getEnvironmentReport())) {
    console.warn(line);
  }
}
