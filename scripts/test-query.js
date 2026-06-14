const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Test the actual query
  const result = await client.query(`
    SELECT 
      f.id, f.rule, f.status,
      av.verdict, av.confidence,
      m.name as model_name
    FROM findings f
    LEFT JOIN ai_verifications av ON f.id = av.finding_id
    LEFT JOIN ai_models m ON av.model_id = m.id
    WHERE f.active = true
    ORDER BY f.created_at DESC
    LIMIT 10
  `);
  
  console.log("=== Query Result ===");
  for (const row of result.rows) {
    console.log(`  ${row.rule} | status: ${row.status} | verdict: ${row.verdict ?? 'null'} | model: ${row.model_name ?? 'null'}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });