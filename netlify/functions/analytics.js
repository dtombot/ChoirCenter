const { google } = require('googleapis');

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

exports.handler = async (event, context) => {
  console.log('Analytics function invoked:', new Date().toISOString());

  // Validate environment variables
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SITE_URL',
    'GA_PROPERTY_ID',
    'GOOGLE_ACCESS_TOKEN',
    'GOOGLE_REFRESH_TOKEN',
  ];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('Missing environment variables:', missingVars.join(', '));
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Missing environment variables: ${missingVars.join(', ')}`,
      }),
    };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.SITE_URL}/.netlify/functions/auth-callback`
    );

    console.log('Setting credentials...');
    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // Refresh token if needed
    console.log('Refreshing token...');
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log('Token refreshed successfully');
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError.message);
      throw new Error('Authentication refresh failed: ' + refreshError.message);
    }

    const analytics = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
    const searchconsole = google.webmasters({ version: 'v3', auth: oauth2Client });

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = getDateDaysAgo(30);

    // Fetch Google Analytics data
    let gaData = { rows: [], error: null };
    try {
      console.log('Fetching GA data...');
      const gaResponse = await analytics.properties.runReport({
        property: `properties/${process.env.GA_PROPERTY_ID}`,
        requestBody: {
          dateRanges: [{ startDate: thirtyDaysAgo, endDate: today }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'sessions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'eventCount' },
            { name: 'newUsers' },
          ],
        },
      });
      gaData = gaResponse.data;
      console.log('GA data fetched:', gaData.rows ? 'Rows present' : 'No rows');
    } catch (gaError) {
      console.error('GA fetch error:', gaError.message);
      gaData.error = 'Google Analytics fetch failed: ' + gaError.message;
    }

    // Fetch Search Console data
    let gscData = { rows: [], error: null };
    try {
      console.log('Fetching GSC data...');
      const gscResponse = await searchconsole.searchanalytics.query({
        siteUrl: process.env.SITE_URL,
        requestBody: {
          startDate: thirtyDaysAgo,
          endDate: today,
          dimensions: ['query'],
          rowLimit: 5,
        },
      });
      gscData = gscResponse.data;
      console.log('GSC data fetched:', gscData.rows ? 'Rows present' : 'No rows');
    } catch (gscError) {
      console.error('GSC fetch error:', gscError.message);
      gscData.error = 'Search Console fetch failed: ' + gscError.message;
    }

    console.log('Returning analytics data...');
    return {
      statusCode: 200,
      body: JSON.stringify({
        ga: gaData,
        gsc: gscData,
      }),
    };
  } catch (error) {
    console.error('Function execution error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Analytics processing failed: ' + error.message,
      }),
    };
  }
};
