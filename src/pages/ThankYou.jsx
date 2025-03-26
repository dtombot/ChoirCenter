import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles.css';

function ThankYou() {
  const [message, setMessage] = useState(null); // Only success message
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paymentSuccess = searchParams.get('reference'); // Check for payment reference
  const userIdFromUrl = searchParams.get('user_id');

  useEffect(() => {
    const handleDonation = async () => {
      setLoading(true);
      setMessage(null); // Clear any previous message

      // If no payment reference, redirect silently to home
      if (!paymentSuccess) {
        setLoading(false);
        navigate('/');
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session Data:', sessionData);
        let userId = userIdFromUrl;

        if (sessionError || !sessionData.session) {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !data.session) {
            setLoading(false);
            navigate('/login');
            return;
          }
          console.log('Session restored:', data.session);
          userId = userId || data.session.user.id;
        } else {
          userId = userId || sessionData.session.user.id;
        }

        if (!userId) {
          setLoading(false);
          navigate('/login');
          return;
        }

        // Check and update donation status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('has_donated')
          .eq('id', userId)
          .single();
        if (profileError) throw profileError;

        if (!profileData.has_donated) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ has_donated: true, updated_at: new Date().toISOString() })
            .eq('id', userId);
          if (updateError) {
            console.error('Update error:', updateError);
            throw updateError;
          }
        }

        setMessage('Thank you for your donation! You now have unlimited downloads this month.');
        setLoading(false);
        setTimeout(() => navigate('/library'), 5000);
      } catch (err) {
        console.error('Error in handleDonation:', err);
        setLoading(false);
        navigate('/'); // Redirect silently on error
      }
    };

    handleDonation();
  }, [paymentSuccess, userIdFromUrl, navigate]);

  const goToLibrary = () => {
    navigate('/library');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Thank You!</h2>
        {loading && <p>Loading...</p>}
        {message && (
          <>
            <p className="success-message">{message}</p>
            <button onClick={goToLibrary} className="auth-button" disabled={loading}>
              Go to Library
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ThankYou;
