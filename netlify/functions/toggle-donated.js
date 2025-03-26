const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://puflbizxohpnrakpyjaz.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

exports.handler = async (event) => {
  const { userId, hasDonated } = JSON.parse(event.body);

  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existingProfile) {
      const { error } = await supabase
        .from('profiles')
        .update({ has_donated: !hasDonated })
        .eq('id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('profiles')
        .insert([{ id: userId, has_donated: !hasDonated }]);
      if (error) throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
