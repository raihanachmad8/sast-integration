const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check the specific import
  const result = await client.query("SELECT * FROM source_control_imports WHERE repository_id = 'fb42be9a-6518-41e6-8213-f531de915f6e'");
  console.log('=== Import for fb42be9a ===');
  for (const row of result.rows) {
    console.log(JSON.stringify(row, null, 2));
  }
  
  // Check workspace_id on source_controls
  const sc = await client.query("SELECT * FROM source_controls WHERE id = '4fffb588-9e83-4b1f-9542-6acae839b96d'");
  console.log('\n=== Source Control ===');
  for (const row of sc.rows) {
    console.log(`  workspace_id: ${row.workspace_id}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });