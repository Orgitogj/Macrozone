export type EnvironmentVariableName =
  | 'EXPO_PUBLIC_AI_ENDPOINT_URL'
  | 'EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT'
  | 'EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV'
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

export type FeatureStatus = 'ready' | 'disabled' | 'misconfigured';

export type FeatureReport = {
  feature: 'ai' | 'barcode' | 'accounts';
  status: FeatureStatus;
  detail: string;
  variables: EnvironmentVariableName[];
};

export type EnvironmentReport = {
  features: FeatureReport[];
  problems: FeatureReport[];
};

export type EnvironmentValues = Partial<Record<EnvironmentVariableName, string | undefined>>;

const SECRET_PATTERNS: { match: RegExp; label: string }[] = [
  { match: /^sb_secret_/i, label: 'a Supabase secret key' },
  { match: /^sbp_/i, label: 'a Supabase management token' },
  { match: /^sk-/i, label: 'a provider secret key' },
  { match: /service_role/i, label: 'a service-role key' },
  { match: /^-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: 'a private key' },
];

export function findSecretLookingValues(values: EnvironmentValues): { name: EnvironmentVariableName; label: string }[] {
  const found: { name: EnvironmentVariableName; label: string }[] = [];
  for (const [name, value] of Object.entries(values) as [EnvironmentVariableName, string | undefined][]) {
    const trimmed = value?.trim() ?? '';
    if (trimmed === '') {
      continue;
    }
    const pattern = SECRET_PATTERNS.find((candidate) => candidate.match.test(trimmed));
    if (pattern !== undefined) {
      found.push({ name, label: pattern.label });
    }
  }
  return found;
}

export function describeEnvironment({
  values,
  aiStatus,
  barcodeStatus,
  accountsStatus,
}: {
  values: EnvironmentValues;
  aiStatus: 'configured' | 'not_configured' | 'invalid';
  barcodeStatus: 'ready' | 'not_configured' | 'unsupported_platform';
  accountsStatus: 'ready' | 'not_configured';
}): EnvironmentReport {
  const secrets = findSecretLookingValues(values);
  const secretNames = new Set(secrets.map((entry) => entry.name));

  const features: FeatureReport[] = [
    {
      feature: 'ai',
      status: aiStatus === 'configured' ? 'ready' : aiStatus === 'invalid' ? 'misconfigured' : 'disabled',
      detail:
        aiStatus === 'configured'
          ? 'AI meal estimates are enabled.'
          : aiStatus === 'invalid'
            ? 'EXPO_PUBLIC_AI_ENDPOINT_URL is not a valid https URL, so AI estimates stay off.'
            : 'EXPO_PUBLIC_AI_ENDPOINT_URL is not set, so AI estimates stay off.',
      variables: ['EXPO_PUBLIC_AI_ENDPOINT_URL'],
    },
    {
      feature: 'barcode',
      status: barcodeStatus === 'ready' ? 'ready' : barcodeStatus === 'not_configured' ? 'misconfigured' : 'disabled',
      detail:
        barcodeStatus === 'ready'
          ? 'Open Food Facts lookup is enabled.'
          : barcodeStatus === 'unsupported_platform'
            ? 'Online product lookup is not available on this platform.'
            : 'EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT is missing or invalid, so online product lookup stays off.',
      variables: ['EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT', 'EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV'],
    },
    {
      feature: 'accounts',
      status: accountsStatus === 'ready' ? 'ready' : 'disabled',
      detail:
        accountsStatus === 'ready'
          ? 'Accounts and cloud backup are enabled.'
          : 'Supabase settings are missing or not usable, so MacroZone runs in local-only mode.',
      variables: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    },
  ];

  const problems = features.filter(
    (report) => report.status === 'misconfigured' || report.variables.some((name) => secretNames.has(name)),
  );

  for (const secret of secrets) {
    problems.push({
      feature: secret.name.includes('SUPABASE') ? 'accounts' : secret.name.includes('AI') ? 'ai' : 'barcode',
      status: 'misconfigured',
      detail: `${secret.name} looks like ${secret.label}. Public app variables are readable by anyone with the app; never put secrets in them.`,
      variables: [secret.name],
    });
  }

  return { features, problems };
}

export function formatEnvironmentProblems(report: EnvironmentReport): string[] {
  return report.problems.map((problem) => `[env] ${problem.feature}: ${problem.detail}`);
}
