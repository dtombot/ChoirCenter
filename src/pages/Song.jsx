import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../styles.css';

// Set up pdfjs worker (required for react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function Song() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSong = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, downloads, is_public')
        .eq('id', id)
        .single();
      if (error) {
        setError('Failed to load song: ' + error.message);
      } else if (!data.is_public) {
        setError('This song is private and cannot be viewed.');
      } else {
        setSong(data);
      }
    };
    fetchSong();
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
          setDownloadPrompt('You’ve reached the daily limit of 2 downloads. Register to download more!');
          return;
        }
        localStorage.setItem(downloadKey, downloadCount + 1);
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
      setError('Failed to update download count.');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/song/${song.id}`;
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
      <div className="song-container">
        <p className="error-message">{error}</p>
        <Link to="/library" className="action-button">Back to Library</Link>
      </div>
    );
  }

  if (!song) {
    return <div className="song-container">Loading...</div>;
  }

  const pdfUrl = `https://drive.google.com/uc?export=view&id=${song.google_drive_file_id}`;

  return (
    <div className="song-container">
      <h1 className="song-title">{song.title}</h1>
      <p className="song-composer">{song.composer || 'Unknown Composer'}</p>
      <p className="song-downloads">Downloaded {song.downloads || 0} times</p>
      <div className="song-preview">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(err) => setError('Failed to load PDF preview: ' + err.message)}
        >
          <Page pageNumber={1} width={600} />
        </Document>
        {numPages > 1 && (
          <p className="preview-note">Previewing page 1 of {numPages}. Download to view the full song.</p>
        )}
      </div>
      <div className="song-actions">
        <button onClick={handleDownload} className="download-button">Download</button>
        <button onClick={handleShare} className="share-button">Share</button>
        <Link to="/library" className="action-button">Back to Library</Link>
      </div>
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

export default Song;
