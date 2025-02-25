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
    <div className="container" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#2f4f2f', marginBottom: '16px' }}>Library</h2>
      <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search library..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '10px 16px', width: '100%', maxWidth: '300px', border: '1px solid #ccc', borderRadius: '25px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: '25px', border: '1px solid #ccc', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
        >
          <option value="created_at">Sort by Date</option>
          <option value="downloads">Sort by Downloads</option>
          <option value="title">Sort by Title</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: '25px', border: '1px solid #ccc', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
      {error && <p style={{ color: '#e63946', marginBottom: '1rem' }}>{error}</p>}
      {songs.length === 0 && !error ? (
        <p>No songs available.</p>
      ) : (
        <div style={{ background: '#1a3c34', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gap: '4px' }}>
            {filteredSongs.map((song, index) => (
              <Link
                to={`/song/${song.permalink || song.id}`}
                key={song.id}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    background: index % 2 === 0 ? '#2f4f2f' : '#1a3c34',
                    color: '#fff',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer',
                    minHeight: '56px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3cb371')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? '#2f4f2f' : '#1a3c34')}
                >
                  <span style={{ width: '40px', textAlign: 'right', marginRight: '16px', color: '#98fb98', fontSize: '14px', fontWeight: '400' }}>{index + 1}</span>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0, lineHeight: '20px' }}>{song.title}</h4>
                    <p style={{ fontSize: '14px', color: '#98fb98', margin: 0, lineHeight: '18px' }}>{song.description || 'No description'}</p>
                  </div>
                  <span style={{ marginRight: '16px', color: '#98fb98', fontSize: '14px', fontWeight: '400' }}>{song.fileSize}</span>
                  <span style={{ marginRight: '16px', color: '#98fb98', fontSize: '14px', fontWeight: '400' }}>{song.downloads || 0}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownload(song.id, song.google_drive_file_id);
                    }}
                    style={{
                      padding: '6px 16px',
                      background: '#98fb98',
                      color: '#2f4f2f',
                      border: 'none',
                      borderRadius: '24px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '700',
                      lineHeight: '20px',
                      minWidth: '80px',
                      textAlign: 'center',
                    }}
                  >
                    Download
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Download Limit Modal */}
      {downloadPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1rem' }}>Download Limit Reached</h3>
            <p style={{ fontSize: '1rem', color: '#333', marginBottom: '1.5rem' }}>
              {downloadPrompt} <Link to="/login" style={{ color: '#3cb371', textDecoration: 'underline' }}>Log in here</Link>.
            </p>
            <button
              onClick={() => setDownloadPrompt(null)}
              style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Library;
