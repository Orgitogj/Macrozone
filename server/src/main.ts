import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { ConfigError, loadServerConfig, PRODUCTION_DEPLOYMENT } from './config.ts';
import { createHttpServer } from './http/createHttpServer.ts';
import { createJsonLogger } from './logging/logger.ts';
import { createAnthropicProvider } from './providers/anthropicProvider.ts';
import { DEFAULT_RETRY_POLICY } from './providers/retry.ts';
import { createConcurrencyLimiter, createInMemoryUsageStore } from './security/usageControls.ts';

const logger = createJsonLogger((line) => process.stdout.write(`${line}\n`));

try {
  const config = loadServerConfig(process.env);
  const provider = createAnthropicProvider({
    apiKey: config.anthropicApiKey,
    model: config.model,
    effort: config.effort,
    maxOutputTokens: config.maxOutputTokens,
    attemptTimeoutMs: config.providerTimeoutMs,
    retryPolicy: { ...DEFAULT_RETRY_POLICY, maxRetries: config.providerMaxRetries },
  });
  const usage = createInMemoryUsageStore();
  const server = createHttpServer(
    {
      provider,
      usage,
      concurrency: createConcurrencyLimiter(config.maxConcurrentRequests),
      logger,
      config,
      now: () => Date.now(),
      generateId: () => randomUUID(),
    },
    { trustedProxies: config.trustedProxies },
  );
  server.requestTimeout = config.requestTimeoutMs + 5000;
  server.headersTimeout = 15000;
  server.maxHeadersCount = 50;
  server.listen(config.port, config.host, () => {
    logger.info('server_started', {
      environment: config.environment,
      deployment: config.environment === 'production' ? PRODUCTION_DEPLOYMENT : 'development',
      usageStore: usage.kind,
      host: config.host,
      port: config.port,
      provider: provider.name,
      model: config.model,
      maxConcurrentRequests: config.maxConcurrentRequests,
      dailyRequestBudget: config.dailyRequestBudget,
    });
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  if (error instanceof ConfigError) {
    for (const variable of error.variables) {
      logger.error('invalid_configuration', { variable });
    }
  } else {
    logger.error('startup_failed', { code: 'SERVER_ERROR' });
  }
  process.exit(1);
}
