const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
(async () => {
  await c.connect();
  const r = await c.query(`
    SELECT r.id, r.name, p.name as project_name, sc.provider, sc.name as provider_name
    FROM repositories r
    LEFT JOIN projects p ON p.id = r.project_id
    LEFT JOIN source_control_imports sci ON sci.repository_id = r.id
    LEFT JOIN source_controls sc ON sc.id = sci.source_control_id
    WHERE r.workspace_id = '506416af-1f67-4ae9-906a-e84b20948a72' AND r.deleted_at IS NULL
    LIMIT 5
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
