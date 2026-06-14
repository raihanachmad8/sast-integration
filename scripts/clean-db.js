const { Client } = require('pg');
async function clean() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const tables = ['ai_verifications', 'finding_history', 'comments', 'findings', 'finding_groups', 'quality_gate_results', 'scan_results', 'scan_uploads', 'scans'];
  
  for (const table of tables) {
    const result = await client.query('DELETE FROM ' + table);
    console.log(table + ': ' + result.rowCount + ' rows deleted');
  }
  
  await client.end();
  console.log('\nAll scan and finding data cleaned. Ready to rescan.');
}
clean().catch(e => { console.error(e.message); process.exit(1); });
