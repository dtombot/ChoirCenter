// netlify/functions/sitemap.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      body: 'Supabase URL or Service Role Key not set',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch all public songs
    const { data: songs, error: songError } = await supabase
      .from('songs')
      .select('permalink, id, updated_at')
      .eq('is_public', true);

    if (songError) throw songError;

    // Fetch all blog posts
    const { data: posts, error: postError } = await supabase
      .from('blog_posts')
      .select('permalink, id, updated_at');

    if (postError) throw postError;

    // Base URL for the site
    const baseUrl = 'https://choircenter.com';
    const currentDate = new Date().toISOString().split('T')[0]; // e.g., 2025-03-10

    // Static pages
    const staticPages = [
      { loc: `${baseUrl}/`, lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/library`, lastmod: currentDate, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/blog`, lastmod: currentDate, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/about`, lastmod: currentDate, changefreq: 'monthly', priority: '0.5' },
      { loc: `${baseUrl}/contact`, lastmod: currentDate, changefreq: 'monthly', priority: '0.5' },
      { loc: `${baseUrl}/privacy`, lastmod: currentDate, changefreq: 'monthly', priority: '0.5' },
      { loc: `${baseUrl}/terms`, lastmod: currentDate, changefreq: 'monthly', priority: '0.5' },
    ];

    // Dynamic song URLs
    const songUrls = songs.map(song => ({
      loc: `${baseUrl}/song/${song.permalink || song.id}`,
      lastmod: song.updated_at ? new Date(song.updated_at).toISOString().split('T')[0] : currentDate,
      changefreq: 'weekly',
      priority: '0.7',
    }));

    // Dynamic blog post URLs
    const postUrls = posts.map(post => ({
      loc: `${baseUrl}/blog/${post.permalink || `post-${post.id}`}`,
      lastmod: post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : currentDate,
      changefreq: 'weekly',
      priority: '0.7',
    }));

    // Combine all URLs
    const allUrls = [...staticPages, ...songUrls, ...postUrls];

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allUrls
    .map(
      url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
    )
    .join('')}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xml,
    };
  } catch (error) {
    console.error('Sitemap generation error:', error.message);
    return {
      statusCode: 500,
      body: 'Error generating sitemap: ' + error.message,
    };
  }
};
