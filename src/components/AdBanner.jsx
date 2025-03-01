import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import '../styles.css';

function AdBanner({ position }) {
  const [adHtml, setAdHtml] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAd = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('advertisements')
          .select('code')
          .eq('position', position)
          .eq('is_active', true)
          .limit(1);

        console.log(`Ad fetch for ${position}:`, { data, error });

        if (error) {
          console.error('Ad fetch error:', error.message);
          setAdHtml(null);
        } else if (data && data.length > 0 && data[0].code) {
          setAdHtml(data[0].code);
        } else {
          console.log(`No active ad for position: ${position}`);
          setAdHtml(null);
        }
      } catch (err) {
        console.error('Unexpected ad fetch error:', err.message);
        setAdHtml(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [position]);

  if (loading) {
    return null; // Don’t show anything while loading
  }

  if (!adHtml) {
    return null; // Silently skip rendering if no ad
  }

  return (
    <div className={`ad-banner ad-${position}`} dangerouslySetInnerHTML={{ __html: adHtml }} />
  );
}

export default AdBanner;
