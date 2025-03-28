exports.handler = async (event) => {
  const { path, queryStringParameters } = event;

  // If 'cleaned' query param exists, skip redirection (already processed)
  if (queryStringParameters && queryStringParameters.cleaned === 'true') {
    return {
      statusCode: 200, // Let it fall through to SPA
      body: '',
    };
  }

  const songId = path.replace(/^\/song\//, '');
  const cleanId = songId.split(':')[0].toLowerCase();
  const cleanUrl = `/song/${cleanId}?cleaned=true`;

  console.log(`Original path: ${path}, Cleaned URL: ${cleanUrl}`);

  return {
    statusCode: 301,
    headers: {
      Location: cleanUrl,
    },
    body: '',
  };
};
