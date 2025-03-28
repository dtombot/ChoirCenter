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
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_title: document.title,
      });
    }

    const saveScrollAndPage = () => {
      const scrollPosition = window.scrollY;
      const state = history.state || {};
      const currentPage = state.currentPage || 1;
      sessionStorage.setItem(`scrollPosition-${location.pathname}`, scrollPosition.toString());
      sessionStorage.setItem(`currentPage-${location.pathname}`, currentPage.toString());
    };

    const restoreScrollAndPage = () => {
      const savedPosition = sessionStorage.getItem(`scrollPosition-${location.pathname}`);
      const savedPage = sessionStorage.getItem(`currentPage-${location.pathname}`);
      if (savedPosition !== null && savedPage !== null) {
        const page = parseInt(savedPage, 10);
        const position = parseInt(savedPosition, 10);
        navigate(location.pathname, { state: { currentPage: page }, replace: true });
        requestAnimationFrame(() => {
          window.scrollTo({ top: position, behavior: 'auto' });
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

  const socialLinks = [
    { href: 'https://facebook.com', icon: <svg className="social-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg> },
    { href: 'https://x.com', icon: <svg className="social-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { href: 'https://whatsapp.com', icon: <svg className="social-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l4.93-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm3.97 15.03c-.25.7-.76 1.27-1.45 1.6-.7.34-1.6.5-2.52.25-1.8-.5-3.3-2-3.8-3.8-.25-.9-.08-1.8.25-2.52.33-.7.9-1.2 1.6-1.45.15-.05.3-.08.45-.08s.3.03.45.08c.35.15.6.45.7.8.1.35.15.7.15 1.05 0 .35-.05.7-.15 1.05-.5 1.5.5 2.5 1.5 3s2-.5 1.5-1.5c-.15-.35-.2-.7-.15-1.05s.2-.7.55-.85c.15-.05.3-.08.45-.08s.3.03.45.08z"/></svg> },
  ];

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    if (!email) return;

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email, subscribed_at: new Date().toISOString() }]);
      if (error) throw error;
      alert('Thanks for subscribing!');
      e.target.reset();
    } catch (error) {
      console.error('Newsletter signup error:', error.message);
      alert('Failed to subscribe. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
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
          <div className="footer-inner">
            <div className="footer-column footer-logo-section">
              <div className="footer-logo-wrapper">
                <img src="/logo.png" alt="Choir Center Logo" className="footer-logo" />
                <p className="footer-about">
                  Choir Center is your hub for choir music, offering a rich library of songs and resources to inspire and unite voices in harmony.
                </p>
              </div>
              <form className="footer-newsletter" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  name="email"
                  placeholder="Join Choir Center Updates"
                  className="footer-input"
                  aria-label="Subscribe to newsletter"
                />
                <button type="submit" className="footer-subscribe">Subscribe</button>
              </form>
            </div>
            <div className="footer-column footer-links">
              <Link to="/about" className="footer-link">About Us</Link>
              <Link to="/contact" className="footer-link">Contact Us</Link>
              <Link to="/library" className="footer-link">Explore Library</Link>
              <Link to="/blog" className="footer-link">Blog Posts</Link>
              <Link to="/privacy" className="footer-link">Privacy</Link>
              <Link to="/terms" className="footer-link">Terms</Link>
            </div>
            <div className="footer-column footer-social">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  {link.icon}
                </a>
              ))}
            </div>
            {/* Quaver */}
            <svg className="footer-note" style={{ left: '10%', animationDelay: '0s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
              <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                <path d="M 33.531 90 c -3.658 0 -7.158 -0.919 -10.069 -2.674 c -3.789 -2.285 -6.145 -5.7 -6.633 -9.617 s 0.957 -7.807 4.069 -10.951 c 2.986 -3.017 7.182 -4.996 11.814 -5.573 c 4.628 -0.579 9.185 0.311 12.82 2.503 c 3.789 2.284 6.145 5.699 6.633 9.617 c 0.488 3.917 -0.956 7.806 -4.069 10.95 c -2.985 3.018 -7.181 4.996 -11.813 5.573 C 35.36 89.943 34.44 90 33.531 90 z" fill="#98fb98"/>
                <rect x="48.26" y="2" width="4" height="72.73" fill="#3cb371"/>
                <path d="M 70.268 46.044 c -0.707 0 -1.373 -0.376 -1.733 -1.004 c -5.293 -9.213 -11.165 -13.174 -17.969 -12.108 c -0.578 0.092 -1.167 -0.076 -1.61 -0.456 c -0.444 -0.38 -0.7 -0.936 -0.7 -1.52 V 2 c 0 -1.104 0.896 -2 2 -2 s 2 0.896 2 2 c 0 8.136 4.322 11.023 9.326 14.366 c 6.801 4.543 14.508 9.692 10.645 28.089 c -0.17 0.812 -0.824 1.434 -1.644 1.564 C 70.477 46.036 70.372 46.044 70.268 46.044 z" fill="#3cb371"/>
              </g>
            </svg>
            {/* Group of Notes */}
            <svg className="footer-note" style={{ left: '50%', animationDelay: '2s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
              <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                <ellipse cx="68.21" cy="76.87" rx="8.72" ry="6.86" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -8.9846 9.0286)"/>
                <path d="M 76.909 36.311 c 0 11.599 14.562 6.438 11.043 23.197 c -3.071 -5.346 -6.722 -7.899 -11.043 -7.221 V 36.311 z" fill="#3cb371"/>
                <ellipse cx="9.981" cy="56.287" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -6.8861 1.6665)"/>
                <ellipse cx="46.771" cy="45.777" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -5.3032 6.137)"/>
                <polygon points="55.25,16.75 18.45,27.26 18.45,16.75 55.25,6.24" fill="#3cb371"/>
              </g>
            </svg>
            {/* Treble Clef */}
            <svg className="footer-note" style={{ left: '90%', animationDelay: '4s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
              <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                <path d="M 63.688 53.376 h -0.001 c -0.07 -4.072 -2.19 -7.988 -5.456 -10.256 c -2.586 -1.848 -5.837 -2.551 -8.898 -2.132 c -0.717 -4.335 -1.469 -8.659 -2.24 -12.973 c 0.468 -0.436 0.931 -0.88 1.383 -1.342 c 1.619 -1.67 3.075 -3.573 4.106 -5.702 c 1.044 -2.125 1.555 -4.474 1.621 -6.776 c 0.084 -2.311 -0.302 -4.581 -0.883 -6.758 c 0.264 2.242 0.332 4.499 0.016 6.683 c -0.309 2.184 -1.04 4.263 -2.145 6.103 c -1.201 1.975 -2.795 3.635 -4.567 5.154 c -0.417 -2.314 -0.838 -4.625 -1.262 -6.931 c -0.383 -2.417 -0.85 -4.787 -1.151 -7.22 c -0.2 -1.163 -0.227 -2.206 -0.144 -3.316 c 0.083 -1.092 0.324 -2.177 0.749 -3.168 c 0.413 -0.995 1.038 -1.882 1.801 -2.495 c 0.772 -0.593 1.712 -0.789 2.642 -0.361 c 0.932 0.408 1.774 1.288 2.411 2.286 c 0.651 1.001 1.199 2.11 1.649 3.263 c -0.205 -1.218 -0.475 -2.445 -0.968 -3.624 c -0.497 -1.161 -1.187 -2.351 -2.41 -3.165 C 49.334 0.253 48.57 -0.003 47.785 0 C 47 -0.004 46.236 0.232 45.58 0.588 c -1.31 0.731 -2.243 1.864 -2.925 3.06 c -1.378 2.395 -1.841 5.263 -1.606 7.9 c 0.118 2.471 0.326 4.978 0.629 7.435 c 0.301 2.46 0.624 4.911 0.963 7.357 l 0.303 1.906 c -0.411 0.299 -0.823 0.596 -1.236 0.893 c -3.654 2.583 -7.475 5.35 -10.458 9.185 c -1.488 1.903 -2.689 4.081 -3.495 6.393 c -0.823 2.31 -1.242 4.731 -1.401 7.129 c -0.358 5.01 1.407 10.119 4.698 13.935 c 1.64 1.915 3.667 3.518 5.949 4.653 c 2.278 1.146 4.828 1.754 7.368 1.839 c 2.206 0.086 4.419 -0.261 6.518 -0.951 l 0.438 2.18 c 0.178 1.125 0.179 2.268 0.034 3.413 c -0.291 2.289 -1.171 4.533 -2.467 6.494 c -1.304 1.946 -3.013 3.688 -5.113 4.739 c -2.942 1.669 -6.64 1.106 -9.415 -0.877 c 0.656 0.278 1.376 0.432 2.132 0.432 c 3.02 0 5.477 -2.457 5.477 -5.477 c 0 -3.019 -2.457 -5.476 -5.477 -5.476 c -3.02 0 -5.477 2.457 -5.477 5.476 c 0 1.621 0.712 3.076 1.835 4.08 c 1.029 1.252 2.368 2.272 3.87 2.943 c 1.169 0.512 2.462 0.773 3.757 0.747 c 1.297 -0.02 2.575 -0.355 3.759 -0.864 c 2.38 -1.032 4.351 -2.816 5.865 -4.879 c 1.512 -2.074 2.6 -4.481 3.055 -7.061 c 0.226 -1.285 0.288 -2.627 0.143 -3.941 l -0.223 -2.799 c 1.87 -0.885 3.6 -2.058 5.061 -3.517 c 3.601 -3.535 5.651 -8.562 5.547 -13.549 h 0 L 63.688 53.376 z" fill="#2f4f2f"/>
              </g>
            </svg>
          </div>
          <div className="footer-copyright">
            © {new Date().getFullYear()} Choir Center, All Rights Reserved
          </div>
        </footer>
      </Router>
    </HelmetProvider>
  );
}

export default App;
