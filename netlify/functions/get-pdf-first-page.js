const fetch = require('node-fetch');
const pdfjsLib = require('pdfjs-dist/build/pdf');

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

    const pdfData = await response.arrayBuffer();
    console.log('Loading PDF document');
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const pageCount = pdf.numPages;
    console.log(`Total page count: ${pageCount}`);

    if (pageCount === 0) {
      throw new Error('PDF has no pages');
    }

    // Render the first page
    const page = await pdf.getPage(1);
    const scale = 1.5; // Adjust scale for better resolution
    const viewport = page.getViewport({ scale });
    
    // Create a canvas to render the page
    const canvas = { width: viewport.width, height: viewport.height };
    const context = {
      getImageData: () => null, // Mock for simplicity; pdfjs doesn't need this
      putImageData: () => null,
      drawImage: () => null,
      canvas: canvas,
      getContext: () => ({
        drawImage: () => null, // Mock; we'll handle this manually
        canvas: canvas,
      }),
    };
    
    // Use Node.js canvas-like approach (we'll simulate this with pdfjs output)
    const renderContext = {
      canvasContext: context.getContext('2d'),
      viewport: viewport,
    };

    // Render the page to a canvas
    await page.render(renderContext).promise;

    // Convert to base64 PNG (using a helper function since Node doesn’t have native canvas)
    const canvasNode = require('canvas').createCanvas(viewport.width, viewport.height);
    const ctx = canvasNode.getContext('2d');
    const imageData = await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;
    const base64Image = canvasNode.toDataURL('image/png');
    console.log('First page rendered as base64 PNG');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageCount,
        firstPageBase64: base64Image,
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
