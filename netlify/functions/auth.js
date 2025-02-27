const { google } = require('googleapis');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const { code } = event.queryStringParameters;

  if (!code) {
    const authUrl = google.auth.OAuth2.generateAuthUrl({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${process.env.SITE_URL}/.netlify/functions/auth-callback`,
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
