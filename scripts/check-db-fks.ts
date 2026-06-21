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

async function checkFks() {
  const result = await pool.query(`
    SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
           ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('scan_uploads', 'source_control_repositories', 'source_control_imports')
    ORDER BY tc.table_name, tc.constraint_name
  `);
  
  console.log('Current FKs in database:');
  for (const row of result.rows) {
    console.log(`  ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name} (${row.constraint_name})`);
  }
  
  await pool.end();
  process.exit(0);
}

checkFks().catch((e) => { console.error(e); process.exit(1); });
