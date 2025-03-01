const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin');

    if (profileError) throw profileError;

    const users = authUsers.users.map(user => ({
      id: user.id,
      email: user.email,
      is_admin: profiles.find(p => p.id === user.id)?.is_admin || false,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(users),
    };
  } catch (error) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
