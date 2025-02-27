const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SITE_URL}/.netlify/functions/auth-callback`
  );

  // For simplicity, manually paste your tokens here after first auth
  oauth2Client.setCredentials({
    access_token: 'YOUR_ACCESS_TOKEN',
    refresh_token: 'YOUR_REFRESH_TOKEN',
  });

  const analytics = google.analyticsdata({
    version: 'v1beta',
    auth: oauth2Client,
  });

  const searchconsole = google.webmasters({
    version: 'v3',
    auth: oauth2Client,
  });

  // Fetch GA data
  const gaResponse = await analytics.properties.runReport({
    property: `properties/${process.env.GA_PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
      ],
    },
  });

  // Fetch GSC data
  const gscResponse = await searchconsole.searchanalytics.query({
    siteUrl: process.env.SITE_URL,
    requestBody: {
      startDate: '2025-01-28',
      endDate: '2025-02-27',
      dimensions: ['query'],
      rowLimit: 5,
    },
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      ga: gaResponse.data,
      gsc: gscResponse.data,
    }),
  };
};
