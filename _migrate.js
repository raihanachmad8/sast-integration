const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
(async () => {
  await c.connect();

  // 1. Drop scan_profiles table
  await c.query('DROP TABLE IF EXISTS scan_profiles CASCADE');
  console.log('Dropped scan_profiles table');

  // 2. Drop profile_id from scans
  await c.query('ALTER TABLE scans DROP COLUMN IF EXISTS profile_id');
  console.log('Dropped profile_id from scans');

  // 3. Drop profile_id from schedules
  await c.query('ALTER TABLE schedules DROP COLUMN IF EXISTS profile_id');
  console.log('Dropped profile_id from schedules');

  // 4. Drop current_profile_id from repositories
  await c.query('ALTER TABLE repositories DROP COLUMN IF EXISTS current_profile_id');
  console.log('Dropped current_profile_id from repositories');

  await c.end();
  console.log('Migration complete!');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
