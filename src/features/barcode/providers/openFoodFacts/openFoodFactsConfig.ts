import { OPEN_FOOD_FACTS } from '@/features/barcode/constants';

export type OpenFoodFactsEnvironment = 'production' | 'staging';

export type OpenFoodFactsConfig =
  | {
      status: 'ready';
      environment: OpenFoodFactsEnvironment;
      baseUrl: string;
      userAgent: string;
      authorization: string | null;
    }
  | { status: 'not_configured'; reason: 'missing_contact' | 'invalid_contact' | 'invalid_environment' | 'invalid_version' }
  | { status: 'unsupported_platform' };

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;

const URL_PATTERN = /^https:\/\/([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/[A-Za-z0-9._~/-]*)?$/;

const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;

const PLACEHOLDER_DOMAIN = /(^|[@./])(example\.(com|org|net)|localhost|[^@./]+\.(test|invalid|example|local))(\/|$)/i;

export function isValidContact(contact: string): boolean {
  if (contact.length > 120 || PLACEHOLDER_DOMAIN.test(contact)) {
    return false;
  }
  return EMAIL_PATTERN.test(contact) || URL_PATTERN.test(contact);
}

export function resolveOpenFoodFactsConfig({
  platform,
  contact,
  environment,
  appVersion,
  isDevelopment,
}: {
  platform: string;
  contact: string | undefined;
  environment: string | undefined;
  appVersion: string | null | undefined;
  isDevelopment: boolean;
}): OpenFoodFactsConfig {
  if (platform === 'web') {
    return { status: 'unsupported_platform' };
  }
  const trimmedContact = contact?.trim() ?? '';
  if (trimmedContact === '') {
    return { status: 'not_configured', reason: 'missing_contact' };
  }
  if (!isValidContact(trimmedContact)) {
    return { status: 'not_configured', reason: 'invalid_contact' };
  }
  const requested = environment?.trim() ?? '';
  if (requested !== '' && requested !== 'production' && requested !== 'staging') {
    return { status: 'not_configured', reason: 'invalid_environment' };
  }
  if (typeof appVersion !== 'string' || !VERSION_PATTERN.test(appVersion)) {
    return { status: 'not_configured', reason: 'invalid_version' };
  }
  const resolved: OpenFoodFactsEnvironment = requested === '' ? (isDevelopment ? 'staging' : 'production') : requested;
  return {
    status: 'ready',
    environment: resolved,
    baseUrl: resolved === 'production' ? OPEN_FOOD_FACTS.productionBaseUrl : OPEN_FOOD_FACTS.stagingBaseUrl,
    userAgent: `${OPEN_FOOD_FACTS.applicationName}/${appVersion} (${trimmedContact})`,
    authorization: resolved === 'staging' ? OPEN_FOOD_FACTS.stagingAuthorization : null,
  };
}

export function buildProductRequest(
  config: Extract<OpenFoodFactsConfig, { status: 'ready' }>,
  barcode: string,
): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = { accept: 'application/json', 'user-agent': config.userAgent };
  if (config.authorization !== null) {
    headers.authorization = config.authorization;
  }
  return {
    url: `${config.baseUrl}${OPEN_FOOD_FACTS.apiVersionPath}${encodeURIComponent(barcode)}?product_type=food&fields=${OPEN_FOOD_FACTS.requestedFields.join(',')}`,
    headers,
  };
}
