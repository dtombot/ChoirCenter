import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    choir_name: '',
    church_name: '',
    country: '',
    state: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            choir_name: formData.choir_name,
            church_name: formData.church_name,
            country: formData.country,
            state: formData.state,
            is_admin: false,
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        alert('Signup successful! Please check your email to confirm if required.');
        navigate('/login');
      }
    } catch (err) {
      setError(err.message);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '2rem auto' }}>
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          required
          style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <input
          type="text"
          name="choir_name"
          placeholder="Name of Choir"
          value={formData.choir_name}
          onChange={handleChange}
          style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <input
          type="text"
          name="church_name"
          placeholder="Name of Church"
          value={formData.church_name}
          onChange={handleChange}
          style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <input
          type="text"
          name="country"
          placeholder="Country"
          value={formData.country}
          onChange={handleChange}
          style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <input
          type="text"
          name="state"
          placeholder="State"
          value={formData.state}
          onChange={handleChange}
          style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.5rem', background: '#3cb371', color: '#fff', border: 'none' }}
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
      </form>
    </div>
  );
}

export default Signup;
