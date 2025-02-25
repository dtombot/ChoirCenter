import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Library() {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchSongs = async () => {
      const { data: songData } = await supabase
        .from('songs')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

      const songsWithSize = songData.map(song => ({
        ...song,
        fileSize: 'Unknown',
      }));
      setSongs(songsWithSize || []);
    };
    fetchSongs();
  }, [sortBy, sortOrder]);

  const handleDownload = async (songId, fileId) => {
    try {
      const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${songId}.pdf`;
      link.click();

      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: songs.find(s => s.id === songId).downloads + 1 })
        .eq('id', songId);
      if (updateError) throw updateError;

      const { data: updatedSongs } = await supabase
        .from('songs')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

      setSongs(updatedSongs.map(song => ({ ...song, fileSize: 'Unknown' })) || []);
    } catch (err) {
      console.error('Download error:', err.message);
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
    </div>
  );
}

export default Library;
