const { google } = require('googleapis');

exports.handler = async (event, context) => {
  console.log('Function invoked:', new Date().toISOString());
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.SITE_URL || !process.env.GA_PROPERTY_ID) {
      throw new Error('Missing required environment variables');
    }

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

    console.log('Refreshing token...');
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log('Token refreshed:', credentials.access_token.substring(0, 10) + '...');
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError.message);
      throw new Error('Failed to refresh token: ' + refreshError.message);
    }

    const analytics = google.analyticsdata({
      version: 'v1beta',
      auth: oauth2Client,
    });

    const searchconsole = google.webmasters({
      version: 'v3',
      auth: oauth2Client,
    });

    let gaResponse;
    try {
      console.log('Fetching GA data...');
      gaResponse = await analytics.properties.runReport({
        property: `properties/${process.env.GA_PROPERTY_ID}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
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
      console.log('GA data fetched:', gaResponse.data.rows ? 'Rows present' : 'No rows');
    } catch (gaError) {
      console.error('Google Analytics Error:', gaError.message, gaError.stack);
      gaResponse = { data: { rows: [], error: gaError.message } };
    }

    let gscResponse;
    try {
      console.log('Fetching GSC data...');
      gscResponse = await searchconsole.searchanalytics.query({
        siteUrl: process.env.SITE_URL,
        requestBody: {
          startDate: '30daysAgo',
          endDate: 'today',
          dimensions: ['query'],
          rowLimit: 5,
        },
      });
      console.log('GSC data fetched:', gscResponse.data.rows ? 'Rows present' : 'No rows');
    } catch (gscError) {
      console.error('Google Search Console Error:', gscError.message, gscError.stack);
      gscResponse = { data: { rows: [], error: gscError.message } };
    }

    console.log('Returning response...');
    return {
      statusCode: 200,
      body: JSON.stringify({
        ga: gaResponse.data,
        gsc: gscResponse.data,
      }),
    };
  } catch (error) {
    console.error('Function Error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + error.message }),
    };
  }
};
