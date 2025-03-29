import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import '../styles.css'; // Ensure this includes the styles from the previous response

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

  const handleLibraryNavigation = () => {
    navigate('/library');
  };

  if (loading) {
    return (
      <div className="loading-container-modern">
        <div className="spinner-modern"></div>
      </div>
    );
  }

  return (
    <div className="profile-page-modern">
      <div className="profile-card-modern animate-fade-in">
        <h1 className="profile-title-modern">
          Welcome, {profile?.full_name || user.email.split('@')[0]}!
        </h1>
        <div className="profile-details-modern">
          <div className="profile-item-modern animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <span className="profile-label-modern">Email:</span>
            <span className="profile-value-modern">{user.email}</span>
          </div>
          <div className="profile-item-modern animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <span className="profile-label-modern">Role:</span>
            <span className="profile-value-modern">{profile?.is_admin ? 'Admin' : 'User'}</span>
          </div>
          <div className="profile-item-modern animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <span className="profile-label-modern">Download Limit:</span>
            <span className="profile-value-modern">
              {profile?.has_donated
                ? 'Unlimited downloads this month (Thank you for your donation!)'
                : '6 downloads per month'}
            </span>
          </div>
          {!profile?.has_donated && (
            <p className="profile-note-modern animate-slide-up" style={{ animationDelay: '0.4s' }}>
              Guests get 3 downloads per month, logged-in users get 6, and donors enjoy unlimited downloads each month. Limits reset on the 1st.{' '}
              <Link to="/donate" className="donate-button-modern">
                Buy us a Meat Pie
              </Link>{' '}
              for unlimited access!
            </p>
          )}
          {profile?.has_donated && (
            <p className="profile-note-modern animate-slide-up" style={{ animationDelay: '0.4s' }}>
              Enjoy unlimited downloads until the end of the month—resets on the 1st. Thank you for supporting Choir Center!
            </p>
          )}
        </div>
        <div className="profile-buttons-modern">
          <button onClick={handleLibraryNavigation} className="library-button-modern animate-scale">
            Go to Library
          </button>
          <button onClick={handleLogout} className="logout-button-modern animate-scale">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
