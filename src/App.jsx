import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation } from 'react-router-dom';
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

// Google Analytics initialization function
function initGoogleAnalytics() {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-0VEW528YY9');
}

// Component to track page views with correct page paths
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_title: document.title,
      });
    }
  }, [location.pathname]);

  return null;
}

// Component to scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function CookieConsent({ onAccept }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    onAccept();
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-consent-bar">
      <div className="cookie-content">
        <span className="cookie-text">
          We use cookies to enhance your experience. See our <Link to="/privacy" className="cookie-link">Privacy Policy</Link>.
        </span>
        <div className="cookie-actions">
          <button className="cookie-accept" onClick={handleAccept}>Accept</button>
          <Link to="/privacy" className="cookie-learn-more">Learn More</Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cookiesAccepted, setCookiesAccepted] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [visitStartTime, setVisitStartTime] = useState(null);
  const [clickEvents, setClickEvents] = useState([]);

  useEffect(() => {
    const loadRecaptchaScript = () => {
      if (!document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => setRecaptchaLoaded(true);
        document.head.appendChild(script);
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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setUser(null);
        setIsAdmin(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setUser(null);
        setIsAdmin(false);
        return;
      }
      const currentUser = authData.user;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .limit(1)
          .maybeSingle();
        if (profileError) {
          setIsAdmin(false);
        } else {
          setIsAdmin(profileData?.is_admin || false);
        }
      }
    };
    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (event === 'SIGNED_IN' && currentUser && session?.user?.email_confirmed_at) {
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .limit(1)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              setIsAdmin(false);
            } else {
              setIsAdmin(data?.is_admin || false);
            }
          });
      } else {
        setIsAdmin(false);
      }
    });

    const consent = localStorage.getItem('cookieConsent');
    if (consent === 'accepted') {
      setCookiesAccepted(true);
    }

    setVisitStartTime(Date.now());
    const handleClick = (e) => {
      if (cookiesAccepted) {
        setClickEvents((prev) => [
          ...prev,
          { element: e.target.tagName, timestamp: Date.now() },
        ]);
      }
    };
    document.addEventListener('click', handleClick);

    const trackVisit = async () => {
      if (!cookiesAccepted || !visitStartTime) return;
      const duration = Math.round((Date.now() - visitStartTime) / 1000);

      // Fetch the current session to get the access token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      await fetch('/.netlify/functions/track-visitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }), // Add Authorization header if token exists
        },
        body: JSON.stringify({
          pageUrl: window.location.pathname,
          clickEvents,
          duration,
        }),
      });
    };

    // Track visit on page load (optional: remove if only tracking on unload is desired)
    trackVisit();

    // Track visit when the user leaves the page
    window.addEventListener('beforeunload', trackVisit);

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener('click', handleClick);
      window.removeEventListener('beforeunload', trackVisit);
    };
  }, [cookiesAccepted]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const handleCookiesAccepted = () => {
    setCookiesAccepted(true);
  };

  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        <AnalyticsTracker />
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
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:permalink" element={<BlogPost />} />
          <Route path="/song/:id" element={<Song />} />
          <Route path="/search" element={<Search />} />
        </Routes>
        <CookieConsent onAccept={handleCookiesAccepted} />
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
