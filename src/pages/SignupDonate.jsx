import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles.css';

function SignupDonate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null); // To store user ID after signup
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // To check redirect params

  // Check if redirected from Paystack with success
  const paymentSuccess = searchParams.get('trxref') && searchParams.get('reference');

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setUserId(data.user.id); // Store user ID for donation tracking
      setSuccess('Signup successful! Please check your email to confirm, then consider supporting us with a donation.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = () => {
    // Redirect to Paystack donation page
    window.location.href = 'https://paystack.com/pay/choircenterdonation';
  };

  // Handle successful payment redirect
  if (paymentSuccess && userId) {
    const updateProfile = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, has_donated: true, updated_at: new Date().toISOString() });
        if (error) throw error;
        setSuccess('Thank you for your donation! You now have unlimited downloads.');
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
                <p className="auth-subtitle">Want unlimited downloads? Support us with a Meat Pie ☕!</p>
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
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Signing Up...' : 'Sign Up'}
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
