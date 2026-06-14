const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check scan results to see what scanners were used
  const result = await client.query("SELECT scanner, parsed_summary FROM scan_results WHERE scanner = 'semgrep' ORDER BY created_at DESC LIMIT 1");
  if (result.rows.length > 0) {
    console.log("=== Latest semgrep scan result ===");
    console.log("Summary:", JSON.stringify(result.rows[0].parsed_summary));
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });