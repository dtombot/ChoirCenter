const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
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
  const { pageUrl, clickEvents, duration } = body;

  let city = 'unknown';
  let country = 'unknown';
  try {
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    const geoData = await geoResponse.json();
    city = geoData.city || 'unknown';
    country = geoData.country_name || 'unknown';
  } catch (geoError) {
    console.error('Geolocation fetch error:', geoError.message);
  }

  const deviceType = /mobile/i.test(userAgent)
    ? 'mobile'
    : /tablet/i.test(userAgent)
    ? 'tablet'
    : 'desktop';

  try {
    const { error } = await supabase.from('visitors').insert({
      ip_address: ip,
      referrer: referrer || 'direct',
      city: city || 'unknown',
      country: country || 'unknown',
      device_type: deviceType || 'unknown',
      user_agent: userAgent || 'unknown',
      page_url: pageUrl || '/',
      click_events: clickEvents || [],
      duration: duration || 0,
      visit_timestamp: new Date().toISOString()
    });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Visit tracked' }),
    };
  } catch (error) {
    console.error('Track visitor error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track visitor: ' + error.message }),
    };
  }
};
