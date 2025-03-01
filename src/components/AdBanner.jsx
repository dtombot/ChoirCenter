import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import '../styles.css';

function AdBanner({ position }) {
  const [adCode, setAdCode] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const { data, error } = await supabase
          .from('advertisements')
          .select('code')
          .eq('position', position)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0 && data[0].code) {
          setAdCode(data[0].code);
          if (window.adsbygoogle) {
            setTimeout(() => {
              try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
              } catch (e) {
                console.error('Ad push error:', e);
              }
            }, 100);
          }
        } else {
          setAdCode(null); // No active ad found
        }
      } catch (err) {
        console.error('Ad fetch error:', err.message);
        setError('Failed to load ad.');
        setAdCode(null); // Fallback to no ad
      }
    };

    fetchAd();
  }, [position]);

  if (error) {
    return <aside className="ad-space"><p className="error-message">{error}</p></aside>;
  }

  if (!adCode) {
    return (
      <aside className="ad-space">
        <div className="ad-sample">
          <span className="ad-text">Place your Ad here. Advertise on ChoirCenter.com</span>
          <svg className="ad-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="#3cb371" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"/>
            <path fill="#fff" d="M12 6l4 6h-8l4-6zm0 6v6h-2v-6h2z"/>
          </svg>
          <a href="mailto:admin@choircenter.com" className="ad-link">Contact Us</a>
        </div>
      </aside>
    );
  }

  return (
    <aside className="ad-space">
      <div dangerouslySetInnerHTML={{ __html: adCode }} />
    </aside>
  );
}

export default AdBanner;
