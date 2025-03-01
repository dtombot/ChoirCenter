import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import '../styles.css';

function AdBanner({ position }) {
  const [adHtml, setAdHtml] = useState(null);

  useEffect(() => {
    const fetchAd = async () => {
      const { data, error } = await supabase
        .from('advertisements')
        .select('code')
        .eq('position', position)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching ad:', error.message);
        return;
      }

      if (data && data.code) {
        setAdHtml(data.code);
      }
    };

    fetchAd();
  }, [position]);

  if (!adHtml) return null;

  return (
    <div className={`ad-banner ad-${position}`} dangerouslySetInnerHTML={{ __html: adHtml }} />
  );
}

export default AdBanner;
