import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles.css';

function ThankYou() {
  const [message, setMessage] = useState(null); // Success message state
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

        setMessage({
          heading: 'Thank You for Your Generous Donation!',
          subheading: 'Your support ensures Choir Center remains a vibrant resource for choristers everywhere.',
          details: 'You now have unlimited downloads this month. Check your profile for details!',
        });
        setLoading(false);
        setTimeout(() => navigate('/profile'), 15000); // Redirect to profile after 15 seconds
      } catch (err) {
        console.error('Error in handleDonation:', err);
        setLoading(false);
        navigate('/'); // Redirect silently on error
      }
    };

    handleDonation();
  }, [paymentSuccess, userIdFromUrl, navigate]);

  const goToProfile = () => {
    navigate('/profile');
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ padding: '2rem', textAlign: 'center' }}>
        {loading ? (
          <p>Loading...</p>
        ) : message ? (
          <>
            <h2 className="auth-title" style={{ color: '#2f4f2f', marginBottom: '1rem' }}>
              {message.heading}
            </h2>
            <p className="success-message" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
              {message.subheading}
            </p>
            <p style={{ fontSize: '1rem', color: '#555', marginBottom: '2rem' }}>
              {message.details}
            </p>
            <button
              onClick={goToProfile}
              className="auth-button"
              style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
            >
              View Your Profile Now
            </button>
            <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '1rem' }}>
              Redirecting to your profile in 15 seconds...
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default ThankYou;
