const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check source_control_imports
  const imports = await client.query('SELECT sci.*, scr.name as repo_name, scr.full_name, sc.provider FROM source_control_imports sci JOIN source_control_repositories scr ON sci.source_control_repository_id = scr.id JOIN source_controls sc ON sci.source_control_id = sc.id');
  console.log('=== source_control_imports ===');
  for (const row of imports.rows) {
    console.log(`  repo_id: ${row.repository_id} | sc_repo: ${row.repo_name} | full_name: ${row.full_name} | provider: ${row.provider}`);
  }
  
  // Check repositories without imports
  const repos = await client.query('SELECT r.id, r.name, r.url, r.default_branch, r.connection_type FROM repositories r WHERE r.deleted_at IS NULL');
  console.log('\n=== repositories ===');
  for (const row of repos.rows) {
    console.log(`  id: ${row.id} | name: ${row.name} | branch: ${row.default_branch} | conn: ${row.connection_type}`);
  }
  
  // Check source_control_repositories
  const scRepos = await client.query('SELECT scr.*, sc.provider FROM source_control_repositories scr JOIN source_controls sc ON scr.source_control_id = sc.id');
  console.log('\n=== source_control_repositories ===');
  for (const row of scRepos.rows) {
    console.log(`  id: ${row.id} | name: ${row.name} | full_name: ${row.full_name} | provider: ${row.provider}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });