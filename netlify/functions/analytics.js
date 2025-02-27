const { google } = require('googleapis');

exports.handler = async (event, context) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.SITE_URL}/.netlify/functions/auth-callback`
    );

    oauth2Client.setCredentials({
      access_token: 'ya29.a0AeXRPp5dG9flvjWbUbXD1Klm-OKk1v1ZAwuR4VuraBZ125sbE8xJ_E__fRtW4o7gUAgMnKLn95gaXR-6YRIxvkhtcIf78e-TfMHNlNUPvyv2obi_fIWGaSpZ2fAh5txSFtWN5c4l2sTmR6UFC0H47pDZjmhXkHWmf32xGnSpaCgYKAVwSARISFQHGX2MiJXox2tJIbsLReNlhiCi8PQ0175',
      refresh_token: '1//04bOTrckPrz-dCgYIARAAGAQSNwF-L9IrhBtFOmZgkSlsl-ox2Q1Pn9td46VHUd1iAPhpE_-r716xPPHL8ppV8hIa-2Imge9U1Wo',
    });

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
          ],
        },
      });
    } catch (gaError) {
      console.error('Google Analytics Error:', gaError.message);
      gaResponse = { data: { error: gaError.message } };
    }

    let gscResponse;
    try {
      gscResponse = await searchconsole.searchanalytics.query({
        siteUrl: process.env.SITE_URL,
        requestBody: {
          startDate: '30daysAgo',
          endDate: 'today',
          dimensions: ['query'],
          rowLimit: 5,
        },
      });
    } catch (gscError) {
      console.error('Google Search Console Error:', gscError.message);
      gscResponse = { data: { error: gscError.message } };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ga: gaResponse.data,
        gsc: gscResponse.data,
      }),
    };
  } catch (error) {
    console.error('Function Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + error.message }),
    };
  }
};
