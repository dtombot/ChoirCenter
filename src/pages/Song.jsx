import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';
import '../styles.css';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

function Song() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  const setSongMetaTags = (song) => {
    document.title = `${song.title} ${song.composer || 'Unknown Composer'} | Choir Center`;
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = `Download and view the sheet music for ${song.title} ${song.composer || 'Unknown Composer'}.`;
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.property = "og:title";
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = song.title;
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.property = "og:description";
      document.head.appendChild(ogDescription);
    }
    ogDescription.content = `Download and view the sheet music for ${song.title} ${song.composer || 'Unknown Composer'}.`;
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.property = "og:url";
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = window.location.href;
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.property = "og:image";
      document.head.appendChild(ogImage);
    }
    ogImage.content = 'https://choircenter.com/path-to-default-image.jpg';
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.name = "twitter:title";
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.content = song.title;
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (!twitterDescription) {
      twitterDescription = document.createElement('meta');
      twitterDescription.name = "twitter:description";
      document.head.appendChild(twitterDescription);
    }
    twitterDescription.content = `Download and view the sheet music for ${song.title} ${song.composer || 'Unknown Composer'}.`;
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.name = "twitter:image";
      document.head.appendChild(twitterImage);
    }
    twitterImage.content = 'https://choircenter.com/path-to-default-image.jpg';
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = `${window.location.origin}/song/${song.permalink || song.id}`;
  };

  useEffect(() => {
    const fetchSongAndRelated = async () => {
      let query = supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink, audio_url, description, created_at');
      if (/^\d+$/.test(id)) {
        query = query.eq('id', parseInt(id, 10));
      } else {
        query = query.eq('permalink', id);
      }
      const { data: songData, error: songError } = await query.single();
      if (songError) {
        console.error('Initial song fetch error:', songError.message);
        setError('Failed to load song: ' + songError.message);
        document.title = 'Error | Choir Center';
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.name = "description";
          document.head.appendChild(metaDescription);
        }
        metaDescription.content = "An error occurred while loading the song.";
      } else if (!songData.is_public) {
        setError('This song is private and cannot be viewed.');
        document.title = 'Private Song | Choir Center';
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.name = "description";
          document.head.appendChild(metaDescription);
        }
        metaDescription.content = "This song is private and cannot be viewed.";
      } else {
        setSong(songData);
        setSongMetaTags(songData);

        // Fetch page count from Netlify function
        fetch(`/.netlify/functions/get-pdf-page-count?fileId=${songData.google_drive_file_id}`)
          .then(res => res.json())
          .then(data => setNumPages(data.pageCount || null))
          .catch(err => {
            console.error('Page count fetch error:', err);
            setNumPages(null);
          });

        const { data: relatedData, error: relatedError } = await supabase
          .from('songs')
          .select('id, title, composer, permalink, created_at')
          .eq('is_public', true)
          .neq('id', songData.id)
          .or(`composer.eq.${songData.composer},composer.is.null`)
          .order('downloads', { ascending: false })
          .limit(5);
        if (relatedError) {
          console.error('Related songs fetch error:', relatedError.message);
        } else {
          setRelatedSongs(relatedData);
        }
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        setHasDonated(false);
        setIsAdmin(false);
        return;
      }
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('User fetch error:', userError.message);
        setHasDonated(false);
        setIsAdmin(false);
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('has_donated')
        .eq('id', userData.user.id)
        .single();
      if (profileError) {
        console.error('Profile fetch error:', profileError.message);
        setHasDonated(false);
      } else {
        setHasDonated(profileData.has_donated || false);
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userData.user.id)
        .single();
      setIsAdmin(!!adminData && !adminError);
    };
    fetchSongAndRelated();
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const updateProgress = () => {
        if (audio.duration) {
          const progressValue = (audio.currentTime / audio.duration) * 100;
          setProgress(progressValue);
        }
      };
      audio.addEventListener('timeupdate', updateProgress);
      return () => audio.removeEventListener('timeupdate', updateProgress);
    }
  }, [song]);

  const togglePlay = async () => {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error || !sessionData?.session) {
      setShowLoginPrompt(true);
      return;
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error('Play failed:', err.message);
          setError('Failed to play audio: ' + err.message);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const rewind = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error('Play failed:', err.message);
        setError('Failed to play audio: ' + err.message);
      });
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!song) return;
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const isAuthenticated = !!sessionData?.session;
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
        }
      } else {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const userId = userData.user.id;
        const { data: limitData, error: limitError } = await supabase
          .from('download_limits')
          .select('download_count')
          .eq('user_id', userId)
          .eq('year_month', yearMonth)
          .eq('is_authenticated', true)
          .single();
        if (limitError && limitError.code !== 'PGRST116') {
          console.error('Fetch download_limits error:', limitError.message);
        } else if (limitData) {
          downloadCount = Math.max(downloadCount, limitData.download_count);
          localStorage.setItem(downloadKey, downloadCount.toString());
        }
      }
      const downloadsUsed = downloadCount;
      const downloadsRemaining = maxDownloads - downloadsUsed;
      if (!isAuthenticated && downloadCount >= 3) {
        setDownloadPrompt(`Download Limit Reached for ${monthName}! This resets on the 1st of every month. You’re allowed 3 downloads per month, have used ${downloadsUsed}, and have ${downloadsRemaining} remaining. Want to keep downloading? Buy us a Meat Pie ☕ to help sustain the site and enjoy unlimited access, or Just Sign up for additional downloads. Every little bit helps keep the site running! 🤗`);
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
        if (!profileData?.has_donated && downloadCount >= 6) {
          setDownloadPrompt(`Download Limit Reached for ${monthName}! This resets on the 1st of every month. You’re allowed 6 downloads per month, have used ${downloadsUsed}, and have ${downloadsRemaining} remaining. Want to keep downloading? Buy us a Meat Pie ☕ to help sustain the site and enjoy unlimited access, or Just Sign up for additional downloads. Every little bit helps keep the site running! 🤗`);
          return;
        }
      }
      downloadCount += 1;
      localStorage.setItem(downloadKey, downloadCount.toString());
      if (!isAuthenticated && clientId) {
        const { error: upsertError } = await supabase
          .from('download_limits')
          .upsert({
            id: clientId,
            download_count: downloadCount,
            year_month: yearMonth,
            is_authenticated: false,
          }, { onConflict: 'id' });
        if (upsertError) console.error('Upsert error:', upsertError.message);
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
        if (upsertError) console.error('Upsert error:', upsertError.message);
      }
      const url = `https://drive.google.com/uc?export=download&id=${song.google_drive_file_id}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${song.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      const numericSongId = parseInt(song.id, 10) || song.id;
      const { data: songData, error: fetchError } = await supabase
        .from('songs')
        .select('id, downloads')
        .eq('id', numericSongId)
        .single();
      if (fetchError) throw fetchError;
      const { error: updateError } = await supabase
        .rpc('update_song_downloads', { p_song_id: numericSongId });
      if (updateError) throw updateError;
      const { data: updatedSong } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink, audio_url, description, created_at')
        .eq('id', numericSongId)
        .single();
      setSong(updatedSong);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to download or update count: ' + err.message);
    }
  };

  const handleShare = () => {
    if (!song) return;
    const shareUrl = `${window.location.origin}/song/${song.permalink || song.id}`;
    const shareText = `Check out "${song.title}" on Choir Center!`;
    if (navigator.share) {
      navigator.share({
        title: song.title,
        text: shareText,
        url: shareUrl,
      }).catch(err => console.error('Share error:', err));
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert('Link copied to clipboard! Share it manually.'))
        .catch(err => console.error('Clipboard error:', err));
    }
  };

  const [hasDonated, setHasDonated] = useState(null);

  return (
    <>
      <section className="ad-section">
        <AdBanner position="song_page_below_header" />
      </section>
      <div className="song-container">
        {error ? (
          <>
            <p className="error-message">{error}</p>
            <Link to="/library" className="action-button">Back to Library</Link>
          </>
        ) : !song ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="25" fill="none" stroke="#ccc" strokeWidth="4" />
              <circle cx="30" cy="30" r="25" fill="none" stroke="#333" strokeWidth="4" strokeDasharray="157" strokeDashoffset="157" />
            </svg>
          </div>
        ) : (
          <div className="song-card-modern">
            <h1 className="song-title-modern">{song.title}</h1>
            <p className="song-composer-modern">{song.composer || 'Unknown Composer'}</p>
            <p className="song-downloads-modern">Downloaded {song.downloads || 0} times</p>
            <p className="song-timestamp-modern">Added on {new Date(song.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

            {song.audio_url && (
              <div className="song-preview-modern">
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  Listen to an audio preview of {song.title}
                </p>
                <div className="modern-audio-player">
                  <div className="player-container">
                    <button onClick={rewind} className="player-button rewind" aria-label="Rewind song">
                      <span role="img" aria-label="rewind">⏪</span>
                    </button>
                    <button onClick={togglePlay} className="player-button play-pause" aria-label={isPlaying ? "Pause song" : "Play song"}>
                      <span role="img" aria-label="play/pause">{isPlaying ? '⏸' : '▶'}</span>
                    </button>
                    <div className="song-title-container">
                      <span className="song-title-text">{song.title}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => {
                        if (audioRef.current) {
                          const newTime = (e.target.value / 100) * audioRef.current.duration;
                          audioRef.current.currentTime = newTime;
                          setProgress(e.target.value);
                        }
                      }}
                      className="progress-bar"
                      aria-label="Audio progress"
                    />
                  </div>
                  <audio ref={audioRef} src={song.audio_url} />
                </div>
                {song.description && (
                  <div
                    style={{
                      marginTop: '1rem',
                      fontSize: '1rem',
                      color: '#333',
                      lineHeight: '1.5',
                      maxWidth: '100%',
                      overflowWrap: 'break-word',
                    }}
                    dangerouslySetInnerHTML={{ __html: song.description }}
                  />
                )}
              </div>
            )}

            <div className="song-preview-modern">
              {/* Replace iframe with a static placeholder */}
              <div
                style={{
                  width: '100%',
                  height: '500px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '1.2rem',
                  border: '1px solid #ddd',
                }}
              >
                PDF Preview Not Available<br />
                Download to view the full sheet music
              </div>
              <p className="preview-note-modern">
                Page count: {numPages !== null ? `${numPages} page${numPages === 1 ? '' : 's'}` : 'Loading...'}.{' '}
                <span onClick={handleDownload} style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
                  Download
                </span>{' '}
                to view the full song.
              </p>
            </div>

            <div className="song-actions-modern">
              <button onClick={handleDownload} className="download-button-modern">Download</button>
              <button onClick={handleShare} className="share-button-modern">Share</button>
              <Link to="/library" className="back-button-modern">Back to Library</Link>
              {isAdmin && (
                <Link to={`/admin?tab=songs&editSongId=${song.id}`} className="download-button-modern">
                  Edit Song
                </Link>
              )}
            </div>

            {relatedSongs.length > 0 && (
              <div className="related-songs" style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Explore More Songs</h2>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {relatedSongs.map((relatedSong) => (
                    <li key={relatedSong.id} style={{ marginBottom: '0.5rem' }}>
                      <Link
                        to={`/song/${relatedSong.permalink || relatedSong.id}`}
                        className="song-link"
                        style={{ color: '#007bff', textDecoration: 'none' }}
                      >
                        {relatedSong.title} {relatedSong.composer || 'Unknown Composer'}
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>
                        (Added on {new Date(relatedSong.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

            {showLoginPrompt && (
              <div className="modal-overlay">
                <div className="modal-content download-modal">
                  <h3 className="modal-title">Login Required</h3>
                  <p className="modal-text">
                    Please sign up or log in to play this song. It’s free and quick—join our choir community today! 🎶
                  </p>
                  <button className="signup-button">
                    <Link to="/signup" className="modal-link">Sign Up</Link>
                  </button>{' '}
                  <button className="signup-button">
                    <Link to="/login" className="modal-link">Log In</Link>
                  </button>{' '}
                  <button onClick={() => setShowLoginPrompt(false)} className="cancel-button">Close</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default Song;
