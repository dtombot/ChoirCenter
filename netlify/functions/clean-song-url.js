const { join } = require('path');
const { readFileSync } = require('fs');

exports.handler = async (event) => {
  const { path } = event;
  const songId = path.replace(/^\/song\//, '');
  const cleanId = songId.split(':')[0].toLowerCase();
  const cleanUrl = `/song/${cleanId}`;

  console.log(`Original path: ${path}, Cleaned URL: ${cleanUrl}`);

  // If this is a redirect from a suffixed/mixed-case URL, serve index.html with the cleaned path
  try {
    // Assuming index.html is in the build output (e.g., dist/index.html)
    const indexPath = join(__dirname, '../../dist/index.html');
    const html = readFileSync(indexPath, 'utf8');

    // Optionally rewrite the URL in the response headers or meta tags (not required for SPA routing)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-Cleaned-Path': cleanUrl, // For debugging
      },
      body: html,
    };
  } catch (error) {
    console.error('Error serving index.html:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};
