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
        setError('Failed to load song: ' + error.message);
      } else if (!data.is_public) {
        setError('This song is private and cannot be viewed.');
      } else {
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const isAuthenticated = userData?.user && !userError;

      if (!isAuthenticated) {
        const today = new Date().toDateString();
        const downloadKey = `downloads_${today}`;
        const downloadCount = parseInt(localStorage.getItem(downloadKey) || '0', 10);
        if (downloadCount >= 2) {
          setDownloadPrompt('Download Limit Reached.\nWant to keep downloading? Buy us a Meat Pie☕ to help sustain the site and enjoy unlimited access, or Just Sign up for additional downloads. Every little bit helps keep the site running! 🤗');
          return;
        }
        localStorage.setItem(downloadKey, downloadCount + 1);
      } else {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('has_donated')
          .eq('id', userData.user.id)
          .single();
        if (profileError) throw profileError;

        if (!profileData?.has_donated) {
          const today = new Date().toDateString();
          const downloadKey = `downloads_${today}`;
          const downloadCount = parseInt(localStorage.getItem(downloadKey) || '0', 10);
          if (downloadCount >= 5) {
            setDownloadPrompt('Download Limit Reached.\nWant to keep downloading? Buy us a Meat Pie☕ to help sustain the site and enjoy unlimited access. Every little bit helps keep the site running! 🤗');
            return;
          }
          localStorage.setItem(downloadKey, downloadCount + 1);
        }
      }

      const url = `https://drive.google.com/uc?export=download&id=${song.google_drive_file_id}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${song.id}.pdf`;
      link.click();

      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: (song.downloads || 0) + 1 })
        .eq('id', song.id);
      if (updateError) throw updateError;

      setSong({ ...song, downloads: (song.downloads || 0) + 1 });
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to update download count or check profile.');
    }
  };

  const handleShare = () => {
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

  if (error) {
    return (
      <>
        <AdBanner position="song_page_below_header" />
        <div className="song-container">
          <p className="error-message">{error}</p>
          <Link to="/library" className="action-button">Back to Library</Link>
        </div>
      </>
    );
  }

  if (!song) {
    return (
      <>
        <AdBanner position="song_page_below_header" />
        <div className="song-container">
          <div>Loading...</div>
        </div>
      </>
    );
  }

  const pdfUrl = `/.netlify/functions/proxy-pdf?fileId=${song.google_drive_file_id}`;

  return (
    <>
      <AdBanner position="song_page_below_header" />
      <div className="song-container">
        <div className="song-card-modern">
          <h1 className="song-title-modern">{song.title}</h1>
          <p className="song-composer-modern">{song.composer || 'Unknown Composer'}</p>
          <p className="song-downloads-modern">Downloaded {song.downloads || 0} times</p>
          <div className="song-preview-modern">
            <Document
              file={pdfUrl}
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
      </div>
    </>
  );
}

export default Song;
