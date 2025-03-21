import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import '../styles.css';

function SignupDonate({ recaptchaLoaded }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // New field
  const [choirName, setChoirName] = useState(''); // New field
  const [churchName, setChurchName] = useState(''); // New field
  const [country, setCountry] = useState(''); // New field
  const [state, setState] = useState(''); // New field
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recaptchaRef = useRef(null);

  const paymentSuccess = searchParams.get('trxref') && searchParams.get('reference');

  useEffect(() => {
    const renderRecaptcha = () => {
      if (recaptchaLoaded && window.grecaptcha && window.grecaptcha.render && recaptchaRef.current) {
        try {
          console.log('Attempting to render reCAPTCHA on SignupDonate');
          window.grecaptcha.render(recaptchaRef.current, {
            sitekey: '6LczEuYqAAAAANYh6VG8jSj1Fmt6LKMK7Ee1OcfU',
            callback: (token) => console.log('reCAPTCHA token received:', token),
          });
          console.log('reCAPTCHA rendered successfully on SignupDonate');
        } catch (err) {
          console.error('Error rendering reCAPTCHA on SignupDonate:', err);
          setError('Failed to load reCAPTCHA. Please refresh the page or try again later.');
        }
      } else if (!recaptchaLoaded) {
        console.log('reCAPTCHA not loaded yet on SignupDonate');
      } else {
        console.log('reCAPTCHA script present but not fully initialized:', {
          grecaptchaExists: !!window.grecaptcha,
          renderExists: window.grecaptcha && !!window.grecaptcha.render,
          refExists: !!recaptchaRef.current,
        });
      }
    };

    renderRecaptcha();
  }, [recaptchaLoaded]);

  const verifyRecaptcha = async (token) => {
    try {
      const response = await fetch('/.netlify/functions/verify-recaptcha', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      console.log('reCAPTCHA verification result:', result);
      return result.success;
    } catch (err) {
      console.error('reCAPTCHA verification error:', err);
      return false;
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!recaptchaLoaded || !window.grecaptcha) {
      setError('reCAPTCHA is not loaded yet. Please wait or refresh the page.');
      setLoading(false);
      return;
    }

    const token = window.grecaptcha.getResponse();
    console.log('Token retrieved on submit:', token);

    if (!token || token === '') {
      console.log('No token received, reCAPTCHA not completed');
      setError('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(token);
    if (!isRecaptchaValid) {
      console.log('reCAPTCHA verification failed');
      setError('reCAPTCHA verification failed. Please try again.');
      setLoading(false);
      if (window.grecaptcha) window.grecaptcha.reset();
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setUserId(data.user.id);
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName, // New field
          choir_name: choirName || null, // Optional
          church_name: churchName || null, // Optional
          country: country || null, // Optional
          state: state || null, // Optional
          is_admin: false,
        });
      if (profileError) throw profileError;

      setSuccess('Signup successful! Redirecting to donation page...');
      setEmail('');
      setPassword('');
      setFullName(''); // Reset new field
      setChoirName(''); // Reset new field
      setChurchName(''); // Reset new field
      setCountry(''); // Reset new field
      setState(''); // Reset new field

      setTimeout(() => {
        window.location.href = 'https://paystack.com/pay/choircenterdonation';
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (window.grecaptcha) window.grecaptcha.reset();
    }
  };

  const handleDonate = () => {
    window.location.href = 'https://paystack.com/pay/choircenterdonation';
  };

  if (paymentSuccess && userId) {
    const updateProfile = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          setError('Session missing after payment. Please log in again.');
          navigate('/login');
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, has_donated: true, updated_at: new Date().toISOString() });
        if (error) throw error;
        setSuccess('Thank you for your donation! You now have unlimited downloads this month.');
      } catch (err) {
        setError('Donation recorded, but failed to update profile: ' + err.message);
      }
    };
    updateProfile();
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Sign Up & Support Us</h2>
        <p className="auth-subtitle">Create an account and help sustain Choir Center with a small donation!</p>
        {error && <p className="error-message">{error}</p>}
        {success && (
          <div>
            <p className="success-message">{success}</p>
            {!paymentSuccess && (
              <>
                <p className="auth-subtitle">Want unlimited downloads this month? Support us with a Meat Pie ☕!</p>
                <button onClick={handleDonate} className="meatpie-button" disabled={loading}>
                  Donate Now
                </button>
              </>
            )}
          </div>
        )}
        {!success && (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="auth-input"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="choirName">Choir Name (Optional)</label>
              <input
                type="text"
                id="choirName"
                value={choirName}
                onChange={(e) => setChoirName(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="churchName">Church Name (Optional)</label>
              <input
                type="text"
                id="churchName"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="country">Country (Optional)</label>
              <input
                type="text"
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="state">State/Region (Optional)</label>
              <input
                type="text"
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            <div ref={recaptchaRef} className="g-recaptcha"></div>
            {!recaptchaLoaded && <p>Loading reCAPTCHA...</p>}
            <button type="submit" className="auth-button" disabled={loading || !recaptchaLoaded}>
              {loading ? 'Processing...' : 'Sign Up and Buy us a Meat Pie'}
            </button>
          </form>
        )}
        <p className="auth-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default SignupDonate;
