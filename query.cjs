const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://scokpscivzurygaxabxo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjb2twc2Npdnp1cnlnYXhhYnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDYwNjcsImV4cCI6MjA5NTEyMjA2N30.8s0c5sUGaTdbKGmdGnN_1Kd4FjKrmq8C-_MPMtrb--I';

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
