const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const result = await client.query("SELECT credentials FROM source_controls WHERE id = '4fffb588-9e83-4b1f-9542-6acae839b96d'");
  const creds = result.rows[0].credentials;
  const token = creds.token;
  const baseUrl = creds.baseUrl;
  
  // Test Gitea API
  const url = baseUrl + '/api/v1/repos/MeAdmin/new-repo/branches';
  console.log('Testing URL:', url);
  console.log('Token prefix:', token.substring(0, 30) + '...');
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: 'token ' + token }
    });
    console.log('Status:', response.status);
    const data = await response.json();
    if (Array.isArray(data)) {
      console.log('Branches:', data.map(b => b.name));
    } else {
      console.log('Response:', JSON.stringify(data).substring(0, 200));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await client.end();
}
test().catch(e => { console.error(e.message); process.exit(1); });