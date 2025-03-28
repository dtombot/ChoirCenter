import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { supabase } from './supabase';
import './styles.css';
import Home from './pages/Home';
import Library from './pages/Library';
import Admin from './pages/Admin';
import Signup from './pages/Signup';
import SignupDonate from './pages/SignupDonate';
import Login from './pages/Login';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Song from './pages/Song';
import Search from './pages/Search';
import Donate from './pages/Donate';
import ThankYou from './pages/ThankYou';

// Google Analytics initialization function
function initGoogleAnalytics() {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-0VEW528YY9');
}

// Component to handle analytics, scroll, and visitor tracking
function RouteEnhancer({ user, setLastTracked, lastTracked }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Analytics tracking
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_title: document.title,
      });
    }

    // Save scroll position and currentPage before leaving the page
    const saveScrollAndPage = () => {
      const scrollPosition = window.scrollY;
      const state = history.state || {};
      const currentPage = state.currentPage || 1;
      sessionStorage.setItem(`scrollPosition-${location.pathname}`, scrollPosition.toString());
      sessionStorage.setItem(`currentPage-${location.pathname}`, currentPage.toString());
    };

    // Restore scroll position and currentPage on navigation
    const restoreScrollAndPage = () => {
      const savedPosition = sessionStorage.getItem(`scrollPosition-${location.pathname}`);
      const savedPage = sessionStorage.getItem(`currentPage-${location.pathname}`);
      if (savedPosition !== null && savedPage !== null) {
        const page = parseInt(savedPage, 10);
        const position = parseInt(savedPosition, 10);
        navigate(location.pathname, { state: { currentPage: page }, replace: true });
        requestAnimationFrame(() => {
          window.scrollTo({
            top: position,
            behavior: 'auto'
          });
        });
      } else {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('beforeunload', saveScrollAndPage);
    window.addEventListener('popstate', restoreScrollAndPage);

    restoreScrollAndPage();

    const trackVisit = async () => {
      const pageUrl = location.pathname;
      const trackingKey = `${pageUrl}-${user?.id || 'anonymous'}`;
      const now = Date.now();
      const lastTrackedTime = lastTracked[trackingKey] || 0;

      if (now - lastTrackedTime < 60 * 60 * 1000) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const trackingData = { pageUrl };

      try {
        const response = await fetch('/.netlify/functions/track-visitor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify(trackingData),
        });
        if (!response.ok) {
          console.error('Track visit failed:', await response.text());
        } else {
          setLastTracked((prev) => ({ ...prev, [trackingKey]: now }));
        }
      } catch (error) {
        console.error('Track visit error:', error.message);
      }
    };

    trackVisit();

    return () => {
      window.removeEventListener('beforeunload', saveScrollAndPage);
      window.removeEventListener('popstate', restoreScrollAndPage);
      saveScrollAndPage();
    };
  }, [location.pathname, user, navigate]);

  return null;
}

// 404 Component
function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 className="hero-title" style={{ color: '#2f4f2f' }}>404 - Page Not Found</h1>
      <p className="hero-text">
        Oops! It looks like this page doesn’t exist. Let’s get you back on track.
      </p>
      <Link to="/" className="action-button">
        Return to Home
      </Link>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [lastTracked, setLastTracked] = useState({});

  useEffect(() => {
    const loadRecaptchaScript = () => {
      if (!document.querySelector('script[src="https://www.google.com/recaptcha/api.js?render=explicit"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.id = 'recaptcha-script';
        script.onload = () => {
          console.log('reCAPTCHA script loaded');
          setTimeout(() => setRecaptchaLoaded(true), 100);
        };
        script.onerror = () => {
          console.error('Failed to load reCAPTCHA script');
          setRecaptchaLoaded(false);
        };
        document.head.appendChild(script);
      } else {
        if (window.grecaptcha && window.grecaptcha.render) {
          setRecaptchaLoaded(true);
        }
      }
    };

    const loadGoogleAnalyticsScript = () => {
      if (!document.querySelector('script[src="https://www.googletagmanager.com/gtag/js?id=G-0VEW528YY9"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-0VEW528YY9';
        script.async = true;
        script.onload = () => initGoogleAnalytics();
        document.head.appendChild(script);
      }
    };

    loadRecaptchaScript();
    loadGoogleAnalyticsScript();

    const fetchUserAndProfile = async () => {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setUser(null);
        setIsAdmin(false);
        setUserName('');
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setUser(null);
        setIsAdmin(false);
        setUserName('');
        setLoading(false);
        return;
      }
      const currentUser = authData.user;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin, full_name')
          .eq('id', currentUser.id)
          .limit(1)
          .maybeSingle();
        if (profileError) {
          setIsAdmin(false);
          setUserName('');
        } else {
          setIsAdmin(profileData?.is_admin || false);
          setUserName(profileData?.full_name || currentUser.email.split('@')[0]);
        }
      }
      setLoading(false);
    };
    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (event === 'SIGNED_IN' && currentUser && session?.user?.email_confirmed_at) {
        supabase
          .from('profiles')
          .select('is_admin, full_name')
          .eq('id', currentUser.id)
          .limit(1)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              setIsAdmin(false);
              setUserName('');
            } else {
              setIsAdmin(data?.is_admin || false);
              setUserName(data?.full_name || currentUser.email.split('@')[0]);
            }
          });
      } else {
        setIsAdmin(false);
        setUserName('');
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
    setUserName('');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#e6f0e6',
        color: '#2f4f2f',
        fontSize: '1.5rem',
        fontFamily: "'Inter', Arial, sans-serif"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Router>
        <header className="header">
          <Link to="/" className="header-link">
            <div className="header-logo-title">
              <img src="/logo.png" alt="Choir Center Logo" className="header-logo" />
              <h1 className="header-title">Choir Center</h1>
            </div>
          </Link>
          <nav className="header-nav">
            {!user ? (
              <>
                <Link to="/signup" className="nav-link">Sign Up</Link>
                <Link to="/login" className="nav-link">Login</Link>
              </>
            ) : (
              <>
                {isAdmin && (
                  <Link to="/admin" className="nav-link">Admin Dashboard</Link>
                )}
                <span className="nav-user-name">Hi, {userName}</span>
                <button onClick={handleLogout} className="nav-button">Logout</button>
              </>
            )}
          </nav>
        </header>
        <div className="background-notes">
          <svg className="note" style={{ left: '10%', animationDelay: '0s' }} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#98fb98"><path d="M9 21h3v-9H9v9zm3-18v9h3V3h-3zm-1 16h2v2h-2v-2z"/></svg>
          <svg className="note" style={{ left: '30%', animationDelay: '2s' }} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#98fb98"><path d="M9 21h3v-9H9v9zm3-18v9h3V3h-3zm-1 16h2v2h-2v-2z"/></svg>
          <svg className="note" style={{ left: '50%', animationDelay: '4s' }} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#98fb98"><path d="M9 21h3v-9H9v9zm3-18v9h3V3h-3zm-1 16h2v2h-2v-2z"/></svg>
          <svg className="note" style={{ left: '70%', animationDelay: '6s' }} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#98fb98"><path d="M9 21h3v-9H9v9zm3-18v9h3V3h-3zm-1 16h2v2h-2v-2z"/></svg>
          <svg className="note" style={{ left: '90%', animationDelay: '8s' }} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#98fb98"><path d="M9 21h3v-9H9v9zm3-18v9h3V3h-3zm-1 16h2v2h-2v-2z"/></svg>
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/signup"
            element={user ? <Navigate to="/" /> : <Signup recaptchaLoaded={recaptchaLoaded} />}
          />
          <Route path="/signup-donate" element={<SignupDonate recaptchaLoaded={recaptchaLoaded} />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login recaptchaLoaded={recaptchaLoaded} />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact recaptchaLoaded={recaptchaLoaded} />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:permalink" element={<BlogPost />} />
          <Route path="/song/:id" element={<Song />} />
          <Route path="/search" element={<Search />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <RouteEnhancer user={user} setLastTracked={setLastTracked} lastTracked={lastTracked} />
        <footer className="footer">
          <div className="footer-text">
            <p>About Us: Choir Center is a platform for choristers to access music resources.</p>
          </div>
          <div className="footer-links">
            <Link to="/about" className="footer-link">About Us</Link>
            <Link to="/contact" className="footer-link">Contact Us</Link>
            <Link to="/library" className="footer-link">Explore Library</Link>
            <Link to="/blog" className="footer-link">Blog Posts</Link>
          </div>
          <div className="footer-links">
            <Link to="/privacy" className="footer-link">Privacy</Link>
            <Link to="/terms" className="footer-link">Terms of Service</Link>
          </div>
          <div className="footer-social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l4.93-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm3.97 15.03c-.25.7-.76 1.27-1.45 1.6-.7.34-1.6.5-2.52.25-1.8-.5-3.3-2-3.8-3.8-.25-.9-.08-1.8.25-2.52.33-.7.9-1.2 1.6-1.45.15-.05.3-.08.45-.08s.3.03.45.08c.35.15.6.45.7.8.1.35.15.7.15 1.05 0 .35-.05.7-.15 1.05-.5 1.5.5 2.5 1.5 3s2-.5 1.5-1.5c-.15-.35-.2-.7-.15-1.05s.2-.7.55-.85c.15-.05.3-.08.45-.08s.3.03.45.08z"/></svg>
            </a>
          </div>
        </footer>
      </Router>
    </HelmetProvider>
  );
}

export default App;
