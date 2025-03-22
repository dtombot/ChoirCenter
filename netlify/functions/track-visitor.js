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
  const body = JSON.parse(event.body || '{}');

  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown';
  const referrer = event.headers['referer'] || 'direct';
  const userAgent = event.headers['user-agent'] || 'unknown';
  const { pageUrl, clickEvents, duration, userId } = body;

  const deviceType = /mobile/i.test(userAgent)
    ? 'mobile'
    : /tablet/i.test(userAgent)
    ? 'tablet'
    : 'desktop';

  let authenticatedUserId = userId || null;
  const token = event.headers['authorization']?.replace('Bearer ', '');
  console.log('Request headers:', { token: token ? 'Present' : 'Absent', ip, referrer, userAgent });

  if (token && !authenticatedUserId) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      authenticatedUserId = user?.id || null;
      console.log('User authenticated:', authenticatedUserId);
    } catch (authError) {
      console.error('Auth error:', authError.message);
    }
  }

  const visitorData = {
    ip_address: ip,
    referrer: referrer || 'direct',
    city: 'unknown', // Skip geolocation
    country: 'unknown', // Skip geolocation
    device_type: deviceType || 'unknown',
    user_agent: userAgent || 'unknown',
    page_url: pageUrl || '/',
    click_events: clickEvents || [],
    duration: duration || 0,
    visit_timestamp: new Date().toISOString(),
    user_id: authenticatedUserId,
  };

  console.log('Inserting visitor data:', visitorData);

  try {
    const { data, error } = await supabase.from('visitors').insert(visitorData).select('id');
    if (error) throw error;
    console.log('Visitor inserted successfully:', { insertedId: data[0]?.id });
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Visit tracked', id: data[0]?.id }),
    };
  } catch (error) {
    console.error('Insert error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track visitor: ' + error.message }),
    };
  }
};
