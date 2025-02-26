import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Home() {
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    '/images/choir1.jpg',
    '/images/choir2.jpg',
    '/images/choir3.jpg',
    '/images/choir4.jpg',
    '/images/choir5.jpg'
  ];

  useEffect(() => {
    const fetchData = async () => {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (songError) {
        console.error('Song fetch error:', songError.message);
        setError('Failed to load songs.');
      } else {
        const songsWithSize = songData.map(song => ({
          ...song,
          fileSize: 'Unknown',
        }));
        setSongs(songsWithSize || []);
      }

      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (postError) {
        console.error('Post fetch error:', postError.message);
        setError(prev => prev ? `${prev} Failed to load posts.` : 'Failed to load posts.');
      } else {
        setPosts(postData || []);
      }
    };
    fetchData();

    // Slideshow timer
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % slides.length;
        console.log('Updating to slide:', next, 'URL:', slides[next]);
        return next;
      });
    }, 10000); // Change every 10 seconds

    return () => clearInterval(slideInterval);
  }, [slides.length]);

  const handleDownload = async (songId, fileId) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const isAuthenticated = userData?.user && !userError;

      if (!isAuthenticated) {
        const downloadCount = parseInt(localStorage.getItem('downloadCount') || '0', 10);
        if (downloadCount >= 5) {
          setDownloadPrompt('You’ve reached the limit of 5 downloads. Please log in to download more.');
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setSongs(updatedSongs.map(song => ({ ...song, fileSize: 'Unknown' })) || []);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to update download count.');
    }
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.description && song.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <section className="hero-section">
        <div className="hero-slideshow">
          <img
            key={currentSlide}
            src={slides[currentSlide]}
            alt={`Choir Slide ${currentSlide + 1}`}
            className="hero-slide-img active"
            onLoad={() => console.log('Image loaded:', slides[currentSlide])}
            onError={() => console.error('Image failed to load:', slides[currentSlide])}
          />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <h2 className="hero-title">Welcome to Choir Center</h2>
          <p className="hero-text">Find and download choir music resources easily.</p>
          <input
            type="text"
            placeholder="Search for songs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="button-group">
            <Link to="/library">
              <button className="action-button">Explore Library</button>
            </Link>
            <Link to="/blog">
              <button className="action-button">Blog Posts</button>
            </Link>
          </div>
        </div>
      </section>
      <div className="container">
        {error && <p className="error-message">{error}</p>}
        <h3 className="section-title">Latest Additions</h3>
        {songs.length === 0 && !error ? (
          <p>No songs available.</p>
        ) : (
          <div className="song-list-container">
            <div className="song-list">
              {filteredSongs.map((song, index) => (
                <Link to={`/song/${song.permalink || song.id}`} key={song.id} className="song-item">
                  <span className="song-number">{index + 1}</span>
                  <div className="song-info">
                    <h4 className="song-title">{song.title}</h4>
                    <p className="song-description">{song.description || 'No description'}</p>
                  </div>
                  <span className="song-size">{song.fileSize}</span>
                  <span className="song-downloads">{song.downloads || 0}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownload(song.id, song.google_drive_file_id);
                    }}
                    className="download-button"
                  >
                    Download
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}
        <h3 className="section-title">Latest Insights</h3>
        {posts.length === 0 && !error ? (
          <p>No posts available.</p>
        ) : (
          <div className="blog-list">
            {posts.map(post => (
              <Link to={`/blog/${post.permalink || post.id}`} key={post.id} className="blog-item">
                <h4 className="blog-title">{post.title}</h4>
              </Link>
            ))}
          </div>
        )}
      </div>

      {downloadPrompt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Download Limit Reached</h3>
            <p className="modal-text">
              {downloadPrompt} <Link to="/login" className="modal-link">Log in here</Link>.
            </p>
            <button onClick={() => setDownloadPrompt(null)} className="cancel-button">Close</button>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
