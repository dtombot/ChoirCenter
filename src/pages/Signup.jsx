import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRecaptcha = () => {
      return new Promise((resolve, reject) => {
        if (window.grecaptcha) {
          setRecaptchaLoaded(true);
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setRecaptchaLoaded(true);
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
        document.body.appendChild(script);
      });
    };

    loadRecaptcha().catch(err => console.error(err));

    return () => {
      const script = document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]');
      if (script) document.body.removeChild(script);
    };
  }, []);

  const handleRecaptcha = (token) => {
    setRecaptchaToken(token);
  };

  const verifyRecaptcha = async (token) => {
    try {
      const response = await fetch('/.netlify/functions/verify-recaptcha', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      return result.success;
    } catch (err) {
      console.error('reCAPTCHA verification error:', err);
      return false;
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const honeypot = e.target.elements.honeypot.value;
    if (honeypot) {
      setError('Spam detected');
      setLoading(false);
      return;
    }

    if (!recaptchaLoaded) {
      setError('reCAPTCHA is not loaded yet. Please wait.');
      setLoading(false);
      return;
    }

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
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

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (window.grecaptcha) window.grecaptcha.reset();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Sign Up</h2>
        <p className="auth-subtitle">Join Choir Center today!</p>
        {success ? (
          <p className="success-message">Signup successful! Check your email for confirmation. Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <input type="text" name="honeypot" className="honeypot" />
            {recaptchaLoaded && (
              <div
                className="g-recaptcha"
                data-sitekey="6Le-B-YqAAAAAPDlPSrl2BLhd4TdUoPuwee2TO8s"
                data-callback="handleRecaptcha"
              ></div>
            )}
            <button type="submit" className="auth-button" disabled={loading || !recaptchaLoaded}>
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </form>
        )}
        {error && <p className="error-message">{error}</p>}
        <p className="auth-link">
          Already have an account? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
}

window.handleRecaptcha = (token) => {
  const signupComponent = document.querySelector('form');
  if (signupComponent) {
    signupComponent.dispatchEvent(new CustomEvent('recaptchaVerified', { detail: token }));
  }
};

export default Signup;
