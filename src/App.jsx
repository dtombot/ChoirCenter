import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <header style={{ position: 'sticky', top: 0, background: '#2f4f2f', padding: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
          <h1>Choir Center</h1>
        </Link>
        <nav>
          <Link to="/signup" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#98fb98' }}>Sign Up</Link>
          <Link to="/admin" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#98fb98' }}>Admin Dashboard</Link>
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
      </Routes>
      <footer style={{ background: '#2f4f2f', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p>About Us: Choir Center is a platform for choristers to access music resources.</p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link to="/about" style={{ color: '#98fb98', margin: '0.5rem 0' }}>About Us</Link>
          <Link to="/contact" style={{ color: '#98fb98', margin: '0.5rem 0' }}>Contact Us</Link>
          <Link to="/privacy" style={{ color: '#98fb98', margin: '0.5rem 0' }}>Privacy</Link>
          <Link to="/terms" style={{ color: '#98fb98', margin: '0.5rem 0' }}>Terms of Service</Link>
          <Link to="/blog" style={{ color: '#98fb98', margin: '0.5rem 0' }}>Blog Posts</Link>
          <Link to="/library" style={{ color: '#98fb98', margin: '0.5rem 0' }}>Explore Library</Link>
          <a href="#" style={{ color: '#98fb98', margin: '0.5rem 0' }}>Facebook</a>
          <a href="#" style={{ color: '#98fb98', margin: '0.5rem 0' }}>X</a>
          <a href="#" style={{ color: '#98fb98', margin: '0.5rem 0' }}>WhatsApp</a>
        </div>
      </footer>
    </Router>
  );
}

export default App;
