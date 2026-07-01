const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'REMOVED_SUPABASE_PROJECT_URL';
const supabaseKey = 'REMOVED_SUPABASE_JWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery() {
  console.log("Running Query: SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'articles';");
  
  // Try to access the view directly (this might fail via REST API)
  const { data, error } = await supabase
    .from('pg_policies')
    .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
    .eq('tablename', 'articles');
  
  if (error) {
    console.error("Error fetching from pg_policies via REST:", error);
  } else {
    console.log(data);
  }
}

runQuery();
