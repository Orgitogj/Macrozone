import { readFileSync, readdirSync } from 'node:fs';

const DIRECTORY = 'supabase/migrations';

const files = readdirSync(DIRECTORY)
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.error('No SQL migrations found.');
  process.exit(1);
}

const combined = files.map((name) => readFileSync(`${DIRECTORY}/${name}`, 'utf8')).join('\n');
const normalized = combined.toLowerCase();
const problems = [];

const createdTables = [...normalized.matchAll(/create table (?:if not exists )?public\.([a-z_]+)/g)].map((match) => match[1]);
for (const table of createdTables) {
  if (!normalized.includes(`alter table public.${table} enable row level security`)) {
    problems.push(`public.${table} never enables row level security`);
  }
  if (!normalized.includes(`alter table public.${table} force row level security`)) {
    problems.push(`public.${table} never forces row level security`);
  }
  if (!normalized.includes(`revoke all on table public.${table} from anon, authenticated`)) {
    problems.push(`public.${table} does not revoke direct client privileges`);
  }
  if (!new RegExp(`create policy [a-z_]+ on public\\.${table}`).test(normalized)) {
    problems.push(`public.${table} has no policy`);
  }
}

const definerFunctions = [...combined.matchAll(/create or replace function ([a-z_.]+)\(([^)]*)\)([\s\S]*?)\bas \$\$/g)];
for (const [, name, , body] of definerFunctions) {
  const header = body.toLowerCase();
  if (!header.includes('security definer')) {
    continue;
  }
  if (!/set search_path = ''/.test(header)) {
    problems.push(`${name} is security definer without a fixed empty search_path`);
  }
}

for (const grant of normalized.matchAll(/grant (all|execute|insert|update|delete)[^;]*to ([^;]+);/g)) {
  const [statement, privilege, targets] = grant;
  if (/\banon\b/.test(targets) && privilege !== 'execute') {
    problems.push(`anonymous clients receive ${privilege}: ${statement.trim()}`);
  }
  if (/delete_account_data/.test(statement) && /\bauthenticated\b|\banon\b/.test(targets)) {
    problems.push(`the protected deletion function is granted to a client role: ${statement.trim()}`);
  }
  if (privilege !== 'execute' && /\bauthenticated\b/.test(targets) && /on table/.test(statement)) {
    problems.push(`authenticated clients receive table ${privilege}: ${statement.trim()}`);
  }
}

if (normalized.includes('create table ') && !normalized.includes('create table if not exists')) {
  problems.push('migrations create tables without "if not exists"');
}

for (const name of files) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(name)) {
    problems.push(`${name} does not follow the timestamped migration naming`);
  }
}

if (problems.length > 0) {
  console.error('Migration check failed:');
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}

console.log(`Migration check clean (${files.length} migrations, ${createdTables.length} tables).`);
