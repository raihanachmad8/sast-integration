import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  try {
    // Check if index exists
    const rows = await db.execute(sql`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'knowledge_entries' 
      AND indexname = 'knowledge_entries_source_cwe_idx'
    `);
    
    if ((rows as { length: number }).length > 0) {
      console.log('Index already exists');
    } else {
      await db.execute(sql`
        CREATE UNIQUE INDEX knowledge_entries_source_cwe_idx 
        ON knowledge_entries (source_id, cwe_id)
      `);
      console.log('Unique index created: knowledge_entries_source_cwe_idx');
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Error:', message);
  } finally {
    await client.end();
  }
}

main();
