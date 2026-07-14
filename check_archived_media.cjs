const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'REMOVED_SUPABASE_PROJECT_URL';
const supabaseKey = 'REMOVED_SUPABASE_JWT';

const supabase = createClient(supabaseUrl, supabaseKey);

const MEDIA_CATEGORIES = ['ვიდეო რეპორტაჟები', 'პოდკასტები', 'საინტერესო', 'ლაივი'];

async function run() {
  console.log('\n=== Media category rows: is_archived status + age ===');

  const { data, error } = await supabase
    .from('articles')
    .select('id, category, content_type, title, created_at, is_archived')
    .in('category', MEDIA_CATEGORIES)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  const now = new Date();
  console.log(`\nTotal media rows: ${data.length}\n`);

  let archivedCount = 0;
  data.forEach(r => {
    const ageDays = Math.floor((now - new Date(r.created_at)) / (1000 * 60 * 60 * 24));
    const flag = r.is_archived ? '⚠️  ARCHIVED' : '✅ active';
    console.log(`  ${flag} | category="${r.category}" | age=${ageDays}d | is_archived=${r.is_archived} | "${r.title?.substring(0,40)}"`);
    if (r.is_archived) archivedCount++;
  });

  console.log(`\n--- Summary ---`);
  console.log(`Already archived (is_archived=true): ${archivedCount}`);
  console.log(`Active (is_archived=false):          ${data.length - archivedCount}`);

  if (archivedCount > 0) {
    console.log('\n⚠️  ACTION NEEDED: one-off un-archive UPDATE required in migration.');
  } else {
    console.log('\n✅ CLEAR: No media rows are archived. No retroactive fix needed.');
  }
}

run().catch(console.error);
