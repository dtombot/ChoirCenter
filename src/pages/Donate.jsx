import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import '../styles.css';

function Donate() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState(null);

  const paymentSuccess = searchParams.get('reference'); // Simplified to check only reference

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        setError('You must be logged in to donate. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setUserId(sessionData.session.user.id);
      }
    };
    checkSession();
  }, [navigate]);

  const handleDonate = () => {
    if (!userId) {
      setError('User ID not found. Please log in again.');
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    window.location.href = `https://paystack.com/pay/choircenterdonation?callback_url=https://choircenter.com/thank-you?user_id=${userId}`;
  };

  useEffect(() => {
    if (paymentSuccess && userId) {
      setSuccess('Thank you for your donation! Redirecting...');
      setTimeout(() => navigate('/thank-you'), 1000);
    }
  }, [paymentSuccess, userId, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Support Choir Center</h2>
        <p className="auth-subtitle">Help sustain Choir Center with a small donation and unlock unlimited downloads!</p>
        {error && <p className="error-message">{error}</p>}
        {success ? (
          <p className="success-message">{success}</p>
        ) : (
          <>
            <p className="auth-subtitle">Buy us a Meat Pie ☕ to keep the music flowing!</p>
            <button onClick={handleDonate} className="meatpie-button" disabled={loading || !userId}>
              {loading ? 'Processing...' : 'Donate Now'}
            </button>
          </>
        )}
        <p className="auth-link">
          <Link to="/library">Back to Library</Link>
        </p>
      </div>
    </div>
  );
}

export default Donate;
