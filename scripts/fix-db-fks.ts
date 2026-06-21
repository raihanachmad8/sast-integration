import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

// Load .env manually
const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  process.env[key] = value;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function fixFks() {
  console.log('Dropping old FK constraints...');
  
  await db.execute(sql`ALTER TABLE scan_uploads DROP CONSTRAINT IF EXISTS scan_uploads_personal_access_token_id_personal_access_tokens_id`);
  await db.execute(sql`ALTER TABLE source_control_repositories DROP CONSTRAINT IF EXISTS source_control_repositories_source_control_id_source_controls_i`);
  await db.execute(sql`ALTER TABLE source_control_imports DROP CONSTRAINT IF EXISTS source_control_imports_source_control_repository_id_source_cont`);
  
  console.log('Done. Run db:push to create new FKs.');
  await pool.end();
  process.exit(0);
}

fixFks().catch((e) => { console.error(e); process.exit(1); });
