const supabase = require('./scripts/supabase-client.cjs');

const MEDIA_CATEGORIES = [
  'ვიდეო რეპორტაჟები',
  'პოდკასტები',
  'საინტერესო',
  'ლაივი',
];

async function run() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, category, content_type, title, created_at, is_archived')
    .in('category', MEDIA_CATEGORIES)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Could not fetch archived media: ${error.message}`);
  }

  const rows = data || [];
  const archivedCount = rows.filter((row) => row.is_archived).length;
  console.table(rows.map((row) => ({
    id: row.id,
    category: row.category,
    content_type: row.content_type,
    is_archived: row.is_archived,
    age_days: Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000),
    title: row.title,
  })));
  console.log({
    total: rows.length,
    archived: archivedCount,
    active: rows.length - archivedCount,
  });
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
