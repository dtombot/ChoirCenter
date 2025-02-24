import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

function Library() {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    const fetchSongs = async () => {
      const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
      setSongs(data || []);
    };
    fetchSongs();
  }, []);

  return (
    <div className="container">
      <input type="text" placeholder="Search songs..." style={{ padding: '0.5rem', width: '100%', maxWidth: '400px', marginBottom: '1rem' }} />
      <div style={{ margin: '1rem 0' }}>
        <select style={{ padding: '0.5rem' }}>
          <option>All Categories</option>
          <option>Hymns</option>
          <option>Gospel</option>
        </select>
      </div>
      {songs.map(song => (
        <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', background: '#fff', padding: '1rem', borderRadius: '5px' }}>
          <span>{song.title} (Views: {song.views}, Downloads: {song.downloads})</span>
          <div>
            <button style={{ marginRight: '0.5rem' }}>Preview</button>
            <button>Download</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Library;
