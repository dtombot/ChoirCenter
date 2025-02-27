const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const { code } = event.queryStringParameters;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SITE_URL}/.netlify/functions/auth-callback`
  );

  const { tokens } = await oauth2Client.getToken(code);
  return {
    statusCode: 200,
    body: JSON.stringify({ tokens }),
  };
};
