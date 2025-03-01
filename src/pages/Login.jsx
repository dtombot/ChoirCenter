import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (window.grecaptcha) {
        window.grecaptcha.reset();
      }
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      setError('reCAPTCHA verification failed. Please try again.');
      setLoading(false);
      window.grecaptcha.reset();
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Ensure session is set
      if (data.session) {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      window.grecaptcha.reset();
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
          <div
            className="g-recaptcha"
            data-sitekey="6Le-B-YqAAAAAPDlPSrl2BLhd4TdUoPuwee2TO8s"
            data-callback="handleRecaptcha"
          ></div>
          <button type="submit" className="auth-button" disabled={loading}>
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

window.handleRecaptcha = (token) => {
  const loginComponent = document.querySelector('form');
  if (loginComponent) {
    loginComponent.dispatchEvent(new CustomEvent('recaptchaVerified', { detail: token }));
  }
};

export default Login;
