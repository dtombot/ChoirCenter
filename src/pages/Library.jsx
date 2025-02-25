import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Library() {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);

  useEffect(() => {
    const fetchSongs = async () => {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });
      if (songError) {
        console.error('Song fetch error:', songError.message);
        setError('Failed to load songs.');
      } else {
        const songsWithSize = songData.map(song => ({
          ...song,
          fileSize: 'Unknown',
        }));
        setSongs(songsWithSize || []);
      }
    };
    fetchSongs();
  }, [sortBy, sortOrder]);

  const handleDownload = async (songId, fileId) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const isAuthenticated = userData?.user && !userError;

      if (!isAuthenticated) {
        const downloadCount = parseInt(localStorage.getItem('downloadCount') || '0', 10);
        if (downloadCount >= 5) {
          setDownloadPrompt('You’ve reached the limit of 5 downloads. Please log in to download more.');
          return;
        }
        localStorage.setItem('downloadCount', downloadCount + 1);
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
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });
      setSongs(updatedSongs.map(song => ({ ...song, fileSize: 'Unknown' })) || []);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to update download count.');
    }
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.description && song.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container">
      <h2 className="section-title">Library</h2>
      <div className="filter-bar">
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
      </div>
      {error && <p className="error-message">{error}</p>}
      {songs.length === 0 && !error ? (
        <p>No songs available.</p>
      ) : (
        <div className="song-list-container">
          <div className="song-list">
            {filteredSongs.map((song, index) => (
              <Link to={`/song/${song.permalink || song.id}`} key={song.id} className="song-item">
                <span className="song-number">{index + 1}</span>
                <div className="song-info">
                  <h4 className="song-title">{song.title}</h4>
                  <p className="song-description">{song.description || 'No description'}</p>
                </div>
                <span className="song-size">{song.fileSize}</span>
                <span className="song-downloads">{song.downloads || 0}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownload(song.id, song.google_drive_file_id);
                  }}
                  className="download-button"
                >
                  Download
                </button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {downloadPrompt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Download Limit Reached</h3>
            <p className="modal-text">
              {downloadPrompt} <Link to="/login" className="modal-link">Log in here</Link>.
            </p>
            <button onClick={() => setDownloadPrompt(null)} className="cancel-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Library;
