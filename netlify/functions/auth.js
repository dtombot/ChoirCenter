const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const { code } = event.queryStringParameters;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SITE_URL}/.netlify/functions/auth-callback`
  );

  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      scope: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/webmasters.readonly',
      ],
      access_type: 'offline',
      prompt: 'consent',
    });
    return {
      statusCode: 302,
      headers: { Location: authUrl },
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Authorization code received', code }),
  };
};
