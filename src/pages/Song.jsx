import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useParams } from 'react-router-dom';

function Song() {
  const [song, setSong] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchSong = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('permalink', id)
        .single();
      if (error) {
        const { data: idData } = await supabase
          .from('songs')
          .select('*')
          .eq('id', id)
          .single();
        setSong(idData || null);
      } else {
        setSong(data);
      }
    };
    fetchSong();
  }, [id]);

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage.from('songs').download(song.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      const originalName = song.file_path.split('/').pop();
      link.download = `choircenter.com-${originalName}`;
      link.click();
      URL.revokeObjectURL(url);

      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: (song.downloads || 0) + 1 })
        .eq('id', song.id);
      if (updateError) throw updateError;

      setSong({ ...song, downloads: (song.downloads || 0) + 1 });
    } catch (err) {
      console.error('Download error:', err.message);
    }
  };

  if (!song) return <div>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f' }}>{song.title}</h1>
      <p style={{ fontSize: '1rem', color: '#666', margin: '1rem 0' }}>{song.description || 'No description'}</p>
      <button
        onClick={handleDownload}
        style={{ padding: '0.75rem 1.5rem', background: '#98fb98', color: '#2f4f2f', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: '700' }}
      >
        Download ({song.downloads || 0})
      </button>
      {song.thumbnail && (
        <div style={{ margin: '1rem 0' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f' }}>Preview</h3>
          <img
            src={supabase.storage.from('songs').getPublicUrl(song.thumbnail).data.publicUrl}
            alt={`${song.title} preview`}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '5px' }}
          />
        </div>
      )}
      {song.lyrics && (
        <div style={{ margin: '1rem 0' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f' }}>Lyrics</h3>
          <pre style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-wrap' }}>{song.lyrics}</pre>
        </div>
      )}
    </div>
  );
}

export default Song;
