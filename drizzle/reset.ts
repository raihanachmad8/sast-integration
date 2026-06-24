import * as fs from 'node:fs';
import * as path from 'node:path';
import postgres from 'postgres';

const cwd = process.cwd();
const envPaths = [path.resolve(cwd, '.env.local'), path.resolve(cwd, '.env')];
if (typeof process.loadEnvFile === 'function') {
  for (const filePath of envPaths) {
    if (fs.existsSync(filePath)) {
      process.loadEnvFile(filePath);
      break;
    }
  }
}

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'root'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'sast_db'}`;

const sql = postgres(databaseUrl, { max: 1 });

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: db:reset is not allowed in production');
    process.exit(1);
  }
  console.log('Resetting database data...');

  const tables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name <> '__drizzle_migrations'
  `;

  if (!tables.length) {
    console.log('  No public tables found.');
    await sql.end();
    return;
  }

  const tableList = tables.map((table) => quoteIdentifier(table.table_name)).join(', ');
  await sql.unsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  console.log(`  Truncated ${tables.length} tables.`);

  await sql.end();
}

main().catch(async (err) => {
  await sql.end({ timeout: 1 }).catch(() => undefined);
  console.error('Reset failed:', err);
  process.exit(1);
});
