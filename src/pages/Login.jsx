import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (!error) navigate('/');
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div style={{ maxWidth: '300px', margin: '2rem auto', textAlign: 'center' }}>
      <h2>Choir Center</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <button type="submit" style={{ width: '100%', padding: '0.5rem' }}>Login</button>
      </form>
    </div>
  );
}

export default Login;
