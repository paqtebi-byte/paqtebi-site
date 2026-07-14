const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'REMOVED_SUPABASE_PROJECT_URL';
// Using service role key approach via REST to query cron.job if accessible
const supabaseKey = 'REMOVED_SUPABASE_JWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Try to read cron.job table via REST (requires pg_cron extension & correct schema)
  console.log('\n=== Querying cron.job table for delete-old-articles and archive-old-articles ===');

  // pg_cron jobs are in the "cron" schema - try via rpc
  const { data, error } = await supabase
    .rpc('get_cron_jobs', {})
    .select('*');

  if (error) {
    console.log('RPC not available, trying direct table access...');
    // Try direct
    const { data: d2, error: e2 } = await supabase
      .from('cron.job')
      .select('*');
    if (e2) {
      console.error('Cannot access cron.job via REST (expected - cron schema is not exposed via PostgREST).');
      console.log('\n--- NOTE ---');
      console.log('The cron.job table lives in the "cron" schema which is NOT exposed via the REST API.');
      console.log('To read it, you need to run this SQL directly in Supabase SQL Editor:');
      console.log('  SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname IN (\'delete-old-articles\', \'archive-old-articles\');');
    } else {
      console.table(d2);
    }
  } else {
    console.table(data);
  }
}

run().catch(console.error);
