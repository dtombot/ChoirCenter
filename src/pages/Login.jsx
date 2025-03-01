import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null); // For debugging
  const [loading, setLoading] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaTokenRef = useRef(null); // Synchronous token storage
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

    window.handleRecaptcha = (token) => {
      console.log('reCAPTCHA token received:', token);
      recaptchaTokenRef.current = token; // Synchronous update
      setRecaptchaToken(token); // Async state update for logging
    };

    return () => {
      const script = document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]');
      if (script) document.body.removeChild(script);
      delete window.handleRecaptcha;
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!recaptchaLoaded) {
      setError('reCAPTCHA is not loaded yet. Please wait.');
      setLoading(false);
      return;
    }

    // Add a slight delay to ensure token is set
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!recaptchaTokenRef.current) {
      setError('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaTokenRef.current);
    if (!isRecaptchaValid) {
      setError('reCAPTCHA verification failed. Please try again.');
      setLoading(false);
      if (window.grecaptcha) window.grecaptcha.reset();
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (data.session) {
        navigate('/');
      }
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
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Log in to access your choir resources</p>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="auth-input"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="auth-input"
              required
              disabled={loading}
            />
          </div>
          {recaptchaLoaded && (
            <div
              className="g-recaptcha"
              data-sitekey="6LczEuYqAAAAANYh6VG8jSj1Fmt6LKMK7Ee1OcfU"
              data-callback="handleRecaptcha"
            ></div>
          )}
          <button type="submit" className="auth-button" disabled={loading || !recaptchaLoaded}>
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
        <p className="auth-link">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
