const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('Supabase URL:', supabaseUrl);
  console.log('Service Role Key (first 10 chars):', supabaseKey?.substring(0, 10) || 'Not set');

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase URL or Service Role Key not set' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, has_donated'); // Ensure has_donated is included

    if (profileError) throw profileError;

    const users = authUsers.users.map(user => {
      const profile = profiles.find(p => p.id === user.id) || {};
      return {
        id: user.id,
        email: profile.email || user.email,
        full_name: profile.full_name || user.user_metadata?.full_name || 'N/A', // Add full_name if available
        is_admin: profile.is_admin || user.role === 'admin' || user.user_metadata?.is_admin || false,
        has_donated: profile.has_donated ?? false, // Use profile.has_donated, default to false if null
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(users),
    };
  } catch (error) {
    console.error('Fetch users error:', error.message);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
