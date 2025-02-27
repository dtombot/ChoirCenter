import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

function Library() {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSongs = async () => {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads')
        .order(sortBy, { ascending: sortOrder === 'asc' });
      if (songError) {
        console.error('Song fetch error:', songError.message);
        setError('Failed to load songs.');
      } else {
        setSongs(songData || []);
      }
    };
    fetchSongs();
  }, [sortBy, sortOrder]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const honeypot = e.target.elements.honeypot.value;
    if (honeypot) {
      setError('Spam detected');
      return;
    }
    // Filter logic already handled by useEffect and state
  };

  const handleDownload = async (songId, fileId) => {
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
        .order(sortBy, { ascending: sortOrder === 'asc' });
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

  const handleSongClick = (id) => {
    navigate(`/song/${id}`);
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.composer && song.composer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="library-container">
      <h1 className="library-title animate-text">Song Library</h1>
      <p className="library-description">Explore our extensive collection of free choir sheet music, available for download and sharing. Sort and search to find the perfect pieces for your choir.</p>
      <form onSubmit={handleFilterSubmit} className="filter-bar">
        <input
          type="text"
          placeholder="Search library..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-input"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="filter-select"
        >
          <option value="created_at">Sort by Date</option>
          <option value="downloads">Sort by Downloads</option>
          <option value="title">Sort by Title</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="filter-select"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <input type="text" name="honeypot" className="honeypot" />
      </form>
      {error && <p className="error-message">{error}</p>}
      {songs.length === 0 && !error ? (
        <p>No songs available.</p>
      ) : (
        <div className="song-grid">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              className="song-card animate-card"
              onClick={() => handleSongClick(song.id)}
            >
              <div className="song-card-content">
                <h2 className="song-card-title">{song.title}</h2>
                <p className="song-card-composer">{song.composer || 'Unknown Composer'}</p>
                <p className="song-card-downloads">Downloaded {song.downloads || 0} times</p>
              </div>
              <div className="song-card-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(song.id, song.google_drive_file_id);
                  }}
                  className="download-button"
                >
                  Download
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(song.title, song.id);
                  }}
                  className="share-button"
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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

export default Library;
