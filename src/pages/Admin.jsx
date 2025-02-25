import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        navigate('/login');
        return;
      }
      setUser(authData.user);
      fetchInitialData();
      loadGoogleDrive();
    };
    fetchUser();
  }, [navigate]);

  const loadGoogleDrive = () => {
    const clientId = '221534643075-rhne5oov51v9ia5eefaa7nhktncihuif.apps.googleusercontent.com';
    const scope = 'https://www.googleapis.com/auth/drive.file';
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('auth2', () => {
        window.gapi.auth2.init({
          client_id: clientId,
          scope: scope,
          prompt: 'select_account', // Force account selection
        }).then(() => {
          const instance = window.gapi.auth2.getAuthInstance();
          setAuthInstance(instance);
          if (instance.isSignedIn.get()) {
            const token = instance.currentUser.get().getAuthResponse().access_token;
            setAccessToken(token);
          } else {
            instance.signIn().then((googleUser) => {
              const token = googleUser.getAuthResponse().access_token;
              setAccessToken(token);
            }).catch(err => {
              console.error('Initial Google Sign-In failed:', err);
              setAuthError('Failed to authenticate with Google Drive. Please try again.');
            });
          }
        }).catch(err => {
          console.error('Google Auth init failed:', err);
          setAuthError('Google Drive authentication initialization failed.');
        });
      });
    };
    script.onerror = () => {
      console.error('Failed to load Google API script');
      setAuthError('Unable to load Google Drive API.');
    };
    document.body.appendChild(script);
  };

  const fetchInitialData = async () => {
    const { data: songData, error: songError } = await supabase.from('songs').select('*');
    const { data: postData, error: postError } = await supabase.from('blog_posts').select('*');
    const { data: userData, error: userError } = await supabase.from('profiles').select('*');
    if (songError) console.error('Song fetch error:', songError.message);
    if (postError) console.error('Post fetch error:', postError.message);
    if (userError) console.error('User fetch error:', userError.message);
    setSongs(songData || []);
    setPosts(postData || []);
    setUsers(userData || []);
  };

  const handleSongUpload = async (e) => {
    e.preventDefault();
    if (!accessToken || !authInstance) {
      console.log('Not authenticated with Google Drive, prompting sign-in...');
      if (authInstance) {
        try {
          const googleUser = await authInstance.signIn({ prompt: 'select_account' });
          const token = googleUser.getAuthResponse().access_token;
          setAccessToken(token);
          await proceedWithUpload(e, token);
        } catch (err) {
          console.error('Sign-in for upload failed:', err);
          setAuthError('Google Drive sign-in failed. Please try again.');
        }
      } else {
        setAuthError('Google Drive authentication not initialized. Please refresh the page.');
      }
      return;
    }
    proceedWithUpload(e, accessToken);
  };

  const proceedWithUpload = async (e, token) => {
    const file = e.target.file.files[0];
    const thumbnailFile = e.target.thumbnail.files[0];
    if (!file) {
      console.error('No file selected');
      setAuthError('Please select a song file to upload.');
      return;
    }
    const fileName = `${Date.now()}-choircenter.com-${file.name}`;
    const thumbnailName = thumbnailFile ? `${Date.now()}-thumbnail-${thumbnailFile.name}` : null;

    try {
      const songFormData = new FormData();
      songFormData.append('metadata', new Blob([JSON.stringify({
        name: fileName,
        mimeType: 'application/pdf',
      })], { type: 'application/json' }));
      songFormData.append('file', file);

      const songResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: songFormData,
      });
      const songData = await songResponse.json();
      if (!songResponse.ok) throw new Error(`Song upload failed: ${songData.error?.message || 'Unknown error'}`);

      let thumbnailId = null;
      if (thumbnailFile) {
        const thumbFormData = new FormData();
        thumbFormData.append('metadata', new Blob([JSON.stringify({
          name: thumbnailName,
          mimeType: 'image/jpeg',
        })], { type: 'application/json' }));
        thumbFormData.append('file', thumbnailFile);

        const thumbResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: thumbFormData,
        });
        const thumbData = await thumbResponse.json();
        if (!thumbResponse.ok) throw new Error(`Thumbnail upload failed: ${thumbData.error?.message || 'Unknown error'}`);
        thumbnailId = thumbData.id;
      }

      const tags = e.target.tags.value ? e.target.tags.value.split(',').map(tag => tag.trim()) : [];
      const { error: insertError } = await supabase.from('songs').insert({
        title: e.target.title.value,
        description: e.target.description.value || null,
        permalink: e.target.permalink.value || fileName.replace(/\s+/g, '-').toLowerCase(),
        meta_description: e.target.meta_description.value || null,
        tags: tags,
        category: e.target.category.value || null,
        focus_keyword: e.target.focus_keyword.value || null,
        google_drive_file_id: songData.id,
        google_drive_thumbnail_id: thumbnailId,
        lyrics: e.target.lyrics.value || null,
      });
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      console.log('Song uploaded successfully');
      setAuthError(null); // Clear any previous errors
      fetchInitialData();
      e.target.reset();
    } catch (err) {
      console.error('Song upload error:', err.message);
      setAuthError(`Upload failed: ${err.message}`);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      const tags = e.target.tags.value ? e.target.tags.value.split(',').map(tag => tag.trim()) : [];
      const { error } = await supabase.from('blog_posts').insert({
        title: e.target.title.value,
        content: e.target.content.value || null,
        permalink: e.target.permalink.value || e.target.title.value.replace(/\s+/g, '-').toLowerCase(),
        meta_description: e.target.meta_description.value || null,
        tags: tags,
        category: e.target.category.value || null,
        focus_keyword: e.target.focus_keyword.value || null,
      });
      if (error) throw error;

      console.log('Post added successfully');
      setAuthError(null);
      fetchInitialData();
      e.target.reset();
    } catch (err) {
      console.error('Post submit error:', err.message);
      setAuthError(`Post submission failed: ${err.message}`);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f' }}>Admin Dashboard</h2>
      {authError && <p style={{ color: 'red', marginBottom: '1rem' }}>{authError}</p>}
      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <button onClick={() => setActiveTab('library')} style={{ padding: '0.5rem 1rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Library</button>
        <button onClick={() => setActiveTab('blog')} style={{ padding: '0.5rem 1rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Blog Posts</button>
        <button onClick={() => setActiveTab('analytics')} style={{ padding: '0.5rem 1rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Analytics</button>
        <button onClick={() => setActiveTab('users')} style={{ padding: '0.5rem 1rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Manage Users</button>
      </div>
      <div style={{ background: '#fff', padding: '1rem', borderRadius: '5px' }}>
        {activeTab === 'library' && (
          <>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f' }}>Library</h3>
            <form onSubmit={handleSongUpload}>
              <input type="text" name="title" placeholder="Song Title" required style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <textarea name="description" placeholder="Description" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }}></textarea>
              <input type="text" name="permalink" placeholder="Permalink" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="meta_description" placeholder="Meta Description" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="tags" placeholder="Tags (comma-separated)" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="category" placeholder="Category" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="focus_keyword" placeholder="Focus Keyword" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <textarea name="lyrics" placeholder="Song Lyrics" style={{ display: 'block', margin: '0.5rem 0', width: '100%', height: '100px' }}></textarea>
              <input type="file" name="file" accept=".pdf" required style={{ display: 'block', margin: '0.5rem 0' }} />
              <input type="file" name="thumbnail" accept=".jpg,.jpeg" style={{ display: 'block', margin: '0.5rem 0' }} />
              <button type="submit" style={{ background: '#3cb371', color: '#fff', border: 'none', padding: '0.5rem' }}>Upload Song</button>
            </form>
            <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2f4f2f', marginTop: '1rem' }}>Current Songs</h4>
            <ul>{songs.map(song => <li key={song.id}>{song.title}</li>)}</ul>
          </>
        )}
        {activeTab === 'blog' && (
          <>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f' }}>Blog Posts</h3>
            <form onSubmit={handlePostSubmit}>
              <input type="text" name="title" placeholder="Post Title" required style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <textarea name="content" placeholder="Content" rows="10" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }}></textarea>
              <input type="text" name="permalink" placeholder="Permalink" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="meta_description" placeholder="Meta Description" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="tags" placeholder="Tags (comma-separated)" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="category" placeholder="Category" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="focus_keyword" placeholder="Focus Keyword" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <button type="submit" style={{ background: '#3cb371', color: '#fff', border: 'none', padding: '0.5rem' }}>Add Post</button>
            </form>
            <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2f4f2f', marginTop: '1rem' }}>Current Posts</h4>
            <ul>{posts.map(post => <li key={post.id}>{post.title}</li>)}</ul>
          </>
        )}
        {activeTab === 'analytics' && (
          <>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f' }}>Analytics</h3>
            <p>Google Analytics integration coming soon. Placeholder for metrics display.</p>
          </>
        )}
        {activeTab === 'users' && (
          <>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f' }}>Manage Users</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '700', color: '#2f4f2f' }}>Full Name</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '700', color: '#2f4f2f' }}>Email</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '700', color: '#2f4f2f' }}>Choir</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '700', color: '#2f4f2f' }}>Church</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '700', color: '#2f4f2f' }}>Country</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '700', color: '#2f4f2f' }}>State</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '700', color: '#2f4f2f' }}>Admin</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.full_name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.email}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.choir_name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.church_name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.country}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.state}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.is_admin ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;
