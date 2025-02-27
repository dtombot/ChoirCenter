const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { user } = JSON.parse(event.body);

  if (!user || !user.email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No user or email provided' }),
    };
  }

  const email = user.email;

  // Send signup email
  await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
    method: 'POST',
    body: JSON.stringify({ email, type: 'signup' }),
  });

  // Send welcome email
  await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
    method: 'POST',
    body: JSON.stringify({ email, type: 'welcome' }),
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Emails triggered' }),
  };
};
