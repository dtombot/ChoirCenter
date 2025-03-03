import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import AdBanner from '../components/AdBanner';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../styles.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function Song() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSong = async () => {
      let query = supabase.from('songs').select('id, title, composer, google_drive_file_id, downloads, is_public, permalink');
      
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
    return () => window.removeEventListener('resize', updateScale);
  }, [id]);

  const handleDownload = async () => {
    if (!song) return;

    try {
      console.log('handleDownload started - songId:', song.id, 'fileId:', song.google_drive_file_id);

      // Step 1: Check download limits
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const isAuthenticated = !!sessionData?.session;
      console.log('Authenticated:', isAuthenticated);

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
      console.log('Download count before:', downloadCount);

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
        console.log('Profile data:', JSON.stringify(profileData, null, 2));

        if (!profileData?.has_donated && downloadCount >= 6) {
          setDownloadPrompt('Download Limit Reached.\nYou’ve used your 6 free monthly downloads. Buy us a Meat Pie ☕ for unlimited access this month! Every bit helps keep the site running! 🤗');
          return;
        }
      }
      localStorage.setItem(downloadKey, downloadCount + 1);
      console.log('Download count after:', downloadCount + 1);

      // Step 2: Trigger file download
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

      // Step 3: Fetch current downloads
      const { data: songData, error: fetchError } = await supabase
        .from('songs')
        .select('downloads')
        .eq('id', numericSongId)
        .single();
      if (fetchError) {
        console.error('Fetch error:', fetchError.message);
        throw fetchError;
      }
      const currentDownloads = songData.downloads || 0;
      console.log('Downloads before update:', currentDownloads);

      // Step 4: Update downloads using raw SQL
      const { error: sqlError } = await supabase.rpc('increment_downloads', { song_id: numericSongId });
      if (sqlError) {
        console.error('SQL update error:', JSON.stringify(sqlError, null, 2));
        throw sqlError;
      }
      console.log('SQL update successful');

      // Step 5: Refetch song to confirm update
      const { data: updatedSong, error: refetchError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink')
        .eq('id', numericSongId)
        .single();
      if (refetchError) {
        console.error('Refetch error:', refetchError.message);
        throw refetchError;
      }
      console.log('Refetched song:', JSON.stringify(updatedSong, null, 2));
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
          <div>Loading...</div>
        ) : (
          <>
            <div className="song-card-modern">
              <h1 className="song-title-modern">{song.title}</h1>
              <p className="song-composer-modern">{song.composer || 'Unknown Composer'}</p>
              <p className="song-downloads-modern">Downloaded {song.downloads || 0} times</p>
              <div className="song-preview-modern">
                <Document
                  file={`/.netlify/functions/proxy-pdf?fileId=${song.google_drive_file_id}`}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) => setError('Failed to load PDF preview: ' + err.message)}
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
          </>
        )}
      </div>
    </>
  );
}

export default Song;
