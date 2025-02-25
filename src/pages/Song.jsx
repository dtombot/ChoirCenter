import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useParams } from 'react-router-dom';

function Song() {
  const [song, setSong] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchSong = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('permalink', id)
        .single();
      let songData = data;
      if (error) {
        const { data: idData } = await supabase
          .from('songs')
          .select('*')
          .eq('id', id)
          .single();
        songData = idData || null;
      }
      if (songData) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${songData.google_drive_file_id}?fields=size`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const fileData = await response.json();
        const sizeInKB = fileData.size ? (fileData.size / 1024).toFixed(2) : 'Unknown';
        setSong({ ...songData, fileSize: `${sizeInKB} KB` });
      } else {
        setSong(null);
      }
    };

    const loadGoogleDrive = () => {
      const clientId = '221534643075-rhne5oov51v9ia5eefaa7nhktncihuif.apps.googleusercontent.com'; // Replace with your Client ID
      const scope = 'https://www.googleapis.com/auth/drive.file';
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth2', () => {
          window.gapi.auth2.init({
            client_id: clientId,
            scope: scope,
          }).then(() => {
            const authInstance = window.gapi.auth2.getAuthInstance();
            if (!authInstance.isSignedIn.get()) {
              authInstance.signIn().then((googleUser) => {
                setAccessToken(googleUser.getAuthResponse().access_token);
                fetchSong();
              });
            } else {
              setAccessToken(authInstance.currentUser.get().getAuthResponse().access_token);
              fetchSong();
            }
          });
        });
      };
      document.body.appendChild(script);
    };

    loadGoogleDrive();
  }, [id, accessToken]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${song.google_drive_file_id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${song.id}.pdf`;
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
      <p style={{ fontSize: '1rem', color: '#666', margin: '0.5rem 0' }}>File Size: {song.fileSize}</p>
      <button
        onClick={handleDownload}
        style={{ padding: '0.75rem 1.5rem', background: '#98fb98', color: '#2f4f2f', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: '700' }}
      >
        Download ({song.downloads || 0})
      </button>
      {song.google_drive_thumbnail_id && (
        <div style={{ margin: '1rem 0' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f' }}>Preview</h3>
          <img
            src={`https://drive.google.com/thumbnail?id=${song.google_drive_thumbnail_id}`}
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
