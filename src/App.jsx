import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { supabase } from './supabase';
import Home from './pages/Home';
import Library from './pages/Library';
import Admin from './pages/Admin';
import Signup from './pages/Signup';
import Login from './pages/Login';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost'; // Add this import

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }
      const currentUser = authData.user;
      setUser(currentUser);

      if (currentUser) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', currentUser.id)
            .limit(1)
            .maybeSingle();
          console.log('Profile fetch attempt for ID:', currentUser.id);
          if (profileError) {
            console.error('Profile fetch error:', profileError.message, profileError.details);
            setIsAdmin(false);
          } else {
            console.log('Profile data:', profileData);
            setIsAdmin(profileData?.is_admin || false);
          }
        } catch (err) {
          console.error('Unexpected profile fetch error:', err);
          setIsAdmin(false);
        }
      }
    };
    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .limit(1)
          .maybeSingle()
          .then(({ data, error }) => {
            console.log('Auth change profile fetch attempt for ID:', currentUser.id);
            if (error) {
              console.error('Profile fetch error on auth change:', error.message, error.details);
              setIsAdmin(false);
            } else {
              console.log('Profile data on auth change:', data);
              setIsAdmin(data?.is_admin || false);
            }
          });
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  useEffect(() => {
  const fetchUserAndProfile = async () => {
    // ... existing code ...
  };
  fetchUserAndProfile();

  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    // ... existing code ...
  });

  // Add Inter font
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  return () => {
    authListener.subscription.unsubscribe();
  };
}, []);

  return (
    <Router>
      <header style={{ position: 'sticky', top: 0, background: '#2f4f2f', padding: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
          <h1>Choir Center</h1>
        </Link>
        <nav>
          {!user ? (
            <>
              <Link to="/signup" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#98fb98' }}>Sign Up</Link>
              <Link to="/login" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#98fb98' }}>Login</Link>
            </>
          ) : (
            <>
              {isAdmin && (
                <Link to="/admin" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#98fb98' }}>Admin Dashboard</Link>
              )}
              <button
                onClick={handleLogout}
                style={{ marginLeft: '1rem', background: 'none', border: 'none', color: '#98fb98', cursor: 'pointer', fontSize: '1rem' }}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </header>
      <div className="background-notes">
        <div className="note" style={{ left: '10%', animationDelay: '0s' }}></div>
        <div className="note" style={{ left: '30%', animationDelay: '2s' }}></div>
        <div className="note" style={{ left: '50%', animationDelay: '4s' }}></div>
        <div className="note" style={{ left: '70%', animationDelay: '6s' }}></div>
        <div className="note" style={{ left: '90%', animationDelay: '8s' }}></div>
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} /> {/* Add this route */}
      </Routes>
      <footer style={{ background: '#2f4f2f', color: '#fff', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
        <div>
          <p>About Us: Choir Center is a platform for choristers to access music resources.</p>
        </div>
        <div>
          <Link to="/about" style={{ color: '#98fb98', display: 'block', margin: '0.5rem 0' }}>About Us</Link>
          <Link to="/contact" style={{ color: '#98fb98', display: 'block', margin: '0.5rem 0' }}>Contact Us</Link>
          <Link to="/library" style={{ color: '#98fb98', display: 'block', margin: '0.5rem 0' }}>Explore Library</Link>
          <Link to="/blog" style={{ color: '#98fb98', display: 'block', margin: '0.5rem 0' }}>Blog Posts</Link>
        </div>
        <div>
          <Link to="/privacy" style={{ color: '#98fb98', display: 'block', margin: '0.5rem 0' }}>Privacy</Link>
          <Link to="/terms" style={{ color: '#98fb98', display: 'block', margin: '0.5rem 0' }}>Terms of Service</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <svg style={{ width: '24px', fill: '#98fb98' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer">
            <svg style={{ width: '24px', fill: '#98fb98' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer">
            <svg style={{ width: '24px', fill: '#98fb98' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l4.93-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm3.97 15.03c-.25.7-.76 1.27-1.45 1.6-.7.34-1.6.5-2.52.25-1.8-.5-3.3-2-3.8-3.8-.25-.9-.08-1.8.25-2.52.33-.7.9-1.2 1.6-1.45.15-.05.3-.08.45-.08s.3.03.45.08c.35.15.6.45.7.8.1.35.15.7.15 1.05 0 .35-.05.7-.15 1.05-.5 1.5.5 2.5 1.5 3s2-.5 1.5-1.5c-.15-.35-.2-.7-.15-1.05s.2-.7.55-.85c.15-.05.3-.08.45-.08s.3.03.45.08z"/></svg>
          </a>
        </div>
      </footer>
    </Router>
  );
}

export default App;
