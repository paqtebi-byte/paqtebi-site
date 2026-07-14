const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'REMOVED_SUPABASE_PROJECT_URL';
const supabaseKey = 'REMOVED_SUPABASE_JWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Get all distinct category values in the DB
  console.log('\n=== STEP 1: Distinct category values in articles table ===');
  const { data: cats, error: catsErr } = await supabase
    .from('articles')
    .select('category, content_type')
    .order('category', { ascending: true });

  if (catsErr) {
    console.error('Error fetching categories:', catsErr);
  } else {
    // Deduplicate
    const unique = {};
    cats.forEach(r => {
      const key = `${r.category}|${r.content_type}`;
      if (!unique[key]) unique[key] = { category: r.category, content_type: r.content_type, count: 0 };
      unique[key].count++;
    });
    console.table(Object.values(unique).sort((a, b) => (a.category || '').localeCompare(b.category || '')));
  }

  // 2. Get the media category rows specifically - check all possible spellings
  console.log('\n=== STEP 2: Media category rows (video/live/podcast content) ===');
  const { data: media, error: mediaErr } = await supabase
    .from('articles')
    .select('id, category, content_type, title')
    .in('category', ['ვიდეო რეპორტაჟები', 'პოდკასტები', 'საინტერესო', 'ლაივი', 'LIVE'])
    .limit(30);

  if (mediaErr) {
    console.error('Error:', mediaErr);
  } else {
    console.log(`Found ${media.length} rows with media categories:`);
    media.forEach(r => console.log(`  [${r.id}] category="${r.category}" content_type="${r.content_type}" title="${r.title?.substring(0,40)}"`));
  }

  // 3. Also check content_type='live' to catch any rows stored differently
  console.log('\n=== STEP 3: All rows with content_type = live ===');
  const { data: liveRows, error: liveErr } = await supabase
    .from('articles')
    .select('id, category, content_type, title')
    .eq('content_type', 'live')
    .limit(20);

  if (liveErr) {
    console.error('Error:', liveErr);
  } else {
    console.log(`Found ${liveRows.length} live rows:`);
    liveRows.forEach(r => console.log(`  [${r.id}] category="${r.category}" content_type="${r.content_type}"`));
  }
}

run().catch(console.error);
