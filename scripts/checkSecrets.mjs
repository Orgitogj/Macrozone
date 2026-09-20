import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const PATTERNS = [
  { name: 'JSON Web Token', match: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'Supabase secret key', match: /\bsb_secret_[A-Za-z0-9_-]{10,}\b/ },
  { name: 'Supabase management token', match: /\bsbp_[A-Za-z0-9]{20,}\b/ },
  { name: 'provider secret key', match: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'private key block', match: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'assigned service-role key', match: /SERVICE_ROLE_KEY\s*[=:]\s*["']?[A-Za-z0-9._-]{20,}/ },
  { name: 'assigned database password', match: /(?:DB_PASSWORD|DATABASE_PASSWORD|PGPASSWORD)\s*[=:]\s*["']?\S{6,}/ },
];

const BINARY = /\.(png|jpg|jpeg|gif|webp|ico|ttf|otf|woff2?|hbc|zip|keystore|jks)$/i;
const MAX_BYTES = 2_000_000;

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !BINARY.test(line));

const findings = [];
for (const file of files) {
  let stats;
  try {
    stats = statSync(file);
  } catch {
    continue;
  }
  if (!stats.isFile() || stats.size > MAX_BYTES) {
    continue;
  }
  const content = readFileSync(file, 'utf8');
  for (const pattern of PATTERNS) {
    const match = pattern.match.exec(content);
    if (match !== null) {
      const line = content.slice(0, match.index).split('\n').length;
      findings.push(`${file}:${line} looks like ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error('Secret scan failed:');
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  process.exit(1);
}

console.log(`Secret scan clean (${files.length} tracked text files).`);
