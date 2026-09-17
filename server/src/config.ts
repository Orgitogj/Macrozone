import { normalizeIp } from './http/clientIp.ts';
import { DEFAULT_EFFORT, DEFAULT_MODEL, isEffortSupported, isSupportedModel, type ProviderEffort } from './providers/models.ts';
import type { RateLimitRule } from './security/rateLimiter.ts';

export const PRODUCTION_DEPLOYMENT = 'protected-gateway-single-instance';

export type ServerConfig = {
  environment: 'development' | 'production';
  host: string;
  port: number;
  anthropicApiKey: string;
  model: string;
  effort: ProviderEffort;
  maxOutputTokens: number;
  requestTimeoutMs: number;
  providerTimeoutMs: number;
  providerMaxRetries: number;
  maxConcurrentRequests: number;
  dailyRequestBudget: number;
  keyRateLimit: RateLimitRule;
  keyDailyLimit: RateLimitRule;
  ipRateLimit: RateLimitRule;
  allowedOrigins: string[];
  trustedProxies: ReadonlySet<string>;
};

export class ConfigError extends Error {
  readonly variables: string[];

  constructor(variables: string[]) {
    super(`Invalid server configuration: ${variables.join(', ')}`);
    this.name = 'ConfigError';
    this.variables = variables;
  }
}

type Env = Readonly<Record<string, string | undefined>>;

const PRODUCTION_REQUIRED = ['AI_DEPLOYMENT', 'AI_MAX_CONCURRENT_REQUESTS', 'AI_DAILY_REQUEST_BUDGET'] as const;

export function loadServerConfig(env: Env): ServerConfig {
  const invalid: string[] = [];
  const isSet = (name: string) => (env[name] ?? '').trim() !== '';
  const environment = env.NODE_ENV?.trim() === 'production' ? 'production' : 'development';

  const readInteger = (name: string, fallback: number, min: number, max: number): number => {
    const raw = env[name];
    if (raw === undefined || raw.trim() === '') {
      return fallback;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      invalid.push(name);
      return fallback;
    }
    return value;
  };

  const anthropicApiKey = env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (anthropicApiKey.length < 20) {
    invalid.push('ANTHROPIC_API_KEY');
  }

  const model = env.AI_MODEL?.trim() || DEFAULT_MODEL;
  if (!isSupportedModel(model)) {
    invalid.push('AI_MODEL');
  }

  const effortRaw = env.AI_EFFORT?.trim() || DEFAULT_EFFORT;
  const effort: ProviderEffort = isEffortSupported(isSupportedModel(model) ? model : DEFAULT_MODEL, effortRaw) ? effortRaw : DEFAULT_EFFORT;
  if (effort !== effortRaw) {
    invalid.push('AI_EFFORT');
  }

  const origins = (env.AI_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const originPattern = environment === 'production' ? /^https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/ : /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/;
  if (origins.some((origin) => !originPattern.test(origin))) {
    invalid.push('AI_ALLOWED_ORIGINS');
  }

  const proxyEntries = (env.AI_TRUSTED_PROXIES ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const trustedProxies = new Set<string>();
  for (const entry of proxyEntries) {
    const ip = normalizeIp(entry);
    if (ip === null) {
      invalid.push('AI_TRUSTED_PROXIES');
      break;
    }
    trustedProxies.add(ip);
  }

  if (environment === 'production') {
    for (const name of PRODUCTION_REQUIRED) {
      if (!isSet(name)) {
        invalid.push(name);
      }
    }
    if (isSet('AI_DEPLOYMENT') && env.AI_DEPLOYMENT?.trim() !== PRODUCTION_DEPLOYMENT) {
      invalid.push('AI_DEPLOYMENT');
    }
  } else if (isSet('AI_DEPLOYMENT') && env.AI_DEPLOYMENT?.trim() !== PRODUCTION_DEPLOYMENT) {
    invalid.push('AI_DEPLOYMENT');
  }

  const config: ServerConfig = {
    environment,
    host: env.HOST?.trim() || (environment === 'production' ? '0.0.0.0' : '127.0.0.1'),
    port: readInteger('PORT', 8787, 1, 65535),
    anthropicApiKey,
    model,
    effort,
    maxOutputTokens: readInteger('AI_MAX_OUTPUT_TOKENS', 8000, 1024, 32000),
    requestTimeoutMs: readInteger('AI_REQUEST_TIMEOUT_MS', 45000, 5000, 120000),
    providerTimeoutMs: readInteger('AI_PROVIDER_TIMEOUT_MS', 30000, 2000, 110000),
    providerMaxRetries: readInteger('AI_PROVIDER_MAX_RETRIES', 1, 0, 2),
    maxConcurrentRequests: readInteger('AI_MAX_CONCURRENT_REQUESTS', 4, 1, 256),
    dailyRequestBudget: readInteger('AI_DAILY_REQUEST_BUDGET', 200, 1, 1_000_000),
    keyRateLimit: { limit: readInteger('AI_RATE_LIMIT_PER_MINUTE', 6, 1, 600), windowMs: 60_000 },
    keyDailyLimit: { limit: readInteger('AI_RATE_LIMIT_PER_DAY', 100, 1, 100000), windowMs: 86_400_000 },
    ipRateLimit: { limit: readInteger('AI_IP_RATE_LIMIT_PER_MINUTE', 30, 1, 6000), windowMs: 60_000 },
    allowedOrigins: origins,
    trustedProxies,
  };

  if (config.providerTimeoutMs >= config.requestTimeoutMs) {
    invalid.push('AI_PROVIDER_TIMEOUT_MS');
  }
  if (invalid.length > 0) {
    throw new ConfigError([...new Set(invalid)]);
  }
  return config;
}
