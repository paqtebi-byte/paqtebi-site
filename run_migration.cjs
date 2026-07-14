const https = require('https');
const fs = require('fs');

// Read the migration SQL
const sql = fs.readFileSync('./supabase/migrations/20260714210000_exclude_media_from_retention.sql', 'utf8');

const projectRef = 'scokpscivzurygaxabxo';

// Try Supabase Management API - requires a personal access token (PAT)
// We can also try the SQL endpoint with service role key via REST
// The /sql endpoint requires Authorization: Bearer <service_role_key>

// First let's try to get the service role key from the Supabase dashboard API
// using the anon key to see what we can reach

// Actually let's try the pg_net approach via a stored function if available
// Or use fetch to call the Supabase SQL REST endpoint

async function runSqlViaManagementApi() {
  // The Supabase SQL API endpoint for direct SQL execution
  // This is documented at https://supabase.com/docs/reference/api
  // POST /v1/projects/{ref}/database/query
  // But this requires a Management API token (PAT), not service role key
  
  // Let's instead try the rpc approach - we need a function that can call cron.schedule
  // But the anon key won't have access to cron schema
  
  // Let's check if we can reach the supabase project's SQL API
  const options = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/rest/v1/rpc/version',
    method: 'GET',
    headers: {
      'apikey': 'REMOVED_SUPABASE_JWT',
      'Authorization': 'Bearer REMOVED_SUPABASE_JWT'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body.substring(0, 200));
        resolve();
      });
    });
    req.on('error', e => {
      console.error('Error:', e.message);
      resolve();
    });
    req.end();
  });
}

// Try the Supabase Management API SQL endpoint (requires PAT)
async function trySqlEndpoint() {
  const sql_statements = sql;
  
  // Try with anon key first to see what error we get
  const postData = JSON.stringify({ query: 'SELECT 1 as test' });
  
  const options = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'REMOVED_SUPABASE_JWT',
      'Authorization': 'Bearer REMOVED_SUPABASE_JWT',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        console.log('\n/sql endpoint status:', res.statusCode);
        console.log('Response:', body.substring(0, 300));
        resolve();
      });
    });
    req.on('error', e => {
      console.error('Error:', e.message);
      resolve();
    });
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('Testing Supabase connectivity and SQL endpoints...\n');
  await runSqlViaManagementApi();
  await trySqlEndpoint();
  
  console.log('\n--- SQL to be applied ---');
  console.log('Length:', sql.length, 'chars');
  console.log('Statements: archive-old-articles update + delete-old-articles update');
}

main().catch(console.error);
