import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function fixAllFks() {
  // Drop ALL FKs on these 3 tables (Drizzle will recreate with _fk suffix)
  const tables = ['scan_uploads', 'source_control_repositories', 'source_control_imports'];
  
  for (const table of tables) {
    const result = await pool.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_name = $1
    `, [table]);
    
    for (const row of result.rows) {
      console.log(`Dropping ${row.constraint_name} from ${table}`);
      await db.execute(sql.raw(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${row.constraint_name}`));
    }
  }
  
  console.log('All FKs dropped. Run db:push to recreate with _fk suffix.');
  await pool.end();
  process.exit(0);
}

fixAllFks().catch((e) => { console.error(e); process.exit(1); });
