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

  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    console.log(`Fetching PDF from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}, ${response.statusText}`);
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    console.log('Loading PDF document');
    const pdfDoc = await PDFDocument.load(buffer);

    // Get the total page count
    const pageCount = pdfDoc.getPageCount();
    console.log(`Total page count: ${pageCount}`);

    if (pageCount === 0) {
      throw new Error('PDF has no pages');
    }

    // Create a new PDF with only the first page
    const newPdfDoc = await PDFDocument.create();
    const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
    newPdfDoc.addPage(firstPage);

    // Render the first page as PNG
    const pngImage = await newPdfDoc.saveAsBase64({ dataUri: false });
    console.log('First page rendered as base64 PNG');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageCount,
        firstPageBase64: `data:image/png;base64,${pngImage}`,
      }),
    };
  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
