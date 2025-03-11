// src/pages/Song.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import AdBanner from '../components/AdBanner';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../styles.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Simple UUID generator
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
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const navigate = useNavigate();

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

    const fetchSong = async () => {
      let query = supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink, audio_url');
      
      if (/^\d+$/.test(id)) {
        query = query.eq('id', parseInt(id, 10));
      } else {
        query = query.eq('permalink', id);
      }

      const { data, error } = await query.single();
      if (error) {
        console.error('Initial song fetch error:', error.message);
        setError('Failed to load song: ' + error.message);
      } else if (!data.is_public) {
        setError('This song is private and cannot be viewed.');
      } else {
        console.log('Initial song:', JSON.stringify(data, null, 2));
        setSong(data);
        setPdfProgress(100);
      }
    };
    fetchSong();

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
  }, [id]);

  const handleDownload = async () => {
    if (!song) return;

    try {
      console.log('handleDownload started - songId:', song.id, 'fileId:', song.google_drive_file_id);

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
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink, audio_url')
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

  // PDF loading progress bar with green gradient
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
              <circle
                cx="30"
                cy="30"
                r="25"
                fill="none"
                stroke="#ccc"
                strokeWidth="4"
              />
              <circle
                cx="30"
                cy="30"
                r="25"
                fill="none"
                stroke="#333"
                strokeWidth="4"
                strokeDasharray="157"
                strokeDashoffset={157 - (157 * pdfProgress) / 100}
                style={{ transition: 'stroke-dashoffset 0.2s ease-in-out' }}
              />
            </svg>
          </div>
        ) : (
          <>
            <div className="song-card-modern">
              <h1 className="song-title-modern">{song.title}</h1>
              <p className="song-composer-modern">{song.composer || 'Unknown Composer'}</p>
              <p className="song-downloads-modern">Downloaded {song.downloads || 0} times</p>

              {/* Internet Archive Embedded Audio Player */}
              {song.audio_url && (
                <div className="song-preview-modern">
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                    Listen to an audio preview of {song.title}
                  </p>
                  <div
                    dangerouslySetInnerHTML={{ __html: song.audio_url }}
                    style={{ maxWidth: '100%' }}
                  />
                  {!song.audio_url.includes('iframe') && (
                    <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                      Audio player not displayed. Please paste a valid &lt;iframe&gt; code in the admin panel.
                    </p>
                  )}
                </div>
              )}

              {/* PDF Preview */}
              <div className="song-preview-modern">
                <Document
                  file={`/.netlify/functions/proxy-pdf?fileId=${song.google_drive_file_id}`}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) => setError('Failed to load PDF preview: ' + err.message)}
                  loading={<PdfLoadingProgress />}
                >
                  <Page pageNumber={1} scale={scale} />
                </Document>
                {numPages > 1 && (
                  <p className="preview-note-modern">Previewing page 1 of {numPages}. Download to view the full song.</p>
                )}
              </div>
              <div className="song-actions-modern">
                <button onClick={handleDownload} className="download-button-modern">Download</button>
                <button onClick={handleShare} className="share-button-modern">Share</button>
                <Link to="/library" className="back-button-modern">Back to Library</Link>
              </div>
            </div>
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
          </>
        )}
      </div>
    </>
  );
}

export default Song;
