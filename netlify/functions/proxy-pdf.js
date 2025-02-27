const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { fileId } = event.queryStringParameters;

  if (!fileId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing fileId parameter' }),
    };
  }

  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Drive responded with status: ${response.status}`);
    }

    const buffer = await response.buffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*', // Allow all origins (or restrict to choircenter.com)
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error fetching PDF:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch PDF' }),
    };
  }
};
