import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.argv[2];
if (directory === undefined) {
  console.error('Usage: node scripts/checkBundle.mjs <export-directory>');
  process.exit(1);
}

const KEY_TAIL = '(?=(?:[A-Za-z0-9_-]*\\d){3})[A-Za-z0-9_-]{24,}';

const PATTERNS = [
  { name: 'JSON Web Token', match: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'Supabase secret key', match: new RegExp(`\\bsb_secret_${KEY_TAIL}`) },
  { name: 'Supabase management token', match: new RegExp(`\\bsbp_${KEY_TAIL}`) },
  { name: 'provider secret key', match: new RegExp(`\\bsk-${KEY_TAIL}`) },
  { name: 'service-role environment name', match: /SUPABASE_SERVICE_ROLE_KEY/ },
  { name: 'privileged deletion function', match: /delete_account_data/ },
  { name: 'private key block', match: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
];

function* walk(current) {
  for (const entry of readdirSync(current)) {
    const path = join(current, entry);
    if (statSync(path).isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

const findings = [];
let scanned = 0;
for (const file of walk(directory)) {
  if (!/\.(js|hbc|json|html|map|txt)$/i.test(file)) {
    continue;
  }
  scanned += 1;
  const content = readFileSync(file, 'latin1');
  for (const pattern of PATTERNS) {
    if (pattern.match.test(content)) {
      findings.push(`${file} contains ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error('Bundle check failed:');
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  process.exit(1);
}

console.log(`Bundle check clean (${scanned} files in ${directory}).`);
