import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import '../styles.css';

function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [downloadsLeft, setDownloadsLeft] = useState(0); // Placeholder; adjust based on your logic
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone_number, has_donated')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setProfile(data);

        // Placeholder: Fetch downloads left (implement your logic here)
        // For now, assume non-donors have 5 downloads, donors have unlimited
        setDownloadsLeft(data.has_donated ? 'Unlimited' : 5);
      } catch (err) {
        console.error('Error fetching profile:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2 className="profile-title">Your Profile</h2>
        <div className="profile-info">
          <p><strong>Full Name:</strong> {profile?.full_name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          {profile?.phone_number && <p><strong>Phone Number:</strong> {profile.phone_number}</p>}
          <p><strong>Downloads Left This Month:</strong> {downloadsLeft}</p>
        </div>

        {profile?.has_donated ? (
          <div className="donation-thanks">
            <h3>Thank You for Your Support!</h3>
            <p>We deeply appreciate your donation. As a valued supporter, you enjoy:</p>
            <ul className="benefits-list">
              <li>Unlimited downloads of songs and audio (MP3s) for 1 year from your donation date.</li>
              <li>Notifications of newly added songs and blog posts.</li>
              <li>Exclusive promos and updates on choir events and concerts.</li>
              <li>Future benefits as we grow—stay tuned!</li>
            </ul>
          </div>
        ) : (
          <div className="donation-prompt">
            <h3>Support Choir Center Today!</h3>
            <p>
              Hey {profile?.full_name}, want to unlock amazing benefits? A small one-time donation of just a Meat Pie ☕ (or more if you’re feeling generous) helps us keep Choir Center thriving. For a full year, you’ll get:
            </p>
            <ul className="benefits-list">
              <li><strong>Unlimited Downloads:</strong> Access all songs and audio (MP3s) without limits.</li>
              <li><strong>Stay in the Loop:</strong> Get notified about new songs, posts, and promos.</li>
              <li><strong>Community Love:</strong> Be the first to hear about choir events and concerts.</li>
              <li><strong>Future Perks:</strong> Enjoy upcoming features as we expand!</li>
            </ul>
            <p>This lasts for <strong>1 year</strong> from your donation—plenty of time to enjoy the music!</p>
            <Link to="/donate" className="donate-button">Donate Now</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
