const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  const { email, type } = JSON.parse(event.body);

  if (!email || !type) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing email or type' }),
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_SERVER,
    port: process.env.BREVO_SMTP_PORT,
    secure: false, // Use TLS
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });

  const subject = type === 'signup' ? 'Welcome to Choir Center - Signup Successful!' : 'Welcome to Choir Center!';
  const text =
    type === 'signup'
      ? 'Thank you for signing up to Choir Center! Your account is ready—start exploring our choir resources now.'
      : 'Welcome to Choir Center! We’re thrilled to have you join our community. Discover free sheet music, blog insights, and more!';

  try {
    await transporter.sendMail({
      from: 'no-reply@choircenter.com',
      to: email,
      subject,
      text,
    });

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
