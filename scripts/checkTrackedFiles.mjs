import { execFileSync } from 'node:child_process';

const FORBIDDEN = [
  { name: 'environment files', match: /(^|\/)\.env($|\.)/, allow: /^\.env\.example$/ },
  { name: 'test files', match: /(^|\/)__tests__\//, allow: null },
  { name: 'test helpers', match: /^src\/testing\//, allow: null },
  { name: 'supabase database tests', match: /^supabase\/tests\//, allow: null },
  { name: 'build output', match: /^(dist|web-build|\.expo|coverage)\//, allow: null },
  { name: 'native project folders', match: /^(android|ios)\//, allow: null },
  { name: 'signing material', match: /\.(keystore|jks|p8|p12|pem|key|mobileprovision)$/, allow: null },
  { name: 'temporary worktrees', match: /^\.wt-/, allow: null },
];

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const findings = [];
for (const file of files) {
  for (const rule of FORBIDDEN) {
    if (rule.match.test(file) && (rule.allow === null || !rule.allow.test(file))) {
      findings.push(`${file} is tracked but ${rule.name} must stay out of the repository`);
    }
  }
}

if (findings.length > 0) {
  console.error('Tracked file check failed:');
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  process.exit(1);
}

console.log(`Tracked file check clean (${files.length} files).`);
