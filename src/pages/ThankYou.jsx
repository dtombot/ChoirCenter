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

  const paymentSuccess = searchParams.get('trxref') && searchParams.get('reference');

  useEffect(() => {
    const updateProfile = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          setError('Session missing after payment. Please log in again.');
          navigate('/login');
          return;
        }

        const userId = sessionData.session.user.id;
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            id: userId, 
            has_donated: true, 
            updated_at: new Date().toISOString() 
          });
        if (error) throw error;

        setSuccess('Thank you for your donation! You now have unlimited downloads this month.');
      } catch (err) {
        setError('Donation recorded, but failed to update profile: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (paymentSuccess) {
      updateProfile();
    } else {
      setLoading(false);
      setError('No donation detected. Redirecting to home...');
      setTimeout(() => navigate('/'), 2000);
    }
  }, [paymentSuccess, navigate]);

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
