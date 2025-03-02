import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';
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
        console.error('Initial song fetch error:', songError.message);
        setError('Failed to load songs: ' + songError.message);
      } else {
        console.log('Initial songs:', JSON.stringify(songData, null, 2));
        setSongs(songData || []);
      }

      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('id, title, permalink')
        .order('created_at', { ascending: false })
        .limit(10);
      if (postError) {
        console.error('Post fetch error:', postError.message);
        setError('Failed to load posts: ' + postError.message);
      } else {
        console.log('Initial posts:', JSON.stringify(postData, null, 2));
        setPosts(postData || []);
      }

      const { data: songOfTheWeekData, error: sotwError } = await supabase
        .from('song_of_the_week')
        .select('spotify_embed_html')
        .limit(1);
      if (sotwError) {
        console.error('Song of the Week fetch error:', sotwError.message);
        setError('Failed to load Song of the Week: ' + sotwError.message);
      } else {
        console.log('Song of the Week data:', JSON.stringify(songOfTheWeekData, null, 2));
        const embedHtml = songOfTheWeekData && songOfTheWeekData.length > 0 ? songOfTheWeekData[0].spotify_embed_html : null;
        console.log('Song of the Week embed HTML:', embedHtml);
        setSongOfTheWeek(embedHtml);
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
    const honeypot = e.target.elements.honeypot.value;
    if (honeypot) {
      setError('Spam detected');
      return;
    }
    if (!searchQuery.trim()) return;
    navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    setSearchQuery('');
  };

  const handleSongClick = (song) => {
    const songPath = song.permalink || song.id;
    navigate(`/song/${songPath}`);
  };

  const handleDownload = async (songId, fileId) => {
    try {
      console.log('New handleDownload started - songId:', songId, 'fileId:', fileId);

      // Step 1: Download limits check
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const isAuthenticated = !!sessionData?.session;
      console.log('Is authenticated:', isAuthenticated);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const downloadKey = `downloads_${year}-${month}`;
      const lastResetKey = `lastReset_${year}-${month}`;
      const storedReset = localStorage.getItem(lastResetKey);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      if (!storedReset || storedReset !== currentMonthStart) {
        localStorage.setItem(downloadKey, '0');
        localStorage.setItem(lastResetKey, currentMonthStart);
      }

      const downloadCount = parseInt(localStorage.getItem(downloadKey) || '0', 10);
      console.log('Download count:', downloadCount);

      if (!isAuthenticated && downloadCount >= 3) {
        setDownloadPrompt('Download Limit Reached.\nYou’ve used your 3 free monthly downloads. Sign up for 6 monthly downloads or Buy us a Meat Pie ☕ for unlimited access! Every bit helps keep the site running! 🤗');
        return;
      } else if (isAuthenticated) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('has_donated')
          .eq('id', userData.user.id)
          .single();
        if (profileError) throw profileError;
        console.log('User profile:', JSON.stringify(profileData, null, 2));

        if (!profileData?.has_donated && downloadCount >= 6) {
          setDownloadPrompt('Download Limit Reached.\nYou’ve used your 6 free monthly downloads. Buy us a Meat Pie ☕ for unlimited access this month! Every bit helps keep the site running! 🤗');
          return;
        }
      }
      localStorage.setItem(downloadKey, downloadCount + 1);
      console.log('New download count:', downloadCount + 1);

      // Step 2: Trigger download
      const numericSongId = parseInt(songId, 10);
      if (isNaN(numericSongId)) throw new Error('Invalid song ID');
      console.log('Song ID parsed:', numericSongId);

      const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${songId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('Download initiated');

      // Step 3: Get current downloads
      const { data: songData, error: fetchError } = await supabase
        .from('songs')
        .select('downloads')
        .eq('id', numericSongId)
        .single();
      if (fetchError) throw fetchError;
      const currentDownloads = songData.downloads || 0;
      console.log('Downloads before update:', currentDownloads);

      // Step 4: Upsert to increment downloads
      const { data: upsertData, error: upsertError } = await supabase
        .from('songs')
        .upsert({ id: numericSongId, downloads: currentDownloads + 1 }, { onConflict: 'id' })
        .select();
      if (upsertError) {
        console.error('Upsert error:', JSON.stringify(upsertError, null, 2));
        throw upsertError;
      }
      console.log('Upsert result:', JSON.stringify(upsertData, null, 2));

      // Step 5: Wait briefly and refetch all songs
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay to ensure commit
      const { data: updatedSongs, error: refetchError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads')
        .order('created_at', { ascending: false })
        .limit(10);
      if (refetchError) throw refetchError;
      console.log('Refetched songs:', JSON.stringify(updatedSongs, null, 2));
      setSongs(updatedSongs || []);
    } catch (err) {
      console.error('Download failed:', err.message);
      setError('Failed to download: ' + err.message);
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
            <input type="text" name="honeypot" className="honeypot" />
          </form>
          <div className="button-group">
            <Link to="/library" className="action-button animate-button">Explore Library</Link>
            <Link to="/blog" className="action-button animate-button">Latest Insights</Link>
          </div>
        </div>
      </section>
      <section className="ad-section">
        <AdBanner position="home_above_sotw" />
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
          {songs.length > 0 ? (
            songs.map((song, index) => (
              <div
                key={song.id}
                className={`song-card-modern ${index % 2 === 0 ? 'variant-1' : 'variant-2'}`}
                onClick={() => handleSongClick(song)}
              >
                <div className="song-card-content">
                  <h3 className="song-card-title-modern">{song.title}</h3>
                  <p className="song-card-composer-modern">{song.composer}</p>
                  <p className="song-card-downloads-modern">Downloaded {song.downloads || 0} times</p>
                </div>
                <div className="song-card-actions-modern">
                  <button
                    className="download-button-modern"
                    onClick={(e) => { e.stopPropagation(); handleDownload(song.id, song.google_drive_file_id); }}
                  >
                    Download
                  </button>
                  <button
                    className="share-button-modern"
                    onClick={(e) => { e.stopPropagation(); handleShare(song.title, song.permalink || song.id); }}
                  >
                    Share
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No songs available.</p>
          )}
        </div>
      </section>
      <hr className="section-separator" />
      <section className="blog-list-container">
        <h2 className="section-title animate-text">Latest Insights</h2>
        <div className="blog-list">
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <Link
                key={post.id}
                to={`/blog/${post.permalink || `post-${post.id}`}`}
                className={`blog-card-modern ${index % 2 === 0 ? 'variant-1' : 'variant-2'}`}
              >
                <h3 className="blog-card-title-modern">{post.title}</h3>
              </Link>
            ))
          ) : (
            <p>No blog posts available.</p>
          )}
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
              Want to keep downloading?{' '}
              <button className="meatpie-button">
                <Link to="/signup-donate" className="modal-link">Buy us a Meat Pie ☕</Link>
              </button>{' '}
              to help sustain the site and enjoy unlimited access, or{' '}
              <button className="signup-button">
                <Link to="/signup" className="modal-link">Just Sign up</Link>
              </button>{' '}
              for additional downloads. Every little bit helps keep the site running! 🤗
            </p>
            <button onClick={() => setDownloadPrompt(null)} className="cancel-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
