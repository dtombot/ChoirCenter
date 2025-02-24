import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
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
    };
    fetchUser();
  }, [navigate]);

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
    console.log('Starting song upload');
    const file = e.target.file.files[0];
    const thumbnailFile = e.target.thumbnail.files[0];
    if (!file) {
      console.error('No file selected');
      return;
    }
    const fileName = `${Date.now()}-choircenter.com-${file.name}`;
    const thumbnailName = thumbnailFile ? `${Date.now()}-thumbnail-${thumbnailFile.name}` : null;
    try {
      console.log('Uploading file:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(fileName, file);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      if (thumbnailFile) {
        const { error: thumbError } = await supabase.storage
          .from('songs')
          .upload(thumbnailName, thumbnailFile);
        if (thumbError) throw new Error(`Thumbnail upload failed: ${thumbError.message}`);
      }

      const tags = e.target.tags.value ? e.target.tags.value.split(',').map(tag => tag.trim()) : [];
      console.log('Inserting song with data:', {
        title: e.target.title.value,
        tags: tags,
      });
      const { error: insertError } = await supabase.from('songs').insert({
        title: e.target.title.value,
        description: e.target.description.value || null,
        permalink: e.target.permalink.value || fileName.replace(/\s+/g, '-').toLowerCase(),
        meta_description: e.target.meta_description.value || null,
        tags: tags,
        category: e.target.category.value || null,
        focus_keyword: e.target.focus_keyword.value || null,
        file_path: fileName,
        lyrics: e.target.lyrics.value || null,
        thumbnail: thumbnailName,
      });
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      console.log('Song uploaded successfully');
      fetchInitialData();
      e.target.reset();
    } catch (err) {
      console.error('Song upload error:', err.message);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    console.log('Starting post submit');
    try {
      const tags = e.target.tags.value ? e.target.tags.value.split(',').map(tag => tag.trim()) : [];
      console.log('Inserting post with data:', {
        title: e.target.title.value,
        tags: tags,
      });
      const { error } = await supabase.from('blog_posts').insert({
        title: e.target.title.value,
        content: e.target.content.value || null,
        permalink: e.target.permalink.value || e.target.title.value.replace(/\s+/g, '-').toLowerCase(),
        meta_description: e.target.meta_description.value || null,
        tags: tags,
        category: e.target.category.value || null,
        focus_keyword: e.target.focus_keyword.value || null,
      });
      if (error) throw new Error(`Post insert failed: ${error.message}`);

      console.log('Post added successfully');
      fetchInitialData();
      e.target.reset();
    } catch (err) {
      console.error('Post submit error:', err.message);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f' }}>Admin Dashboard</h2>
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
