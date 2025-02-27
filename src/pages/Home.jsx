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
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [songOfTheWeek, setSongOfTheWeek] = useState(null);
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

      const { data: songOfTheWeekData, error: sotwError } = await supabase
        .from('song_of_the_week')
        .select('spotify_embed_html')
        .single();
      if (sotwError) {
        console.error('Error fetching song of the week:', sotwError.message);
      } else {
        setSongOfTheWeek(songOfTheWeekData?.spotify_embed_html || null);
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
        const today = new Date().toDateString();
        const downloadKey = `downloads_${today}`;
        const downloadCount = parseInt(localStorage.getItem(downloadKey) || '0', 10);
        if (downloadCount >= 5) {
          setDownloadPrompt('You’ve reached the daily limit of 5 downloads. Register to download more!');
          return;
        }
        localStorage.setItem(downloadKey, downloadCount + 1);
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
          <h1 className="hero-title animate-text">Everything your choir needs in one place</h1>
          <p className="hero-text animate-text">Discover and find choir music resources</p>
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
      <section className="song-of-the-week">
        <h2 className="section-title animate-text">Song of the Week</h2>
        {songOfTheWeek ? (
          <div className="audio-player animate-text" dangerouslySetInnerHTML={{ __html: songOfTheWeek }} />
        ) : (
          <p className="animate-text">No song selected for this week.</p>
        )}
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
              <h3 className="blog-title small-text">{post.title}</h3>
            </Link>
          ))}
        </div>
      </section>
      <hr className="section-separator" />
      <section className="faq-section">
        <h2 className="section-title animate-text">Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item animate-card">
            <h3 className="faq-question">Why should I join a choir?</h3>
            <p className="faq-answer">Joining a choir boosts your confidence, builds community, and enhances your musical skills—pure joy in every note!</p>
          </div>
          <div className="faq-item animate-card">
            <h3 className="faq-question">Does singing in a choir enhance spirituality?</h3>
            <p className="faq-answer">Yes, it uplifts your spirit, fosters peace, and connects you deeply through harmonious expression.</p>
          </div>
          <div className="faq-item animate-card">
            <h3 className="faq-question">What are the key qualities of a good chorister?</h3>
            <p className="faq-answer">Dedication, teamwork, a strong ear, and a passion for singing make an exceptional chorister.</p>
          </div>
          <div className="faq-item animate-card">
            <h3 className="faq-question">Which vocal tips can improve my singing?</h3>
            <p className="faq-answer">Practice breathing, warm up daily, hydrate, and focus on posture for a clearer, stronger voice.</p>
          </div>
          <div className="faq-item animate-card">
            <h3 className="faq-question">How can I find choirs near me?</h3>
            <p className="faq-answer">Search online, check local churches, or join Choir Center to connect with nearby groups easily!</p>
          </div>
          <div className="faq-item animate-card">
            <h3 className="faq-question">Where can I find choir songs in solfa notation?</h3>
            <p className="faq-answer">Choir Center offers free solfa notation downloads—perfect for learning and singing!</p>
          </div>
          <div className="faq-item animate-card">
            <h3 className="faq-question">How can I improve my sight-singing skills?</h3>
            <p className="faq-answer">Practice scales, use solfa, and sing along with sheet music from Choir Center to master it quickly.</p>
          </div>
        </div>
      </section>
      {downloadPrompt && (
        <div className="modal-overlay">
          <div className="modal-content download-modal">
            <h3 className="modal-title">Download Limit Reached</h3>
            <p className="modal-text">
              {downloadPrompt} <Link to="/signup" className="modal-link">Sign up here</Link> to enjoy unlimited downloads!
            </p>
            <button onClick={() => setDownloadPrompt(null)} className="cancel-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
