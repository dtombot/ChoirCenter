const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Ensure only POST requests are allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Parse the request body
  const { userId } = JSON.parse(event.body);
  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'User ID is required' }),
    };
  }

  // Initialize Supabase with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Delete the user from auth
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to delete user' }),
    };
  }
};
