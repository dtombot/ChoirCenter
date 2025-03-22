const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase configuration missing' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = event.body ? JSON.parse(event.body) : {};

  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown';
  const { pageUrl } = body;

  const visitorData = {
    ip_address: ip,
    page_url: pageUrl || '/',
    visit_timestamp: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('visitors').insert(visitorData).select('id');
    if (error) {
      console.error('Insert error:', error.message);
      throw error;
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Visit tracked', id: data[0]?.id || null }),
    };
  } catch (error) {
    console.error('Insert failed:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track visitor: ' + error.message }),
    };
  }
};
