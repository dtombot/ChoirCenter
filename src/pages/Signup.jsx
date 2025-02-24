import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
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
    if (!error) navigate('/login');
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="container">
      <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '2rem auto' }}>
        <input type="text" name="full_name" placeholder="Full Name" onChange={handleChange} required style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <input type="text" name="choir_name" placeholder="Name of Choir" onChange={handleChange} style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <input type="text" name="church_name" placeholder="Name of Church" onChange={handleChange} style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <input type="text" name="country" placeholder="Country" onChange={handleChange} style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <input type="text" name="state" placeholder="State" onChange={handleChange} style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.5rem' }} />
        <button type="submit" style={{ width: '100%', padding: '0.5rem' }}>Sign Up</button>
      </form>
    </div>
  );
}

export default Signup;
