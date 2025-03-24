import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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

function Library() {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize from sessionStorage or location.state, fallback to 1
    const savedPage = sessionStorage.getItem('currentPage-/library');
    const locationState = useLocation().state || {};
    return parseInt(savedPage, 10) || locationState.currentPage || 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchSongs = async () => {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads, created_at')
        .order(sortBy, { ascending: sortOrder === 'asc' });
      if (songError) {
        console.error('Initial song fetch error:', songError.message);
        setError('Failed to load songs.');
      } else {
        console.log('Initial songs:', JSON.stringify(songData, null, 2));
        setSongs(songData || []);
      }
    };
    fetchSongs();
  }, [sortBy, sortOrder]);

  // Scroll handling: only scroll to top for pagination changes, not back navigation
  useEffect(() => {
    const isBackNavigation = sessionStorage.getItem(`scrollPosition-${location.pathname}`) !== null;
    if (!isBackNavigation) {
      window.scrollTo(0, 0);
    }
  }, [currentPage, location.pathname]);

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
      console.log('Parsed song ID:', numericSongId);

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
        .select('id, title, composer, google_drive_file_id, downloads, is_public, permalink, created_at')
        .eq('id', numericSongId)
        .single();
      if (postUpdateFetchError) {
        console.error('Post-update fetch error:', postUpdateFetchError.message);
        throw postUpdateFetchError;
      }
      console.log('Fetched song after update:', JSON.stringify(updatedSong, null, 2));

      const { data: updatedSongs, error: refetchError } = await supabase
        .from('songs')
        .select('id, title, composer, google_drive_file_id, permalink, is_public, downloads, created_at')
        .order(sortBy, { ascending: sortOrder === 'asc' });
      if (refetchError) {
        console.error('Refetch error:', refetchError.message);
        throw refetchError;
      }
      console.log('Refetched songs:', JSON.stringify(updatedSongs, null, 2));
      setSongs(updatedSongs || []);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to download or update count: ' + err.message);
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
    // Save currentPage in navigation state and sessionStorage
    sessionStorage.setItem('currentPage-/library', currentPage.toString());
    navigate(`/song/${songPath}`, { state: { currentPage } });
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

  const getPaginationRange = () => {
    const range = [];
    const maxVisiblePages = 5;
    const sideRange = 2;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      range.push(1);
      const startRange = Math.max(2, currentPage - sideRange);
      if (startRange > 2) {
        range.push('...');
      }
      for (let i = startRange; i <= Math.min(totalPages - 1, currentPage + sideRange); i++) {
        range.push(i);
      }
      const endRange = Math.min(totalPages - 1, currentPage + sideRange);
      if (endRange < totalPages - 1) {
        range.push('...');
      }
      if (totalPages > 1) {
        range.push(totalPages);
      }
    }

    return range;
  };

  const paginationRange = getPaginationRange();

  return (
    <div className="library-container">
      <section className="ad-section">
        <AdBanner position="other_pages_below_header" />
      </section>
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
      {totalItems > itemsPerPage && (
        <div className="pagination-top">
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
          <div className="pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            {paginationRange.map((item, index) => (
              item === '...' ? (
                <span key={index} className="pagination-ellipsis">...</span>
              ) : (
                <button
                  key={index}
                  onClick={() => handlePageChange(item)}
                  className={`pagination-button ${currentPage === item ? 'active' : ''}`}
                >
                  {item}
                </button>
              )
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {error && <p className="error-message">{error}</p>}
      {songs.length === 0 && !error ? (
        <p>No songs available.</p>
      ) : (
        <div className="song-grid">
          {paginatedSongs.map((song, index) => (
            <div
              key={song.id}
              className={`song-card-modern ${index % 2 === 0 ? 'variant-1' : 'variant-2'}`}
              onClick={() => handleSongClick(song)}
            >
              <div className="song-card-content">
                <h2 className="song-card-title-modern">{song.title}</h2>
                <p className="song-card-composer-modern">{song.composer || 'Unknown Composer'}</p>
                <p className="song-card-downloads-modern">Downloaded {song.downloads || 0} times</p>
                <p className="song-timestamp-modern">
                  Added on {new Date(song.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="song-card-actions-modern">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(song.id, song.google_drive_file_id);
                  }}
                  className="download-button-modern"
                >
                  Download
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(song.title, song.permalink || song.id);
                  }}
                  className="share-button-modern"
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {totalItems > itemsPerPage && (
        <div className="pagination-bottom">
          <div className="pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            {paginationRange.map((item, index) => (
              item === '...' ? (
                <span key={index} className="pagination-ellipsis">...</span>
              ) : (
                <button
                  key={index}
                  onClick={() => handlePageChange(item)}
                  className={`pagination-button ${currentPage === item ? 'active' : ''}`}
                >
                  {item}
                </button>
              )
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
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
    </div>
  );
}

export default Library;
