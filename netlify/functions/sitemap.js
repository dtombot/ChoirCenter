const { createClient } = require('@supabase/supabase-js');
const NodeCache = require('node-cache');
const zlib = require('zlib');

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

const getChangefreq = (updatedAt) => {
  const diffDays = Math.floor((new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return 'daily';
  if (diffDays <= 7) return 'weekly';
  if (diffDays <= 30) return 'monthly';
  return 'yearly';
};

exports.handler = async (event, context) => {
  const cachedSitemap = cache.get('sitemap');
  if (cachedSitemap) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml', 'Content-Encoding': 'gzip' },
      body: cachedSitemap,
      isBase64Encoded: true,
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: 'Supabase URL or Service Role Key not set' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const baseUrl = 'https://choircenter.com';
  const currentDate = new Date().toISOString().split('T')[0];
  const deploymentDate = '2025-03-01'; // Replace with your last deployment date

  try {
    // Fetch songs with Google Drive file IDs (assuming a column like 'drive_file_id')
    const { data: songs, error: songError } = await supabase
      .from('songs')
      .select('permalink, id, updated_at, drive_file_id') // Add your Google Drive ID column
      .eq('is_public', true);
    if (songError) throw songError;

    // Fetch blog posts
    const { data: posts, error: postError } = await supabase
      .from('blog_posts')
      .select('permalink, id, updated_at');
    if (postError) throw postError;

    // Static pages with realistic lastmod and changefreq
    const staticPages = [
      { loc: `${baseUrl}/`, lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/library`, lastmod: currentDate, changefreq: 'weekly', priority: '0.9' },
      { loc: `${baseUrl}/blog`, lastmod: currentDate, changefreq: 'weekly', priority: '0.9' },
      { loc: `${baseUrl}/about`, lastmod: deploymentDate, changefreq: 'yearly', priority: '0.4' },
      { loc: `${baseUrl}/contact`, lastmod: deploymentDate, changefreq: 'yearly', priority: '0.4' },
      { loc: `${baseUrl}/privacy`, lastmod: deploymentDate, changefreq: 'yearly', priority: '0.3' },
      { loc: `${baseUrl}/terms`, lastmod: deploymentDate, changefreq: 'yearly', priority: '0.3' },
    ];

    // Dynamic song URLs with Google Drive thumbnail images
    const songUrls = songs.map(song => {
      let xml = `<url>
        <loc>${baseUrl}/song/${song.permalink || song.id}</loc>
        <lastmod>${song.updated_at ? new Date(song.updated_at).toISOString().split('T')[0] : currentDate}</lastmod>
        <changefreq>${song.updated_at ? getChangefreq(song.updated_at) : 'weekly'}</changefreq>
        <priority>0.7</priority>`;
      if (song.drive_file_id) {
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${song.drive_file_id}`;
        xml += `
        <image:image xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
          <image:loc>${thumbnailUrl}</image:loc>
          <image:title>${song.permalink || song.id} Sheet Music</image:title>
        </image:image>`;
      }
      xml += `</url>`;
      return xml;
    });

    // Dynamic blog post URLs
    const postUrls = posts.map(post => `<url>
      <loc>${baseUrl}/blog/${post.permalink || `post-${post.id}`}</loc>
      <lastmod>${post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : currentDate}</lastmod>
      <changefreq>${post.updated_at ? getChangefreq(post.updated_at) : 'weekly'}</changefreq>
      <priority>0.7</priority>
    </url>`);

    // Combine all URLs
    const allUrls = [
      ...staticPages.map(url => `<url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`),
      ...songUrls,
      ...postUrls,
    ];

    // Generate XML with image namespace
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${allUrls.join('')}
</urlset>`;

    const gzippedXml = zlib.gzipSync(xml).toString('base64');
    cache.set('sitemap', gzippedXml);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml', 'Content-Encoding': 'gzip' },
      body: gzippedXml,
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Sitemap generation error:', error.message);
    return { statusCode: 500, body: 'Error generating sitemap: ' + error.message };
  }
};
