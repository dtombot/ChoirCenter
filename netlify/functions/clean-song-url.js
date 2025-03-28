exports.handler = async (event) => {
  const { path } = event;
  // Extract the song ID from /song/*
  const songId = path.replace(/^\/song\//, '');
  
  // Remove any colon suffix (e.g., :1) and lowercase
  const cleanId = songId.split(':')[0].toLowerCase();
  const cleanUrl = `/song/${cleanId}`;
  
  // Return a 301 redirect to the cleaned URL
  return {
    statusCode: 301,
    headers: {
      Location: cleanUrl,
    },
    body: '',
  };
};
