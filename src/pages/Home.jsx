import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Home() {
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('title, composer, google_drive_file_id, permalink, is_public, downloads')
        .order('created_at', { ascending: false })
        .limit(10);
      if (songError) setError('Failed to load songs: ' + songError.message);
      else setSongs(songData || []);

      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('title, content, permalink')
        .order('created_at', { ascending: false })
        .limit(10);
      if (postError) setError('Failed to load posts: ' + postError.message);
      else setPosts(postData || []);
    };
    fetchData();

    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Add search logic if needed
  };

  return (
    <div className="container">
      <section className="hero-section">
        <div className="hero-slideshow">
          {[1, 2, 3, 4, 5].map(num => (
            <img
              key={num}
              src={`/images/choir${num}.jpg`}
              alt={`Choir ${num}`}
              className={`hero-slide-img ${currentSlide === num - 1 ? 'active' : ''}`}
            />
          ))}
        </div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Welcome to ChoirCenter</h1>
          <p className="hero-text">Your hub for choir music and insights.</p>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>
          <div className="button-group">
            <button className="action-button">Explore Library</button>
            <button className="action-button">Latest Insights</button>
          </div>
        </div>
      </section>
      {error && <p className="error-message">{error}</p>}
      <section className="song-list-container">
        <h2 className="section-title">Latest Additions</h2>
        <div className="song-list">
          {songs.map(song => (
            <div key={song.id} className="song-item">
              <div className="song-info">
                <h3 className="song-title">{song.title}</h3>
                <p className="song-composer">{song.composer}</p>
              </div>
              <div className="download-container">
                <p className="song-downloads">Downloaded {song.downloads || 0} times</p>
                <button className="download-button">Download</button>
                <button className="share-button">Share</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <hr className="section-separator" />
      <section className="blog-list-container">
        <h2 className="section-title">Latest Insights</h2>
        <div className="blog-list">
          {posts.map(post => (
            <Link key={post.id} to={`/blog/${post.permalink}`} className="blog-item">
              <h3 className="blog-title">{post.title}</h3>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
