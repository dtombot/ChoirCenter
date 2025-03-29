import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';

function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, is_admin, has_donated')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container profile-container">
      <h1 className="hero-title" style={{ color: '#2f4f2f' }}>
        Welcome, {profile?.full_name || user.email.split('@')[0]}!
      </h1>
      <div className="profile-details">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {profile?.is_admin ? 'Admin' : 'User'}</p>
        <p>
          <strong>Download Limit:</strong>{' '}
          {profile?.has_donated
            ? 'Unlimited downloads (Thank you for your donation!)'
            : '6 downloads per month (Donate to unlock unlimited access)'}
        </p>
        {!profile?.has_donated && (
          <p>
            You’re allowed 6 downloads per month as a logged-in user. Guests get 3 downloads per month.{' '}
            <Link to="/donate" className="action-button">
              Donate Now
            </Link>{' '}
            to enjoy unlimited downloads!
          </p>
        )}
      </div>
      <button onClick={handleLogout} className="action-button logout-button">
        Logout
      </button>
    </div>
  );
}

export default Profile;
