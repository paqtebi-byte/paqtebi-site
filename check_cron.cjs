const supabase = require('./scripts/supabase-client.cjs');

async function run() {
  const { data, error } = await supabase.rpc('get_cron_jobs', {}).select('*');

  if (!error) {
    console.table(data);
    return;
  }

  console.error('Cron jobs are not exposed through the public REST API.');
  console.error('Run this query in the Supabase SQL Editor instead:');
  console.error(
    "SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname IN ('delete-old-articles', 'archive-old-articles');"
  );
  process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
