import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRecaptcha = () => {
      return new Promise((resolve, reject) => {
        if (window.grecaptcha) {
          initializeRecaptcha();
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initializeRecaptcha();
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
        document.body.appendChild(script);
      });
    };

    const initializeRecaptcha = () => {
      if (window.grecaptcha && recaptchaRef.current && !recaptchaWidgetIdRef.current) {
        const widgetId = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: '6LczEuYqAAAAANYh6VG8jSj1Fmt6LKMK7Ee1OcfU',
          callback: (token) => {
            console.log('reCAPTCHA token received:', token);
          },
        });
        recaptchaWidgetIdRef.current = widgetId;
        setRecaptchaLoaded(true);
      }
    };

    loadRecaptcha().catch(err => console.error(err));

    return () => {
      const script = document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]');
      if (script) document.body.removeChild(script);
      if (window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
        window.grecaptcha.reset(recaptchaWidgetIdRef.current);
      }
      recaptchaWidgetIdRef.current = null;
    };
  }, []);

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

    let token;
    if (window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
      token = window.grecaptcha.getResponse(recaptchaWidgetIdRef.current);
      console.log('Token retrieved on submit:', token);
    }

    if (!token) {
      setError('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(token);
    if (!isRecaptchaValid) {
      setError('reCAPTCHA verification failed. Please try again.');
      setLoading(false);
      if (window.grecaptcha) window.grecaptcha.reset(recaptchaWidgetIdRef.current);
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
      if (window.grecaptcha) window.grecaptcha.reset(recaptchaWidgetIdRef.current);
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
            <div ref={recaptchaRef} className="g-recaptcha"></div>
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

export default Signup;
