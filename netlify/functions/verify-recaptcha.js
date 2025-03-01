const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { token } = JSON.parse(event.body);
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secretKey}&response=${token}`,
  });

  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify({ success: data.success }),
  };
};
