import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Library() {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    const fetchSongs = async () => {
      const { data: songData } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      const songsWithSize = songData.map(song => ({
        ...song,
        fileSize: 'Unknown',
      }));
      setSongs(songsWithSize || []);
    };
    fetchSongs();
  }, []);

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
        .order('created_at', { ascending: false });

      setSongs(updatedSongs.map(song => ({ ...song, fileSize: 'Unknown' })) || []);
    } catch (err) {
      console.error('Download error:', err.message);
    }
  };

  return (
    <div className="container" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#2f4f2f', marginBottom: '24px' }}>Library</h2>
      <div style={{ background: '#1a3c34', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gap: '4px' }}>
          {songs.map((song, index) => (
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
