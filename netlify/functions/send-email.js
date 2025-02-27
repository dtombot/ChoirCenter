const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { email, type } = JSON.parse(event.body);

  if (!email || !type) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing email or type' }),
    };
  }

  // Replace with your SendGrid API key or SMTP credentials
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = 'no-reply@choircenter.com'; // Your sender email

  const subject = type === 'signup' ? 'Welcome to Choir Center - Signup Successful!' : 'Welcome to Choir Center!';
  const text =
    type === 'signup'
      ? 'Thank you for signing up to Choir Center! Your account is ready—start exploring our choir resources now.'
      : 'Welcome to Choir Center! We’re thrilled to have you join our community. Discover free sheet music, blog insights, and more!';

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });

    if (!response.ok) throw new Error('Email send failed');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' }),
    };
  } catch (error) {
    console.error('Email error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
    };
  }
};
