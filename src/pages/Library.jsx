import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Library() {
  const [songs, setSongs] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const fetchSongs = async () => {
      const { data: songData } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (accessToken) {
        const songsWithSize = await Promise.all(
          songData.map(async (song) => {
            try {
              const response = await fetch(`https://www.googleapis.com/drive/v3/files/${song.google_drive_file_id}?fields=size`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              const fileData = await response.json();
              const sizeInKB = fileData.size ? (fileData.size / 1024).toFixed(2) : 'Unknown';
              return { ...song, fileSize: `${sizeInKB} KB` };
            } catch (err) {
              console.error('Error fetching file size:', err);
              return { ...song, fileSize: 'Unknown' };
            }
          })
        );
        setSongs(songsWithSize || []);
      } else {
        setSongs(songData || []);
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
              fetchSongs();
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
  }, [accessToken]);

  const handleDownload = async (songId, fileId) => {
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
    proceedWithDownload(songId, fileId, accessToken);
  };

  const proceedWithDownload = async (songId, fileId, token) => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${songId}.pdf`;
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
          try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${song.google_drive_file_id}?fields=size`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const fileData = await response.json();
            const sizeInKB = fileData.size ? (fileData.size / 1024).toFixed(2) : 'Unknown';
            return { ...song, fileSize: `${sizeInKB} KB` };
          } catch (err) {
            return { ...song, fileSize: 'Unknown' };
          }
        })
      );

      setSongs(songsWithSize || []);
    } catch (err) {
      console.error('Download error:', err.message);
      setAuthError('Failed to download file from Google Drive.');
    }
  };

  return (
    <div className="container" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#2f4f2f', marginBottom: '24px' }}>Library</h2>
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
                <span style={{ marginRight: '16px', color: '#98fb98', fontSize: '14px', fontWeight: '400' }}>{song.fileSize || 'Loading...'}</span>
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
