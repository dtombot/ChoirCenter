import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useParams } from 'react-router-dom';

function Song() {
  const [song, setSong] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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
      if (songData && accessToken) {
        try {
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${songData.google_drive_file_id}?fields=size`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const fileData = await response.json();
          const sizeInKB = fileData.size ? (fileData.size / 1024).toFixed(2) : 'Unknown';
          setSong({ ...songData, fileSize: `${sizeInKB} KB` });
        } catch (err) {
          console.error('Error fetching file size:', err);
          setSong({ ...songData, fileSize: 'Unknown' });
        }
      } else {
        setSong(songData);
      }
    };

    const loadGoogleIdentityServices = () => {
      console.log('Starting Google Identity Services authentication...');
      const clientId = '221534643075-rhne5oov51v9ia5eefaa7nhktncihuif.apps.googleusercontent.com';
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        console.log('Google Identity Services script loaded.');
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response) => {
            if (response.error) {
              console.error('Token request failed:', response.error, response.error_description);
              setAuthError(`Authentication failed: ${response.error_description || response.error}`);
            } else {
              console.log('Token received:', response.access_token);
              setAccessToken(response.access_token);
              fetchSong();
            }
            setIsAuthenticating(false);
          },
        });
        setAuthInstance(tokenClient);
        console.log('Requesting initial token...');
        tokenClient.requestAccessToken({ prompt: 'consent' });
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services script');
        setAuthError('Unable to load Google Identity Services API.');
      };
      document.body.appendChild(script);
    };

    loadGoogleIdentityServices();
  }, [id, accessToken]);

  const handleDownload = async () => {
    if (!accessToken || !authInstance) {
      console.log('Not authenticated with Google Drive, prompting sign-in...');
      if (authInstance) {
        setIsAuthenticating(true);
        authInstance.requestAccessToken({ prompt: 'consent' });
      } else {
        setAuthError('Google Drive authentication not initialized. Please refresh the page.');
      }
      return;
    }
    proceedWithDownload(accessToken);
  };

  const proceedWithDownload = async (token) => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${song.google_drive_file_id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

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
      setAuthError('Failed to download file from Google Drive.');
    }
  };

  if (!song) return <div>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f' }}>{song.title}</h1>
      {authError && <p style={{ color: 'red', marginBottom: '1rem' }}>{authError}</p>}
      {!accessToken && authInstance && (
        <button
          onClick={() => authInstance.requestAccessToken({ prompt: 'consent' })}
          disabled={isAuthenticating}
          style={{ padding: '0.5rem 1rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '1rem' }}
        >
          {isAuthenticating ? 'Authenticating...' : 'Sign in to Google Drive'}
        </button>
      )}
      <p style={{ fontSize: '1rem', color: '#666', margin: '1rem 0' }}>{song.description || 'No description'}</p>
      <p style={{ fontSize: '1rem', color: '#666', margin: '0.5rem 0' }}>File Size: {song.fileSize || 'Loading...'}</p>
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
