import { AI_ANALYSIS_PATH } from '@/features/ai-meal/constants';
import type { AiEndpointConfig } from '@/features/ai-meal/types';

const ENDPOINT_PATTERN = /^(https?):\/\/([A-Za-z0-9.-]+)(?::(\d{1,5}))?(\/[A-Za-z0-9._~/-]*)?$/;

function isLocalDevelopmentHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '10.0.2.2' ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    host.endsWith('.local')
  );
}

export function resolveAiEndpoint(raw: string | undefined, allowInsecureLocal: boolean): AiEndpointConfig {
  const value = raw?.trim() ?? '';
  if (value === '') {
    return { status: 'not_configured' };
  }
  const match = ENDPOINT_PATTERN.exec(value);
  if (!match) {
    return { status: 'invalid' };
  }
  const [, protocol, host, port, path = ''] = match;
  if (protocol === 'http' && !(allowInsecureLocal && isLocalDevelopmentHost(host))) {
    return { status: 'invalid' };
  }
  if (port !== undefined && (Number(port) < 1 || Number(port) > 65535)) {
    return { status: 'invalid' };
  }
  const basePath = path.replace(/\/+$/, '');
  return { status: 'configured', analyzeUrl: `${protocol}://${host}${port ? `:${port}` : ''}${basePath}${AI_ANALYSIS_PATH}` };
}

export function getAiEndpointConfig(): AiEndpointConfig {
  return resolveAiEndpoint(process.env.EXPO_PUBLIC_AI_ENDPOINT_URL, __DEV__);
}
