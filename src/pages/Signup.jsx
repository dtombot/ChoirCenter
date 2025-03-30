import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Signup({ recaptchaLoaded }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const renderRecaptcha = () => {
      console.log('reCAPTCHA render check (Signup):', {
        recaptchaLoaded,
        grecaptchaExists: !!window.grecaptcha,
        renderExists: window.grecaptcha && !!window.grecaptcha.render,
        refExists: !!recaptchaRef.current,
      });

      if (!recaptchaLoaded || !window.grecaptcha || !recaptchaRef.current) {
        console.log('reCAPTCHA not ready yet on Signup');
        return;
      }

      const attemptRender = () => {
        if (window.grecaptcha && window.grecaptcha.render) {
          try {
            window.grecaptcha.render(recaptchaRef.current, {
              sitekey: '6LczEuYqAAAAANYh6VG8jSj1Fmt6LKMK7Ee1OcfU',
              callback: (token) => console.log('reCAPTCHA token received (Signup):', token),
            });
            console.log('reCAPTCHA rendered successfully on Signup');
          } catch (err) {
            console.error('Error rendering reCAPTCHA on Signup:', err);
            setError('Failed to load reCAPTCHA. Please refresh the page or try again later.');
          }
        } else {
          console.log('reCAPTCHA render not available yet on Signup, retrying...');
          setTimeout(attemptRender, 100);
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
      console.log('reCAPTCHA verification result (Signup):', result);
      return result.success;
    } catch (err) {
      console.error('reCAPTCHA verification error (Signup):', err);
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

    if (!recaptchaLoaded || !window.grecaptcha) {
      setError('reCAPTCHA is not loaded yet. Please wait or refresh the page.');
      setLoading(false);
      return;
    }

    const token = window.grecaptcha.getResponse();
    console.log('Token retrieved on submit (Signup):', token);

    if (!token || token === '') {
      console.log('No token received, reCAPTCHA not completed (Signup)');
      setError('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(token);
    if (!isRecaptchaValid) {
      console.log('reCAPTCHA verification failed (Signup)');
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

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            phone_number: phoneNumber || null,
            is_admin: false,
          });
        if (profileError) throw profileError;

        // Check if the user is auto-logged in
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          setSuccess(true);
          setTimeout(() => navigate('/login'), 2000); // Redirect to login if no session
        } else {
          setSuccess(true);
          setTimeout(() => navigate('/profile'), 2000); // Redirect to profile if logged in
        }
      }
    } catch (err) {
      console.error('Signup error:', err.message);
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
          <p className="success-message">
            Signup successful! Check your email for confirmation. Redirecting...
          </p>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="auth-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
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
            <div className="form-group">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                className="auth-input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>
            <input type="text" name="honeypot" className="honeypot" />
            <div ref={recaptchaRef} className="g-recaptcha"></div>
            {!recaptchaLoaded && <p>Loading reCAPTCHA...</p>}
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
