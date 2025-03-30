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
import Profile from './pages/Profile';

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
  const navigate = useNavigate();

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
    navigate('/');
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
                <Link to="/profile" className="nav-user-link">
                  <span className="nav-user-name">Hi, {userName}</span>
                </Link>
                <button onClick={handleLogout} className="nav-button">Logout</button>
              </>
            )}
          </nav>
        </header>
        <div className="background-notes">
          <svg className="background-note" style={{ left: '10%', animationDelay: '0s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path d="M 33.531 90 c -3.658 0 -7.158 -0.919 -10.069 -2.674 c -3.789 -2.285 -6.145 -5.7 -6.633 -9.617 s 0.957 -7.807 4.069 -10.951 c 2.986 -3.017 7.182 -4.996 11.814 -5.573 c 4.628 -0.579 9.185 0.311 12.82 2.503 c 3.789 2.284 6.145 5.699 6.633 9.617 c 0.488 3.917 -0.956 7.806 -4.069 10.95 c -2.985 3.018 -7.181 4.996 -11.813 5.573 C 35.36 89.943 34.44 90 33.531 90 z" fill="#98fb98"/>
              <rect x="48.26" y="2" width="4" height="72.73" fill="#3cb371"/>
              <path d="M 70.268 46.044 c -0.707 0 -1.373 -0.376 -1.733 -1.004 c -5.293 -9.213 -11.165 -13.174 -17.969 -12.108 c -0.578 0.092 -1.167 -0.076 -1.61 -0.456 c -0.444 -0.38 -0.7 -0.936 -0.7 -1.52 V 2 c 0 -1.104 0.896 -2 2 -2 s 2 0.896 2 2 c 0 8.136 4.322 11.023 9.326 14.366 c 6.801 4.543 14.508 9.692 10.645 28.089 c -0.17 0.812 -0.824 1.434 -1.644 1.564 C 70.477 46.036 70.372 46.044 70.268 46.044 z" fill="#3cb371"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '20%', animationDelay: '1s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <ellipse cx="68.21" cy="76.87" rx="8.72" ry="6.86" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -8.9846 9.0286)"/>
              <path d="M 76.909 36.311 c 0 11.599 14.562 6.438 11.043 23.197 c -3.071 -5.346 -6.722 -7.899 -11.043 -7.221 V 36.311 z" fill="#3cb371"/>
              <ellipse cx="9.981" cy="56.287" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -6.8861 1.6665)"/>
              <ellipse cx="46.771" cy="45.777" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -5.3032 6.137)"/>
              <polygon points="55.25,16.75 18.45,27.26 18.45,16.75 55.25,6.24" fill="#3cb371"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '30%', animationDelay: '2s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path d="M 43.458 65.465 l -3.21 -18.842 l -1.181 -6.93 c -0.018 -0.106 -0.049 -0.205 -0.088 -0.3 c -0.011 -0.027 -0.026 -0.051 -0.039 -0.077 c -0.032 -0.067 -0.067 -0.132 -0.109 -0.192 c -0.020 -0.029 -0.042 -0.055 -0.064 -0.082 c -0.043 -0.053 -0.087 -0.102 -0.137 -0.148 c -0.027 -0.025 -0.054 -0.049 -0.083 -0.072 c -0.054 -0.043 -0.112 -0.081 -0.172 -0.116 c -0.020 -0.012 -0.037 -0.028 -0.058 -0.039 c -0.01 -0.005 -0.020 -0.007 -0.030 -0.011 c -0.076 -0.037 -0.155 -0.066 -0.238 -0.09 c -0.017 -0.005 -0.032 -0.013 -0.049 -0.017 c -0.098 -0.024 -0.2 -0.038 -0.304 -0.40 c -0.030 -0.001 -0.059 0.005 -0.089 0.006 c -0.061 0.002 -0.122 0.002 -0.184 0.013 c -0.011 0.002 -0.021 0.007 -0.033 0.009 c -0.038 0.007 -0.074 0.020 -0.112 0.031 c -0.065 0.018 -0.129 0.039 -0.19 0.065 c -0.014 0.006 -0.029 0.008 -0.042 0.015 L 13.972 49.71 c -0.013 0.006 -0.022 0.018 -0.035 0.025 c -0.125 0.065 -0.241 0.142 -0.34 0.237 c -0.006 0.006 -0.011 0.014 -0.017 0.20 c -0.092 0.092 -0.167 0.198 -0.23 0.311 c -0.012 0.021 -0.024 0.40 -0.035 0.061 c -0.058 0.117 -0.099 0.242 -0.123 0.373 c -0.005 0.026 -0.007 0.051 -0.01 0.077 c -0.017 0.136 -0.022 0.276 0.002 0.419 l 1.181 6.93 l 2.438 14.314 c -1.494 -0.564 -3.283 -0.65 -5.064 -0.114 c -3.753 1.132 -6.043 4.585 -5.105 7.698 c 0.852 2.826 4.078 4.415 7.475 3.836 c 0.344 -0.059 0.689 -0.139 1.034 -0.243 c 3.522 -1.062 5.756 -4.17 5.241 -7.121 l -3.03 -17.79 l 20.404 -9.781 l 2.121 12.452 c -1.495 -0.566 -3.285 -0.652 -5.063 -0.113 c -1.759 0.53 -3.26 1.581 -4.226 2.96 c -1.041 1.483 -1.353 3.166 -0.879 4.737 c 0.474 1.571 1.663 2.801 3.351 3.463 c 1.258 0.493 2.685 0.621 4.108 0.378 c 0.351 -0.06 0.702 -0.142 1.049 -0.247 c 1.759 -0.53 3.26 -1.581 4.226 -2.96 C 43.359 68.327 43.71 66.868 43.458 65.465 z" fill="#98fb98"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '40%', animationDelay: '3s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path d="M 33.531 90 c -3.658 0 -7.158 -0.919 -10.069 -2.674 c -3.789 -2.285 -6.145 -5.7 -6.633 -9.617 s 0.957 -7.807 4.069 -10.951 c 2.986 -3.017 7.182 -4.996 11.814 -5.573 c 4.628 -0.579 9.185 0.311 12.82 2.503 c 3.789 2.284 6.145 5.699 6.633 9.617 c 0.488 3.917 -0.956 7.806 -4.069 10.95 c -2.985 3.018 -7.181 4.996 -11.813 5.573 C 35.36 89.943 34.44 90 33.531 90 z" fill="#98fb98"/>
              <rect x="48.26" y="2" width="4" height="72.73" fill="#3cb371"/>
              <path d="M 70.268 46.044 c -0.707 0 -1.373 -0.376 -1.733 -1.004 c -5.293 -9.213 -11.165 -13.174 -17.969 -12.108 c -0.578 0.092 -1.167 -0.076 -1.61 -0.456 c -0.444 -0.38 -0.7 -0.936 -0.7 -1.52 V 2 c 0 -1.104 0.896 -2 2 -2 s 2 0.896 2 2 c 0 8.136 4.322 11.023 9.326 14.366 c 6.801 4.543 14.508 9.692 10.645 28.089 c -0.17 0.812 -0.824 1.434 -1.644 1.564 C 70.477 46.036 70.372 46.044 70.268 46.044 z" fill="#3cb371"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '50%', animationDelay: '4s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <ellipse cx="68.21" cy="76.87" rx="8.72" ry="6.86" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -8.9846 9.0286)"/>
              <path d="M 76.909 36.311 c 0 11.599 14.562 6.438 11.043 23.197 c -3.071 -5.346 -6.722 -7.899 -11.043 -7.221 V 36.311 z" fill="#3cb371"/>
              <ellipse cx="9.981" cy="56.287" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -6.8861 1.6665)"/>
              <ellipse cx="46.771" cy="45.777" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -5.3032 6.137)"/>
              <polygon points="55.25,16.75 18.45,27.26 18.45,16.75 55.25,6.24" fill="#3cb371"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '60%', animationDelay: '5s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path d="M 43.458 65.465 l -3.21 -18.842 l -1.181 -6.93 c -0.018 -0.106 -0.049 -0.205 -0.088 -0.3 c -0.011 -0.027 -0.026 -0.051 -0.039 -0.077 c -0.032 -0.067 -0.067 -0.132 -0.109 -0.192 c -0.020 -0.029 -0.042 -0.055 -0.064 -0.082 c -0.043 -0.053 -0.087 -0.102 -0.137 -0.148 c -0.027 -0.025 -0.054 -0.049 -0.083 -0.072 c -0.054 -0.043 -0.112 -0.081 -0.172 -0.116 c -0.020 -0.012 -0.037 -0.028 -0.058 -0.039 c -0.01 -0.005 -0.020 -0.007 -0.030 -0.011 c -0.076 -0.037 -0.155 -0.066 -0.238 -0.09 c -0.017 -0.005 -0.032 -0.013 -0.049 -0.017 c -0.098 -0.024 -0.2 -0.038 -0.304 -0.40 c -0.030 -0.001 -0.059 0.005 -0.089 0.006 c -0.061 0.002 -0.122 0.002 -0.184 0.013 c -0.011 0.002 -0.021 0.007 -0.033 0.009 c -0.038 0.007 -0.074 0.020 -0.112 0.031 c -0.065 0.018 -0.129 0.039 -0.19 0.065 c -0.014 0.006 -0.029 0.008 -0.042 0.015 L 13.972 49.71 c -0.013 0.006 -0.022 0.018 -0.035 0.025 c -0.125 0.065 -0.241 0.142 -0.34 0.237 c -0.006 0.006 -0.011 0.014 -0.017 0.20 c -0.092 0.092 -0.167 0.198 -0.23 0.311 c -0.012 0.021 -0.024 0.40 -0.035 0.061 c -0.058 0.117 -0.099 0.242 -0.123 0.373 c -0.005 0.026 -0.007 0.051 -0.01 0.077 c -0.017 0.136 -0.022 0.276 0.002 0.419 l 1.181 6.93 l 2.438 14.314 c -1.494 -0.564 -3.283 -0.65 -5.064 -0.114 c -3.753 1.132 -6.043 4.585 -5.105 7.698 c 0.852 2.826 4.078 4.415 7.475 3.836 c 0.344 -0.059 0.689 -0.139 1.034 -0.243 c 3.522 -1.062 5.756 -4.17 5.241 -7.121 l -3.03 -17.79 l 20.404 -9.781 l 2.121 12.452 c -1.495 -0.566 -3.285 -0.652 -5.063 -0.113 c -1.759 0.53 -3.26 1.581 -4.226 2.96 c -1.041 1.483 -1.353 3.166 -0.879 4.737 c 0.474 1.571 1.663 2.801 3.351 3.463 c 1.258 0.493 2.685 0.621 4.108 0.378 c 0.351 -0.06 0.702 -0.142 1.049 -0.247 c 1.759 -0.53 3.26 -1.581 4.226 -2.96 C 43.359 68.327 43.71 66.868 43.458 65.465 z" fill="#98fb98"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '70%', animationDelay: '6s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path d="M 33.531 90 c -3.658 0 -7.158 -0.919 -10.069 -2.674 c -3.789 -2.285 -6.145 -5.7 -6.633 -9.617 s 0.957 -7.807 4.069 -10.951 c 2.986 -3.017 7.182 -4.996 11.814 -5.573 c 4.628 -0.579 9.185 0.311 12.82 2.503 c 3.789 2.284 6.145 5.699 6.633 9.617 c 0.488 3.917 -0.956 7.806 -4.069 10.95 c -2.985 3.018 -7.181 4.996 -11.813 5.573 C 35.36 89.943 34.44 90 33.531 90 z" fill="#98fb98"/>
              <rect x="48.26" y="2" width="4" height="72.73" fill="#3cb371"/>
              <path d="M 70.268 46.044 c -0.707 0 -1.373 -0.376 -1.733 -1.004 c -5.293 -9.213 -11.165 -13.174 -17.969 -12.108 c -0.578 0.092 -1.167 -0.076 -1.61 -0.456 c -0.444 -0.380 -0.7 -0.936 -0.7 -1.520 V 2 c 0 -1.104 0.896 -2 2 -2 s 2 0.896 2 2 c 0 8.136 4.322 11.023 9.326 14.366 c 6.801 4.543 14.508 9.692 10.645 28.089 c -0.17 0.812 -0.824 1.434 -1.644 1.564 C 70.477 46.036 70.372 46.044 70.268 46.044 z" fill="#3cb371"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '80%', animationDelay: '7s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <ellipse cx="68.21" cy="76.87" rx="8.72" ry="6.86" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -8.9846 9.0286)"/>
              <path d="M 76.909 36.311 c 0 11.599 14.562 6.438 11.043 23.197 c -3.071 -5.346 -6.722 -7.899 -11.043 -7.221 V 36.311 z" fill="#3cb371"/>
              <ellipse cx="9.981" cy="56.287" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -6.8861 1.6665)"/>
              <ellipse cx="46.771" cy="45.777" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -5.3032 6.137)"/>
              <polygon points="55.25,16.75 18.45,27.26 18.45,16.75 55.25,6.24" fill="#3cb371"/>
            </g>
          </svg>
          <svg className="background-note" style={{ left: '90%', animationDelay: '8s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path d="M 43.458 65.465 l -3.21 -18.842 l -1.181 -6.93 c -0.018 -0.106 -0.049 -0.205 -0.088 -0.3 c -0.011 -0.027 -0.026 -0.051 -0.039 -0.077 c -0.032 -0.067 -0.067 -0.132 -0.109 -0.192 c -0.020 -0.029 -0.042 -0.055 -0.064 -0.082 c -0.043 -0.053 -0.087 -0.102 -0.137 -0.148 c -0.027 -0.025 -0.054 -0.049 -0.083 -0.072 c -0.054 -0.043 -0.112 -0.081 -0.172 -0.116 c -0.020 -0.012 -0.037 -0.028 -0.058 -0.039 c -0.01 -0.005 -0.020 -0.007 -0.030 -0.011 c -0.076 -0.037 -0.155 -0.066 -0.238 -0.09 c -0.017 -0.005 -0.032 -0.013 -0.049 -0.017 c -0.098 -0.024 -0.2 -0.038 -0.304 -0.40 c -0.030 -0.001 -0.059 0.005 -0.089 0.006 c -0.061 0.002 -0.122 0.002 -0.184 0.013 c -0.011 0.002 -0.021 0.007 -0.033 0.009 c -0.038 0.007 -0.074 0.020 -0.112 0.031 c -0.065 0.018 -0.129 0.039 -0.19 0.065 c -0.014 0.006 -0.029 0.008 -0.042 0.015 L 13.972 49.71 c -0.013 0.006 -0.022 0.018 -0.035 0.025 c -0.125 0.065 -0.241 0.142 -0.34 0.237 c -0.006 0.006 -0.011 0.014 -0.017 0.20 c -0.092 0.092 -0.167 0.198 -0.23 0.311 c -0.012 0.021 -0.024 0.40 -0.035 0.061 c -0.058 0.117 -0.099 0.242 -0.123 0.373 c -0.005 0.026 -0.007 0.051 -0.01 0.077 c -0.017 0.136 -0.022 0.276 0.002 0.419 l 1.181 6.93 l 2.438 14.314 c -1.494 -0.564 -3.283 -0.65 -5.064 -0.114 c -3.753 1.132 -6.043 4.585 -5.105 7.698 c 0.852 2.826 4.078 4.415 7.475 3.836 c 0.344 -0.059 0.689 -0.139 1.034 -0.243 c 3.522 -1.062 5.756 -4.17 5.241 -7.121 l -3.03 -17.79 l 20.404 -9.781 l 2.121 12.452 c -1.495 -0.566 -3.285 -0.652 -5.063 -0.113 c -1.759 0.53 -3.26 1.581 -4.226 2.96 c -1.041 1.483 -1.353 3.166 -0.879 4.737 c 0.474 1.571 1.663 2.801 3.351 3.463 c 1.258 0.493 2.685 0.621 4.108 0.378 c 0.351 -0.06 0.702 -0.142 1.049 -0.247 c 1.759 -0.53 3.26 -1.581 4.226 -2.96 C 43.359 68.327 43.71 66.868 43.458 65.465 z" fill="#98fb98"/>
            </g>
          </svg>
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
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
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
            <svg className="footer-note" style={{ left: '10%', animationDelay: '0s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
              <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                <path d="M 33.531 90 c -3.658 0 -7.158 -0.919 -10.069 -2.674 c -3.789 -2.285 -6.145 -5.7 -6.633 -9.617 s 0.957 -7.807 4.069 -10.951 c 2.986 -3.017 7.182 -4.996 11.814 -5.573 c 4.628 -0.579 9.185 0.311 12.82 2.503 c 3.789 2.284 6.145 5.699 6.633 9.617 c 0.488 3.917 -0.956 7.806 -4.069 10.95 c -2.985 3.018 -7.181 4.996 -11.813 5.573 C 35.36 89.943 34.44 90 33.531 90 z" fill="#98fb98"/>
                <rect x="48.26" y="2" width="4" height="72.73" fill="#3cb371"/>
                <path d="M 70.268 46.044 c -0.707 0 -1.373 -0.376 -1.733 -1.004 c -5.293 -9.213 -11.165 -13.174 -17.969 -12.108 c -0.578 0.092 -1.167 -0.076 -1.61 -0.456 c -0.444 -0.38 -0.7 -0.936 -0.7 -1.52 V 2 c 0 -1.104 0.896 -2 2 -2 s 2 0.896 2 2 c 0 8.136 4.322 11.023 9.326 14.366 c 6.801 4.543 14.508 9.692 10.645 28.089 c -0.17 0.812 -0.824 1.434 -1.644 1.564 C 70.477 46.036 70.372 46.044 70.268 46.044 z" fill="#3cb371"/>
              </g>
            </svg>
            <svg className="footer-note" style={{ left: '50%', animationDelay: '2s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
              <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                <ellipse cx="68.21" cy="76.87" rx="8.72" ry="6.86" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -8.9846 9.0286)"/>
                <path d="M 76.909 36.311 c 0 11.599 14.562 6.438 11.043 23.197 c -3.071 -5.346 -6.722 -7.899 -11.043 -7.221 V 36.311 z" fill="#3cb371"/>
                <ellipse cx="9.981" cy="56.287" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -6.8861 1.6665)"/>
                <ellipse cx="46.771" cy="45.777" rx="8.501" ry="6.687" fill="#98fb98" transform="matrix(0.9923 -0.1237 0.1237 0.9923 -5.3032 6.137)"/>
                <polygon points="55.25,16.75 18.45,27.26 18.45,16.75 55.25,6.24" fill="#3cb371"/>
              </g>
            </svg>
            <svg className="footer-note" style={{ left: '90%', animationDelay: '4s' }} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
              <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                <path d="M 43.458 65.465 l -3.21 -18.842 l -1.181 -6.93 c -0.018 -0.106 -0.049 -0.205 -0.088 -0.3 c -0.011 -0.027 -0.026 -0.051 -0.039 -0.077 c -0.032 -0.067 -0.067 -0.132 -0.109 -0.192 c -0.020 -0.029 -0.042 -0.055 -0.064 -0.082 c -0.043 -0.053 -0.087 -0.102 -0.137 -0.148 c -0.027 -0.025 -0.054 -0.049 -0.083 -0.072 c -0.054 -0.043 -0.112 -0.081 -0.172 -0.116 c -0.020 -0.012 -0.037 -0.028 -0.058 -0.039 c -0.01 -0.005 -0.020 -0.007 -0.030 -0.011 c -0.076 -0.037 -0.155 -0.066 -0.238 -0.09 c -0.017 -0.005 -0.032 -0.013 -0.049 -0.017 c -0.098 -0.024 -0.2 -0.038 -0.304 -0.40 c -0.030 -0.001 -0.059 0.005 -0.089 0.006 c -0.061 0.002 -0.122 0.002 -0.184 0.013 c -0.011 0.002 -0.021 0.007 -0.033 0.009 c -0.038 0.007 -0.074 0.020 -0.112 0.031 c -0.065 0.018 -0.129 0.039 -0.19 0.065 c -0.014 0.006 -0.029 0.008 -0.042 0.015 L 13.972 49.71 c -0.013 0.006 -0.022 0.018 -0.035 0.025 c -0.125 0.065 -0.241 0.142 -0.34 0.237 c -0.006 0.006 -0.011 0.014 -0.017 0.20 c -0.092 0.092 -0.167 0.198 -0.23 0.311 c -0.012 0.021 -0.024 0.40 -0.035 0.061 c -0.058 0.117 -0.099 0.242 -0.123 0.373 c -0.005 0.026 -0.007 0.051 -0.01 0.077 c -0.017 0.136 -0.022 0.276 0.002 0.419 l 1.181 6.93 l 2.438 14.314 c -1.494 -0.564 -3.283 -0.65 -5.064 -0.114 c -3.753 1.132 -6.043 4.585 -5.105 7.698 c 0.852 2.826 4.078 4.415 7.475 3.836 c 0.344 -0.059 0.689 -0.139 1.034 -0.243 c 3.522 -1.062 5.756 -4.17 5.241 -7.121 l -3.03 -17.79 l 20.404 -9.781 l 2.121 12.452 c -1.495 -0.566 -3.285 -0.652 -5.063 -0.113 c -1.759 0.53 -3.26 1.581 -4.226 2.96 c -1.041 1.483 -1.353 3.166 -0.879 4.737 c 0.474 1.571 1.663 2.801 3.351 3.463 c 1.258 0.493 2.685 0.621 4.108 0.378 c 0.351 -0.06 0.702 -0.142 1.049 -0.247 c 1.759 -0.53 3.26 -1.581 4.226 -2.96 C 43.359 68.327 43.71 66.868 43.458 65.465 z" fill="#98fb98"/>
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
