import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Login({ recaptchaLoaded }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const renderRecaptcha = () => {
      console.log('reCAPTCHA render check (Login):', {
        recaptchaLoaded,
        grecaptchaExists: !!window.grecaptcha,
        renderExists: window.grecaptcha && !!window.grecaptcha.render,
        refExists: !!recaptchaRef.current,
      });

      if (!recaptchaLoaded || !window.grecaptcha || !recaptchaRef.current) {
        console.log('reCAPTCHA not ready yet on Login');
        return;
      }

      const attemptRender = () => {
        if (window.grecaptcha && window.grecaptcha.render) {
          try {
            window.grecaptcha.render(recaptchaRef.current, {
              sitekey: '6LczEuYqAAAAANYh6VG8jSj1Fmt6LKMK7Ee1OcfU',
              callback: (token) => console.log('reCAPTCHA token received (Login):', token),
            });
            console.log('reCAPTCHA rendered successfully on Login');
          } catch (err) {
            console.error('Error rendering reCAPTCHA on Login:', err);
            setError('Failed to load reCAPTCHA. Please refresh the page or try again later.');
          }
        } else {
          console.log('reCAPTCHA render not available yet on Login, retrying...');
          setTimeout(attemptRender, 100); // Retry every 100ms
        }
      };

      attemptRender();
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
      console.log('reCAPTCHA verification result (Login):', result);
      return result.success;
    } catch (err) {
      console.error('reCAPTCHA verification error (Login):', err);
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!recaptchaLoaded || !window.grecaptcha) {
      setError('reCAPTCHA is not loaded yet. Please wait or refresh the page.');
      setLoading(false);
      return;
    }

    const token = window.grecaptcha.getResponse();
    console.log('Token retrieved on submit (Login):', token);

    if (!token) {
      setError('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(token);
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
          <div ref={recaptchaRef} className="g-recaptcha"></div>
          {!recaptchaLoaded && <p>Loading reCAPTCHA...</p>}
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
