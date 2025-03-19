const { google } = require('googleapis');
const fetch = require('node-fetch');
const { PDFDocument } = require('pdf-lib');

exports.handler = async (event) => {
  const { fileId } = event.queryStringParameters;

  if (!fileId) {
    console.log('Missing fileId parameter');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'fileId parameter is required' }),
    };
  }

  // Authenticate with Google Drive API using a service account
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  try {
    console.log(`Fetching file metadata for fileId: ${fileId}`);
    const file = await drive.files.get({ fileId, fields: 'mimeType' });
    if (file.data.mimeType !== 'application/pdf') {
      console.log(`File is not a PDF, mimeType: ${file.data.mimeType}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File is not a PDF' }),
      };
    }

    console.log(`Fetching PDF content from: https://drive.google.com/uc?export=download&id=${fileId}`);
    const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}, ${response.statusText}`);
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const buffer = await response.buffer();

    console.log('Parsing PDF to get page count');
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`Page count: ${pageCount}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ pageCount }),
    };
  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
