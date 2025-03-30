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
    // Fetch all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Fetch profiles including full_name
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, has_donated'); // Added full_name, removed is_admin (handled separately)

    if (profileError) throw profileError;

    // Fetch admin status from admins table
    const { data: admins, error: adminError } = await supabase
      .from('admins')
      .select('user_id');
    if (adminError) throw adminError;

    const adminIds = new Set(admins.map(a => a.user_id));

    // Map profiles to a lookup object for efficiency
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Combine auth users with profile and admin data
    const users = authUsers.users.map(user => {
      const profile = profileMap.get(user.id) || {};
      return {
        id: user.id,
        email: profile.email || user.email,
        full_name: profile.full_name || 'N/A', // Use full_name from profiles
        is_admin: adminIds.has(user.id), // Use admins table instead of profiles
        has_donated: profile.has_donated ?? false, // Default to false if null
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
