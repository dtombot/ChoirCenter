import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import '../styles.css';

function AdBanner({ position }) {
  const [adHtml, setAdHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAd = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('advertisements')
          .select('code')
          .eq('position', position)
          .eq('is_active', true)
          .limit(1); // Ensure only one row is returned

        console.log(`Fetching ad for position: ${position}`, { data, error });

        if (error) {
          setError('Failed to fetch ad: ' + error.message);
          setAdHtml(null);
        } else if (data && data.length > 0 && data[0].code) {
          setAdHtml(data[0].code); // Use the first result
        } else {
          setError('No active ad found for this position');
          setAdHtml(null);
        }
      } catch (err) {
        setError('Unexpected error: ' + err.message);
        setAdHtml(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [position]);

  if (loading) {
    return <div className={`ad-banner ad-${position}`}>Loading ad...</div>;
  }

  if (error) {
    console.warn(error);
    return <div className={`ad-banner ad-${position}`}>Ad unavailable: {error}</div>;
  }

  if (!adHtml) {
    console.log(`No ad HTML for position: ${position}`);
    return <div className={`ad-banner ad-${position}`}>No ad configured</div>;
  }

  return (
    <div className={`ad-banner ad-${position}`} dangerouslySetInnerHTML={{ __html: adHtml }} />
  );
}

export default AdBanner;
