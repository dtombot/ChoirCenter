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
      <header style={{ position: 'sticky', top: 0, background: '#fff', padding: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Choir Center</h1>
        <nav>
          <Link to="/signup" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#007bff' }}>Sign Up</Link>
          <Link to="/admin" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#007bff' }}>Admin Dashboard</Link>
        </nav>
      </header>
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
      <footer style={{ background: '#333', color: '#fff', textAlign: 'center', padding: '1rem' }}>
        <p>About Us: Choir Center is a platform for choristers to access music resources.</p>
        <div>
          <Link to="/about" style={{ color: '#fff', margin: '0 0.5rem' }}>About Us</Link>
          <Link to="/contact" style={{ color: '#fff', margin: '0 0.5rem' }}>Contact Us</Link>
          <Link to="/privacy" style={{ color: '#fff', margin: '0 0.5rem' }}>Privacy</Link>
          <Link to="/terms" style={{ color: '#fff', margin: '0 0.5rem' }}>Terms of Service</Link>
          <Link to="/blog" style={{ color: '#fff', margin: '0 0.5rem' }}>Blog Posts</Link>
          <Link to="/library" style={{ color: '#fff', margin: '0 0.5rem' }}>Explore Library</Link>
          <a href="#" style={{ color: '#fff', margin: '0 0.5rem' }}>Facebook</a>
          <a href="#" style={{ color: '#fff', margin: '0 0.5rem' }}>X</a>
          <a href="#" style={{ color: '#fff', margin: '0 0.5rem' }}>WhatsApp</a>
        </div>
      </footer>
    </Router>
  );
}

export default App;
