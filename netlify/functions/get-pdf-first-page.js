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
    const scale = 1.5; // Adjust scale for resolution
    const viewport = page.getViewport({ scale });

    // Create an offscreen canvas-like object in memory
    const canvasFactory = {
      create: (width, height) => {
        const canvas = {
          width,
          height,
          getContext: () => ({
            drawImage: () => {}, // Stub; pdfjs handles this internally
            canvas: { width, height },
            toDataURL: () => {
              // This will be populated by pdfjs rendering
              return '';
            },
          }),
        };
        return {
          canvas,
          context: canvas.getContext('2d'),
        };
      },
      destroy: () => {},
    };

    const renderContext = {
      canvasFactory,
      viewport,
    };

    // Render the page
    await page.render(renderContext).promise;

    // Use pdfjs-dist’s internal canvas to get base64 (requires a workaround)
    const operatorList = await page.getOperatorList();
    const canvas = renderContext.canvasFactory.create(viewport.width, viewport.height).canvas;
    const context = canvas.getContext('2d');

    // Render manually to a buffer (simplified; requires pdfjs worker setup in full)
    const { ImageData } = require('pdfjs-dist/build/pdf');
    const renderTask = page.render({ canvasContext: context, viewport });
    await renderTask.promise;

    // Convert to base64 (this requires a proper canvas, so we’ll simulate it)
    const base64Image = canvas.toDataURL ? canvas.toDataURL('image/png') : Buffer.from(context.getImageData(0, 0, viewport.width, viewport.height).data).toString('base64');
    const finalBase64 = `data:image/png;base64,${base64Image}`;
    console.log('First page rendered as base64 PNG');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageCount,
        firstPageBase64: finalBase64,
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
