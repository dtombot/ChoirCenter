import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import AdBanner from '../components/AdBanner';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../styles.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

function Song() {
  const { id } = useParams();
  const cleanId = id.split(':')[0].toLowerCase();
  const [song, setSong] = useState(null);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [hasDonated, setHasDonated] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const audioRef = useRef(null);
  
  let navigate;
  try {
    navigate = useNavigate();
  } catch (err) {
    console.error('useNavigate failed:', err);
    navigate = (path) => console.log('Navigation blocked:', path);
  }

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
    const thumbnailUrl = song.google_drive_file_id
      ? `https://drive.google.com/thumbnail?id=${song.google_drive_file_id}`
      : 'https://choircenter.com/path-to-default-image.jpg';
    ogImage.content = thumbnailUrl;
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
    twitterImage.content = thumbnailUrl;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = `${window.location.origin}/song/${song.permalink || song.id}`;
  };

  useEffect(() => {
    let interval;
    if (!song) {
      interval = setInterval(() => {
        setPdfProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);
    }
    const fetchSongAndRelated = async () => {
      let query = supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink, audio_url, description, created_at');
      if (/^\d+$/.test(cleanId)) {
        query = query.eq('id', parseInt(cleanId, 10));
      } else {
        query = query.eq('permalink', cleanId);
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
        console.log('Initial song:', JSON.stringify(songData, null, 2));
        setSong(songData);
        setSongMetaTags(songData);
        setPdfProgress(100);
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
      if (sessionError) {
        console.error('Session fetch error:', sessionError.message);
        setIsAuthenticated(false);
        setHasDonated(false);
        setIsAdmin(false);
        return;
      }
      const authStatus = !!sessionData?.session;
      setIsAuthenticated(authStatus);
      if (!authStatus) {
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
        .maybeSingle();
      if (profileError) {
        console.error('Profile fetch error:', profileError.message);
        setHasDonated(false);
      } else {
        setHasDonated(profileData?.has_donated || false);
      }
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userData.user.id)
        .single();
      setIsAdmin(!!adminData && !adminError);
    };
    fetchSongAndRelated();
    const updateScale = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setScale(0.5);
      } else if (width <= 768) {
        setScale(0.75);
      } else {
        setScale(1.0);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateScale);
    };
  }, [cleanId]);

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

  const togglePlay = () => {
    if (audioRef.current) {
      console.log('Attempting to play audio from URL:', audioRef.current.src);
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
      console.log('Rewinding audio from URL:', audioRef.current.src);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error('Play failed for URL:', audioRef.current.src, 'Error:', err.message);
        setError(`Failed to play audio. Check the URL (${audioRef.current.src}) or browser console for details.`);
      });
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!song) return;
    try {
      console.log('handleDownload started - songId:', song.id, 'fileId:', song.google_drive_file_id);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session fetch error:', sessionError.message);
        throw sessionError;
      }
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
          .maybeSingle();
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
          .maybeSingle();
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
        setDownloadPrompt({
          message: `Download Limit Reached for ${monthName}! This resets on the 1st of every month. You’re allowed 3 downloads per month, have used ${downloadsUsed}, and have ${downloadsRemaining} remaining. Want to keep downloading? Buy us a Meat Pie ☕ to gain unlimited access to Choir Center!`,
          redirect: '/signup-donate'
        });
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
          .maybeSingle();
        if (profileError) {
          console.error('Profile fetch error:', profileError.message);
          if (downloadCount >= 6) {
            setDownloadPrompt({
              message: `Download Limit Reached for ${monthName}! This resets on the 1st of every month. You’re allowed 6 downloads per month, have used ${downloadsUsed}, and have ${downloadsRemaining} remaining. Buy us a Meat Pie ☕ to gain unlimited access to Choir Center!`,
              redirect: '/donate'
            });
            return;
          }
        } else if (!profileData?.has_donated && downloadCount >= 6) {
          setDownloadPrompt({
            message: `Download Limit Reached for ${monthName}! This resets on the 1st of every month. You’re allowed 6 downloads per month, have used ${downloadsUsed}, and have ${downloadsRemaining} remaining. Buy us a Meat Pie ☕ to gain unlimited access to Choir Center!`,
            redirect: '/donate'
          });
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
      const numericSongId = parseInt(song.id, 10);
      if (isNaN(numericSongId)) throw new Error('Invalid song ID');
      console.log('Parsed song ID:', numericSongId);
      const url = `https://drive.google.com/uc?export=download&id=${song.google_drive_file_id}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${song.id}.pdf`;
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
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink, audio_url, description, created_at')
        .eq('id', numericSongId)
        .single();
      if (postUpdateFetchError) {
        console.error('Post-update fetch error:', postUpdateFetchError.message);
        throw postUpdateFetchError;
      }
      console.log('Fetched song after update:', JSON.stringify(updatedSong, null, 2));
      setSong(updatedSong);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to download or update count: ' + err.message);
    }
  };

  const handleAudioDownload = async () => {
    if (!song || !song.audio_url) return;
    if (hasDonated) {
      const link = document.createElement('a');
      link.href = song.audio_url;
      link.download = `${song.title}-${song.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        setShowAudioPrompt('not_logged_in');
      } else {
        setShowAudioPrompt('logged_in_no_donation');
      }
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

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const PdfLoadingProgress = () => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);
      return () => clearInterval(interval);
    }, []);
    return (
      <div style={{ width: '100%', height: '20px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #90EE90 0%, #32CD32 50%, #006400 100%)',
            transition: 'width 0.2s ease-in-out',
          }}
        />
      </div>
    );
  };

  if (!song && !error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="25" fill="none" stroke="#ccc" strokeWidth="4" />
          <circle cx="30" cy="30" r="25" fill="none" stroke="#333" strokeWidth="4" strokeDasharray="157" strokeDashoffset={157 - (157 * pdfProgress) / 100} style={{ transition: 'stroke-dashoffset 0.2s ease-in-out' }} />
        </svg>
      </div>
    );
  }

  const thumbnailUrl = song?.google_drive_file_id
    ? `https://drive.google.com/thumbnail?id=${song.google_drive_file_id}&sz=s500`
    : null;

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
        ) : (
          <div className="song-card-modern">
            <div className="song-info-container" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <h1 className="song-title-modern">{song.title}</h1>
              <p className="song-composer-modern">{song.composer || 'Unknown Composer'}</p>
              <p className="song-downloads-modern">Downloaded {song.downloads || 0} times</p>
              <p className="song-timestamp-modern">Added on {new Date(song.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>

            {song.audio_url && (
              <div className="audio-preview-container" style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  Listen to an audio preview and {song.title} mp3 download
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
                  <audio
                    ref={audioRef}
                    src={song.audio_url}
                    onError={(e) => console.error('Audio error for URL:', song.audio_url, 'Error:', e.target.error)}
                  />
                </div>
                <button onClick={handleAudioDownload} className="download-button-modern audio-download-button">
                  Download Audio
                </button>
                {!song.audio_url.includes('.mp3') && !song.audio_url.includes('.wav') && (
                  <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                    Audio player not displayed. Please use a direct audio file URL (e.g., .mp3) in the admin panel.
                  </p>
                )}
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

            <div className="pdf-preview-container" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {thumbnailUrl && !thumbnailError ? (
                <img
                  src={thumbnailUrl}
                  alt={`Preview of ${song.title}`}
                  className="song-preview-image"
                  onError={() => setThumbnailError(true)}
                  style={{ display: 'block', margin: '0 auto' }}
                />
              ) : (
                <Document
                  file={`/.netlify/functions/proxy-pdf?fileId=${song.google_drive_file_id}`}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) => setError('Failed to load PDF preview: ' + err.message)}
                  loading={<PdfLoadingProgress />}
                >
                  <Page pageNumber={1} scale={scale} style={{ display: 'block', margin: '0 auto' }} />
                </Document>
              )}
              <p className="preview-note-modern" style={{ textAlign: 'center' }}>
                Previewing page 1{numPages && thumbnailError ? ` of ${numPages}` : ''}. Click the Download button to view the full song.
              </p>
            </div>

            <div className="song-actions-container song-actions-modern" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={handleDownload} className="download-button-modern">Download</button>
              <button onClick={handleShare} className="share-button-modern">Share</button>
              <Link to="/library" className="back-button-modern">Back to Library</Link>
              {isAdmin && (
                <button
                  onClick={() => navigate(`/admin?tab=songs&editSongId=${song.id}`)}
                  className="download-button-modern"
                >
                  Edit Song
                </button>
              )}
            </div>

            {relatedSongs.length > 0 && (
              <div className="explore-songs-container" style={{ marginTop: '2rem', background: '#f9fafb', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center', color: '#2f4f2f' }}>Explore More Songs</h2>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
                  {relatedSongs.map((relatedSong) => (
                    <li key={relatedSong.id} style={{ background: '#fff', padding: '1rem', borderRadius: '8px', transition: 'transform 0.3s ease' }} className="animate-scale">
                      <Link
                        to={`/song/${relatedSong.permalink || relatedSong.id}`}
                        className="song-link"
                        style={{ color: '#2f4f2f', textDecoration: 'none', fontWeight: '500' }}
                      >
                        {relatedSong.title} {relatedSong.composer || 'Unknown Composer'}
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginTop: '0.25rem' }}>
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
                  <p className="modal-text">{downloadPrompt.message}</p>
                  <button className="meatpie-button">
                    <Link to={downloadPrompt.redirect} className="modal-link">Buy us a Meat Pie ☕</Link>
                  </button>{' '}
                  {!isAuthenticated && (
                    <button className="signup-button">
                      <Link to="/signup" className="modal-link">Just Sign Up</Link>
                    </button>
                  )}{' '}
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

            {showAudioPrompt && (
              <div className="modal-overlay">
                <div className="modal-content download-modal">
                  <h3 className="modal-title">Support Choir Center</h3>
                  <p className="modal-text">
                    {showAudioPrompt === 'logged_in_no_donation'
                      ? 'You’re logged in! To download this audio and enjoy unlimited access, please support us with a small donation (Buy us a Meat Pie ☕). Every contribution helps keep Choir Center running!'
                      : 'To download this audio and gain unlimited access to Choir Center, please sign up and support us by buying a Meat Pie ☕. Your contribution helps sustain the site!'}
                  </p>
                  <button className="meatpie-button">
                    <Link
                      to={showAudioPrompt === 'logged_in_no_donation' ? '/donate' : '/signup-donate'}
                      className="modal-link"
                    >
                      {showAudioPrompt === 'logged_in_no_donation' ? 'Donate Now' : 'Sign Up & Donate'}
                    </Link>
                  </button>{' '}
                  <button onClick={() => setShowAudioPrompt(false)} className="cancel-button">Cancel</button>
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
