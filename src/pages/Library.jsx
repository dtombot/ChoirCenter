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

      const songsWithSize = await Promise.all(
        songData.map(async (song) => {
          const { data: fileData, error } = await supabase.storage
            .from('songs')
            .list('', { search: song.file_path.split('/').pop() });
          if (!error && fileData && fileData.length > 0) {
            const sizeInKB = (fileData[0].metadata.size / 1024).toFixed(2);
            return { ...song, fileSize: `${sizeInKB} KB` };
          }
          return { ...song, fileSize: 'Unknown' };
        })
      );

      setSongs(songsWithSize || []);
    };
    fetchSongs();
  }, []);

  const handleDownload = async (songId, filePath) => {
    try {
      const { data, error } = await supabase.storage.from('songs').download(filePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      const originalName = filePath.split('/').pop();
      link.download = `choircenter.com-${originalName}`;
      link.click();
      URL.revokeObjectURL(url);

      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: songs.find(s => s.id === songId).downloads + 1 })
        .eq('id', songId);
      if (updateError) throw updateError;

      const { data: updatedSongs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      const songsWithSize = await Promise.all(
        updatedSongs.map(async (song) => {
          const { data: fileData, error } = await supabase.storage
            .from('songs')
            .list('', { search: song.file_path.split('/').pop() });
          if (!error && fileData && fileData.length > 0) {
            const sizeInKB = (fileData[0].metadata.size / 1024).toFixed(2);
            return { ...song, fileSize: `${sizeInKB} KB` };
          }
          return { ...song, fileSize: 'Unknown' };
        })
      );

      setSongs(songsWithSize || []);
    } catch (err) {
      console.error('Download error:', err.message);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1rem' }}>Library</h2>
      <div style={{ background: '#1a3c34', padding: '1rem', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
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
                  padding: '0.75rem',
                  background: index % 2 === 0 ? '#2f4f2f' : '#1a3c34
