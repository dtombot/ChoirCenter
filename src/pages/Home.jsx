// src/pages/Home.jsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';
import '../styles.css';

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

function Home() {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [songOfTheWeek, setSongOfTheWeek] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      console.log('Fetching all data');
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      if (songError) {
        console.error('Initial song fetch error:', songError.message);
        setError('Failed to load songs: ' + songError.message);
      } else {
        console.log('Fetched songs:', JSON.stringify(songData, null, 2));
        setSongs(songData || []);
        setFilteredSongs(songData.slice(0, 6) || []);
      }

      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('id, title, permalink')
        .order('created_at', { ascending: false });
      if (postError) {
        console.error('Post fetch error:', postError.message);
        setError('Failed to load posts: ' + postError.message);
      } else {
        console.log('Fetched posts:', JSON.stringify(postData, null, 2));
        setPosts(postData || []);
        setFilteredPosts(postData.slice(0, 6) || []);
      }

      const { data: songOfTheWeekData, error: sotwError } = await supabase
        .from('song_of_the_week')
        .select('audio_url')
        .limit(1);
      if (sotwError) {
        console.error('Song of the Week fetch error:', sotwError.message);
        setError('Failed to load Song of the Week: ' + sotwError.message);
      } else {
        console.log('Song of the Week data:', JSON.stringify(songOfTheWeekData, null, 2));
        const audioUrl = songOfTheWeekData && songOfTheWeekData.length > 0 ? songOfTheWeekData[0].audio_url : null;
        console.log('Song of the Week audio URL:', audioUrl);
        setSongOfTheWeek(audioUrl);
      }
    };
    fetchData();

    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, []);

  // Audio player functions
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error('Play failed for URL:', audioRef.current.src, 'Error:', err.message);
          setError(`Failed to play audio. Check the URL (${audioRef.current.src}) or browser console for details.`);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const rewind = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error('Play failed for URL:', audioRef.current.src, 'Error:', err.message);
        setError(`Failed to play audio. Check the URL (${audioRef.current.src}) or browser console for details.`);
      });
      setIsPlaying(true);
    }
  };

  const filterContent = (query) => {
    const trimmedQuery = query.trim().toLowerCase();
    console.log('Filtering with query:', trimmedQuery);

    if (!trimmedQuery) {
      console.log('Resetting to initial 6 items');
      setFilteredSongs(songs.slice(0, 6));
      setFilteredPosts(posts.slice(0, 6));
      setError(null);
    } else {
      const songMatches = songs.filter(song =>
        song.title.toLowerCase().includes(trimmedQuery) ||
        (song.composer && song.composer.toLowerCase().includes(trimmedQuery))
      ).slice(0, 6);
      const postMatches = posts.filter(post =>
        post.title.toLowerCase().includes(trimmedQuery)
      ).slice(0, 6);
      console.log('Filtered songs:', JSON.stringify(songMatches, null, 2));
      console.log('Filtered posts:', JSON.stringify(postMatches, null, 2));
      setFilteredSongs(songMatches);
      setFilteredPosts(postMatches);
      if (songMatches.length === 0 && postMatches.length === 0) {
        setError(`No results found for "${query}".`);
      } else {
        setError(null);
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Search form submitted via onSubmit');
    const honeypot = e.target.elements.honeypot.value;
    if (honeypot) {
      setError('Spam detected');
      console.log('Spam detected in honeypot');
      return;
    }
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      console.log('Search query is empty');
      return;
    }
    console.log('Attempting navigation to search page with query:', searchQuery);
    navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
  };

  const handleSearchChange = (e) => {
    const newQuery = e.target.value;
    console.log('Search input changed:', newQuery);
    setSearchQuery(newQuery);
    filterContent(newQuery);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      console.log('Enter key pressed in input');
      const honeypot = document.querySelector('input[name="honeypot"]').value;
      if (honeypot) {
        setError('Spam detected');
        console.log('Spam detected in honeypot via keypress');
        return;
      }
      if (!searchQuery.trim()) {
        setError('Please enter a search term');
        console.log('Search query is empty via keypress');
        return;
      }
      console.log('Navigating via Enter keypress with query:', searchQuery);
      navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSongClick = (song) => {
    const songPath = song.permalink || song.id;
    navigate(`/song/${songPath}`);
  };

  const handleDownload = async (songId, fileId) => {
    try {
      console.log('handleDownload started - songId:', songId, 'fileId:', fileId);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session fetch error:', sessionError.message);
        throw sessionError;
      }
      const isAuthenticated = !!sessionData?.session;
      console.log('Authenticated:', isAuthenticated);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}-${month}`;
      const downloadKey = `downloads_${yearMonth}`;
      const lastResetKey = `lastReset_${yearMonth}`;
      const storedReset = localStorage.getItem(lastResetKey);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthName = now.toLocaleString('default', { month: 'long' });

      if (!storedReset || storedReset !== currentMonthStart) {
        localStorage.setItem(downloadKey, '0');
        localStorage.setItem(lastResetKey, currentMonthStart);
      }

      let downloadCount = parseInt(localStorage.getItem(downloadKey) || '0', 10);
      const maxDownloads = isAuthenticated ? 6 : 3;
      const clientIdKey = 'client_id';
      let clientId = localStorage.getItem(clientIdKey);

      if (!isAuthenticated) {
        if (!clientId) {
          clientId = generateUUID();
          localStorage.setItem(clientIdKey, clientId);
          console.log('Generated client ID:', clientId);
        }

        const { data: limitData, error: limitError } = await supabase
          .from('download_limits')
          .select('download_count')
          .eq('id', clientId)
          .eq('year_month', yearMonth)
          .eq('is_authenticated', false)
          .single();

        if (limitError && limitError.code !== 'PGRST116') {
          console.error('Fetch download_limits error:', limitError.message);
        } else if (limitData) {
          downloadCount = Math.max(downloadCount, limitData.download_count);
          localStorage.setItem(downloadKey, downloadCount.toString());
          console.log('Synced server download count:', downloadCount);
        }
      } else {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('User fetch error:', userError.message);
          throw userError;
        }
        const userId = userData.user.id;

        const { data: limitData, error: limitError } = await supabase
          .from('download_limits')
          .select('download_count')
          .eq('user_id', userId)
          .eq('year_month', yearMonth)
          .eq('is_authenticated', true)
          .single();

        if (limitError && limitError.code !== 'PGRST116') {
          console.error('Fetch download_limits error for user:', limitError.message);
        } else if (limitData) {
          downloadCount = Math.max(downloadCount, limitData.download_count);
          localStorage.setItem(downloadKey, downloadCount.toString());
          console.log('Synced server download count for user:', downloadCount);
        }
      }

      console.log('Download count before check:', downloadCount);
      const downloadsUsed = downloadCount;
      const downloadsRemaining = maxDownloads - downloadsUsed;

      if (!isAuthenticated && downloadCount >= 3) {
        setDownloadPrompt(`Download Limit Reached for ${monthName}! This resets on the 1st of every month. You’re allowed 3 downloads per month, have used ${downloadsUsed}, and have ${downloadsRemaining} remaining. Want to keep downloading? Buy us a Meat Pie ☕ to help sustain the site and enjoy unlimited access, or Just Sign up for additional downloads. Every little bit helps keep the site running! 🤗`);
        return;
      } else if (isAuthenticated) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('User fetch error:', userError.message);
          throw userError;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('has_donated')
          .eq('id', userData.user.id)
          .single();
        if (profileError) {
          console.error('Profile fetch error:', profileError.message);
          throw profileError;
        }
        console.log('Profile data:', JSON.stringify(profileData, null, 2));

        if (!profileData?.has_donated && downloadCount >= 6) {
          setDownloadPrompt(`Download Limit Reached for ${monthName}! This resets on the 1st of every month. You’re allowed 6 downloads per month, have used ${downloadsUsed}, and have ${downloadsRemaining} remaining. Want to keep downloading? Buy us a Meat Pie ☕ to help sustain the site and enjoy unlimited access, or Just Sign up for additional downloads. Every little bit helps keep the site running! 🤗`);
          return;
        }
      }

      downloadCount += 1;
      localStorage.setItem(downloadKey, downloadCount.toString());
      console.log('Download count after:', downloadCount);

      if (!isAuthenticated && clientId) {
        const { error: upsertError } = await supabase
          .from('download_limits')
          .upsert({
            id: clientId,
            download_count: downloadCount,
            year_month: yearMonth,
            is_authenticated: false,
          }, { onConflict: 'id' });
        if (upsertError) {
          console.error('Upsert download_limits error:', upsertError.message);
        } else {
          console.log('Updated server download count for anonymous user:', downloadCount);
        }
      } else if (isAuthenticated) {
        const { data: userData } = await supabase.auth.getUser();
        const { error: upsertError } = await supabase
          .from('download_limits')
          .upsert({
            id: userData.user.id,
            download_count: downloadCount,
            year_month: yearMonth,
            is_authenticated: true,
            user_id: userData.user.id,
          }, { onConflict: 'id' });
        if (upsertError) {
          console.error('Upsert download_limits error for user:', upsertError.message);
        } else {
          console.log('Updated server download count for authenticated user:', downloadCount);
        }
      }

      const numericSongId = parseInt(songId, 10);
      if (isNaN(numericSongId)) throw new Error('Invalid song ID');
      console.log('Parsed songId:', numericSongId);

      const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${songId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('File download triggered');

      const { data: songData, error: fetchError } = await supabase
        .from('songs')
        .select('id, downloads')
        .eq('id', numericSongId)
        .single();
      if (fetchError) {
        console.error('Fetch error:', fetchError.message);
        throw fetchError;
      }
      const currentDownloads = songData.downloads || 0;
      console.log('Downloads before update:', currentDownloads);

      const { data: newDownloads, error: updateError } = await supabase
        .rpc('update_song_downloads', { p_song_id: numericSongId });
      if (updateError) {
        console.error('RPC update error:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }
      console.log('New downloads value from RPC:', newDownloads);

      const { data: updatedSong, error: postUpdateFetchError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink')
        .eq('id', numericSongId)
        .single();
      if (postUpdateFetchError) {
        console.error('Post-update fetch error:', postUpdateFetchError.message);
        throw postUpdateFetchError;
      }
      console.log('Fetched song after update:', JSON.stringify(updatedSong, null, 2));

      const { data: updatedSongs, error: refetchError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      if (refetchError) {
        console.error('Refetch error:', refetchError.message);
        throw refetchError;
      }
      console.log('Refetched songs:', JSON.stringify(updatedSongs, null, 2));
      setSongs(updatedSongs || []);

      filterContent(searchQuery);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to download or update count: ' + err.message);
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
              placeholder="Search songs and posts..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
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
          <div className="audio-player animate-text">
            <div
              className="audio-controls"
              style={{
                backgroundColor: '#1A3C34', // Dark green
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#FFFFFF', // White
                height: '90px', // Fixed height of 90px
              }}
            >
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  fontSize: '20px',
                }}
              >
                <span role="img" aria-label="menu">
                  ≡
                </span>
              </button>
              <button
                onClick={rewind}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  fontSize: '20px',
                }}
              >
                <span role="img" aria-label="rewind">
                  ◄
                </span>
              </button>
              <button
                onClick={togglePlay}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '30px',
                  color: '#FFFFFF',
                }}
              >
                <span role="img" aria-label="play/pause">
                  {isPlaying ? '||' : '▶'}
                </span>
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  fontSize: '20px',
                }}
              >
                <span role="img" aria-label="forward">
                  ►
                </span>
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#D4A017', // Gold
                  fontSize: '20px',
                }}
              >
                <span role="img" aria-label="like">
                  ♥
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                style={{
                  width: '100px',
                  backgroundColor: '#4A7C6D', // Light green
                  cursor: 'pointer',
                  height: '20px', // Ensure range input fits within 90px height
                }}
              />
            </div>
            <audio
              ref={audioRef}
              src={songOfTheWeek}
              onError={(e) => console.error('Audio error for URL:', songOfTheWeek, 'Error:', e.target.error)}
            />
          </div>
        ) : (
          <p className="animate-text">No song selected for this week.</p>
        )}
      </section>
      {error && <p className="error-message">{error}</p>}
      <section className="latest-additions">
        <h2 className="section-title animate-text">Latest Additions</h2>
        <div className="song-grid">
          {filteredSongs.length > 0 ? (
            filteredSongs.map((song, index) => (
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
        <div style={{ textAlign: 'center', paddingTop: '20px' }}>
          <Link to="/library" className="action-button">View More Songs</Link>
        </div>
      </section>
      <hr className="section-separator" />
      <section className="blog-list-container">
        <h2 className="section-title animate-text">Latest Insights</h2>
        <div className="blog-list">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => (
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
        <div style={{ textAlign: 'center', paddingTop: '20px' }}>
          <Link to="/blog" className="action-button">View More Posts</Link>
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
            <p className="modal-text">{downloadPrompt}</p>
            <button className="meatpie-button">
              <Link to="/signup-donate" className="modal-link">Buy us a Meat Pie ☕</Link>
            </button>{' '}
            <button className="signup-button">
              <Link to="/signup" className="modal-link">Just Sign up</Link>
            </button>{' '}
            <button onClick={() => setDownloadPrompt(null)} className="cancel-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
