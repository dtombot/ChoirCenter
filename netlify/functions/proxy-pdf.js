const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { fileId } = event.queryStringParameters;

  if (!fileId) {
    console.log('Missing fileId parameter');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'fileId parameter is required' }),
    };
  }

  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    console.log(`Fetching PDF from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}, ${response.statusText}`);
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const pdfBuffer = await response.buffer();
    console.log('PDF fetched successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*', // Allow CORS for the client
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
