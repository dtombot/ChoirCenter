import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles.css';

function ThankYou() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paymentSuccess = searchParams.get('reference'); // Simplified to check only reference
  const userIdFromUrl = searchParams.get('user_id');

  useEffect(() => {
    const handleDonation = async () => {
      if (!paymentSuccess) {
        setError('No donation detected. Redirecting to home...');
        setLoading(false);
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session Data:', sessionData);
        let userId = userIdFromUrl;

        if (sessionError || !sessionData.session) {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !data.session) {
            setError('Session missing. Please log in again.');
            setLoading(false);
            navigate('/login');
            return;
          }
          console.log('Session restored:', data.session);
          userId = userId || data.session.user.id; // Fallback to session user ID
        } else {
          userId = userId || sessionData.session.user.id; // Fallback to session user ID
        }

        if (!userId) {
          setError('User ID not found. Please log in again.');
          setLoading(false);
          navigate('/login');
          return;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ has_donated: true, updated_at: new Date().toISOString() })
          .eq('id', userId);
        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }

        setSuccess('Thank you for your donation! You now have unlimited downloads this month.');
        setLoading(false);
        setTimeout(() => navigate('/library'), 2000);
      } catch (err) {
        console.error('Error in handleDonation:', err);
        setError('Donation recorded, but failed to update profile: ' + err.message);
        setLoading(false);
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
        {error && <p className="error-message">{error}</p>}
        {success && (
          <>
            <p className="success-message">{success}</p>
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
