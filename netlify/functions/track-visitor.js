const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

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

  let city = 'unknown';
  let country = 'unknown';
  try {
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!geoResponse.ok) throw new Error('Geolocation API failed');
    const geoData = await geoResponse.json();
    city = geoData.city || 'unknown';
    country = geoData.country_name || 'unknown';
    console.log('Geolocation success:', { city, country }); // Debug
  } catch (geoError) {
    console.error('Geolocation fetch error:', geoError.message); // Debug
  }

  const deviceType = /mobile/i.test(userAgent)
    ? 'mobile'
    : /tablet/i.test(userAgent)
    ? 'tablet'
    : 'desktop';

  let authenticatedUserId = userId || null;
  const token = event.headers['authorization']?.replace('Bearer ', '');
  console.log('Request headers:', { token: token ? 'Present' : 'Absent', ip, referrer, userAgent }); // Debug

  if (token && !authenticatedUserId) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      authenticatedUserId = user?.id || null;
      console.log('User authenticated:', authenticatedUserId); // Debug
    } catch (authError) {
      console.error('Auth error:', authError.message); // Debug
    }
  }

  const visitorData = {
    ip_address: ip,
    referrer: referrer || 'direct',
    city: city || 'unknown',
    country: country || 'unknown',
    device_type: deviceType || 'unknown',
    user_agent: userAgent || 'unknown',
    page_url: pageUrl || '/',
    click_events: clickEvents || [],
    duration: duration || 0,
    visit_timestamp: new Date().toISOString(),
    user_id: authenticatedUserId,
  };

  console.log('Inserting visitor data:', visitorData); // Debug

  try {
    const { error } = await supabase.from('visitors').insert(visitorData);
    if (error) throw error;
    console.log('Visitor inserted successfully'); // Debug
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Visit tracked', id: visitorData.id }),
    };
  } catch (error) {
    console.error('Insert error:', error.message); // Debug
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track visitor: ' + error.message }),
    };
  }
};
