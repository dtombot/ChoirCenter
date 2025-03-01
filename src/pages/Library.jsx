import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';
import '../styles.css';

function Library() {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
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
      setError('Failed to update download count or check profile.');
    }
  };

  const handleShare = (songTitle, songPermalink) => {
    const shareUrl = `${window.location.origin}/song/${songPermalink}`;
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

  const handleSongClick = (song) => {
    const songPath = song.permalink || song.id;
    navigate(`/song/${songPath}`);
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.composer && song.composer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalItems = filteredSongs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSongs = filteredSongs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="library-container">
      <AdBanner position="other_pages_below_header" />
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
      <div className="pagination-controls">
        <label htmlFor="itemsPerPage">Items per page:</label>
        <select
          id="itemsPerPage"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="pagination-select"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </div>
      {error && <p className="error-message">{error}</p>}
      {songs.length === 0 && !error ? (
        <p>No songs available.</p>
      ) : (
        <div className="song-grid">
          {paginatedSongs.map((song) => (
            <div
              key={song.id}
              className="song-card animate-card"
              onClick={() => handleSongClick(song)}
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
                    handleShare(song.title, song.permalink || song.id);
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
      {totalItems > itemsPerPage && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-button ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
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

export default Library;
