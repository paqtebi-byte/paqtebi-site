const supabase = require('./scripts/supabase-client.cjs');

async function runQuery() {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
    .eq('tablename', 'articles');

  if (error) {
    throw new Error(`Could not fetch article policies: ${error.message}`);
  }

  console.table(data);
}

runQuery().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
