const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const result = await client.query("SELECT id, provider, name, credentials FROM source_controls WHERE id = '4fffb588-9e83-4b1f-9542-6acae839b96d'");
  const sc = result.rows[0];
  console.log('Provider:', sc.provider);
  console.log('Credentials keys:', Object.keys(sc.credentials));
  console.log('Has token:', !!sc.credentials.token);
  console.log('Token prefix:', sc.credentials.token ? sc.credentials.token.substring(0, 20) + '...' : 'none');
  console.log('ApiUrl:', sc.credentials.apiUrl);
  console.log('BaseUrl:', sc.credentials.baseUrl);
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });