const { google } = require('googleapis');
const fetch = require('node-fetch');
const { PDFDocument } = require('pdf-lib');

exports.handler = async (event) => {
  const { fileId } = event.queryStringParameters;

  if (!fileId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'fileId parameter is required' }),
    };
  }

  // Authenticate with Google Drive API using a service account or API key
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  try {
    // Verify the file is a PDF
    const file = await drive.files.get({ fileId, fields: 'mimeType' });
    if (file.data.mimeType !== 'application/pdf') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File is not a PDF' }),
      };
    }

    // Fetch the PDF content
    const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const buffer = await response.buffer();

    // Parse PDF and get page count using pdf-lib
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();

    return {
      statusCode: 200,
      body: JSON.stringify({ pageCount }),
    };
  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
