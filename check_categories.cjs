const supabase = require('./scripts/supabase-client.cjs');

const MEDIA_CATEGORIES = [
  'ვიდეო რეპორტაჟები',
  'პოდკასტები',
  'საინტერესო',
  'ლაივი',
  'LIVE',
];

async function run() {
  const { data: categories, error: categoriesError } = await supabase
    .from('articles')
    .select('category, content_type')
    .order('category', { ascending: true });

  if (categoriesError) {
    throw new Error(`Could not fetch categories: ${categoriesError.message}`);
  }

  const unique = new Map();
  for (const row of categories || []) {
    const key = `${row.category}|${row.content_type}`;
    const current = unique.get(key) || {
      category: row.category,
      content_type: row.content_type,
      count: 0,
    };
    current.count += 1;
    unique.set(key, current);
  }
  console.table([...unique.values()].sort((a, b) =>
    (a.category || '').localeCompare(b.category || '')
  ));

  const { data: media, error: mediaError } = await supabase
    .from('articles')
    .select('id, category, content_type, title')
    .in('category', MEDIA_CATEGORIES)
    .limit(30);

  if (mediaError) {
    throw new Error(`Could not fetch media categories: ${mediaError.message}`);
  }
  console.table(media || []);

  const { data: liveRows, error: liveError } = await supabase
    .from('articles')
    .select('id, category, content_type, title')
    .eq('content_type', 'live')
    .limit(20);

  if (liveError) {
    throw new Error(`Could not fetch live articles: ${liveError.message}`);
  }
  console.table(liveRows || []);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
