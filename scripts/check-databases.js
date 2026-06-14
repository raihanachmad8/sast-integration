const { Client } = require('pg');

async function check() {
  // Check legacy database
  const legacyClient = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_legacy' });
  try {
    await legacyClient.connect();
    const result = await legacyClient.query("SELECT * FROM scanner_rules_versions ORDER BY created_at DESC LIMIT 3");
    console.log("=== Legacy Scanner Rules Versions ===");
    for (const row of result.rows) {
      console.log(`  id: ${row.id} | version: ${row.version} | status: ${row.status} | path: ${row.path}`);
    }
    await legacyClient.end();
  } catch (e) {
    console.log("Legacy DB not found or table missing:", e.message);
  }
  
  // Check current database
  const currentClient = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await currentClient.connect();
  const tables = await currentClient.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log("\n=== Current DB Tables ===");
  for (const row of tables.rows) {
    console.log(`  ${row.tablename}`);
  }
  await currentClient.end();
}

check().catch(e => { console.error(e.message); process.exit(1); });