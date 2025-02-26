import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Home() {
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads')
        .order('created_at', { ascending: false })
        .limit(10);
      if (songError) {
        console.error('Error fetching songs:', songError.message);
        setError('Failed to load songs: ' + songError.message);
      } else {
        setSongs(songData || []);
      }

      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('id, title, permalink')
        .order('created_at', { ascending: false })
        .limit(10);
      if (postError) {
        console.error('Error fetching posts:', postError.message);
        setError('Failed to load posts: ' + postError.message);
      } else {
        setPosts(postData || []);
      }
    };
    fetchData();

    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    setSearchQuery('');
  };

  const handleSongClick = (id) => {
    navigate(`/song/${id}`);
  };

  const handleDownload = async (songId, fileId) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const isAuthenticated = userData?.user && !userError;

      if (!isAuthenticated) {
        const downloadCount = parseInt(localStorage.getItem('downloadCount') || '0', 10);
        if (downloadCount >= 5) {
          alert('You’ve reached the limit of 5 downloads. Please log in to download more.');
          return;
        }
        localStorage.setItem('downloadCount', downloadCount + 1);
      }

      const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${songId}.pdf`;
      link.click();

      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: (songs.find(s => s.id === songId)?.downloads || 0) + 1 })
        .eq('id', songId);
      if (updateError) throw updateError;

      const { data: updatedSongs } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads')
        .order('created_at', { ascending: false })
        .limit(10);
      setSongs(updatedSongs || []);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to update download count.');
    }
  };

  const handleShare = (songTitle, songId) => {
    const shareUrl = `${window.location.origin}/song/${songId}`;
    const shareText = `Check out "${songTitle}" on Choir Center!`;
    if (navigator.share) {
      navigator.share({
        title: songTitle,
        text: shareText,
        url: shareUrl,
      }).catch(err => console.error('Share error:', err));
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert('Link copied to clipboard! Share it manually.'))
        .catch(err => console.error('Clipboard error:', err));
    }
  };

  return (
    <div className="home-container">
      <section className="hero-section full-width">
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
          <h1 className="hero-title animate-text">Welcome to ChoirCenter</h1>
          <p className="hero-text animate-text">Your hub for choir music and insights.</p>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input animate-input"
            />
          </form>
          <div className="button-group">
            <Link to="/library" className="action-button animate-button">Explore Library</Link>
            <Link to="/blog" className="action-button animate-button">Latest Insights</Link>
          </div>
        </div>
      </section>
      {error && <p className="error-message">{error}</p>}
      <section className="latest-additions">
        <h2 className="section-title animate-text">Latest Additions</h2>
        <div className="song-grid">
          {songs.map(song => (
            <div
              key={song.id}
              className="song-card animate-card"
              onClick={() => handleSongClick(song.id)}
            >
              <div className="song-card-content">
                <h3 className="song-card-title">{song.title}</h3>
                <p className="song-card-composer">{song.composer}</p>
                <p className="song-card-downloads">Downloaded {song.downloads || 0} times</p>
              </div>
              <div className="song-card-actions">
                <button
                  className="download-button"
                  onClick={(e) => { e.stopPropagation(); handleDownload(song.id, song.google_drive_file_id); }}
                >
                  Download
                </button>
                <button
                  className="share-button"
                  onClick={(e) => { e.stopPropagation(); handleShare(song.title, song.id); }}
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <hr className="section-separator" />
      <section className="blog-list-container">
        <h2 className="section-title animate-text">Latest Insights</h2>
        <div className="blog-list">
          {posts.map(post => (
            <Link
              key={post.id}
              to={`/blog/${post.permalink || `post-${post.id}`}`}
              className="blog-item animate-card"
            >
              <h3 className="blog-title">{post.title}</h3>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
