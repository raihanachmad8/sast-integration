const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check ai_verifications
  const verifications = await client.query("SELECT * FROM ai_verifications ORDER BY created_at DESC LIMIT 5");
  console.log("=== AI Verifications ===");
  for (const row of verifications.rows) {
    console.log(`  finding_id: ${row.finding_id} | verdict: ${row.verdict} | model_id: ${row.model_id}`);
  }
  
  // Check if findings have been updated
  const findings = await client.query("SELECT id, rule, status FROM findings WHERE scan_id = '1f7d95f0-d7eb-4be4-beb6-bfbacfb78446' LIMIT 5");
  console.log("\n=== Findings ===");
  for (const row of findings.rows) {
    console.log(`  ${row.rule} | status: ${row.status}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });