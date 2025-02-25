import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Home() {
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
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
              fetchData(response.access_token);
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
  }, []);

  const fetchData = async (token) => {
    const { data: songData } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (token) {
      const songsWithSize = await Promise.all(
        songData.map(async (song) => {
          try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${song.google_drive_file_id}?fields=size`, {
              headers: { Authorization: `Bearer ${token}` },
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

    const { data: postData } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setPosts(postData || []);
  };

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
        .order('created_at', { ascending: false })
        .limit(10);

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
    <>
      <section style={{ background: '#3cb371', color: 'white', textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' }}>Welcome to Choir Center</h2>
        <p style={{ fontSize: '1.2rem' }}>Find and download choir music resources easily.</p>
        <input type="text" placeholder="Search for songs..." style={{ padding: '0.5rem', width: '50%', maxWidth: '400px', border: 'none', borderRadius: '5px' }} />
        <div style={{ marginTop: '1rem' }}>
          <Link to="/library">
            <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#2f4f2f' }}>Explore Library</button>
          </Link>
          <Link to="/blog">
            <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#2f4f2f' }}>Blog Posts</button>
          </Link>
        </div>
      </section>
      <div className="container" style={{ padding: '2rem' }}>
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
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#2f4f2f', fontWeight: '700' }}>Recently Added Songs</h3>
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
                    background: index % 2 === 0 ? '#2f4f2f' : '#1a3c34',
                    color: '#fff',
                    borderRadius: '4px',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3cb371')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? '#2f4f2f' : '#1a3c34')}
                >
                  <span style={{ width: '2rem', textAlign: 'right', marginRight: '1rem', color: '#98fb98' }}>{index + 1}</span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', margin: 0 }}>{song.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: '#98fb98', margin: 0 }}>{song.description || 'No description'}</p>
                  </div>
                  <span style={{ marginRight: '1rem', color: '#98fb98' }}>{song.fileSize || 'Loading...'}</span>
                  <span style={{ marginRight: '1rem', color: '#98fb98' }}>{song.downloads || 0} downloads</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownload(song.id, song.google_drive_file_id);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#98fb98',
                      color: '#2f4f2f',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                    }}
                  >
                    Download
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', marginTop: '2rem', color: '#2f4f2f', fontWeight: '700' }}>Recent Blog Posts</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {posts.map(post => (
            <Link
              to={`/blog/${post.permalink || post.id}`}
              key={post.id}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: '#fff',
                  padding: '1rem',
                  borderRadius: '5px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)')}
              >
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#2f4f2f', margin: 0 }}>{post.title}</h4>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default Home;
