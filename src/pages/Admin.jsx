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
    if (songError) console.error('Song fetch error:', songError);
    if (postError) console.error('Post fetch error:', postError);
    if (userError) console.error('User fetch error:', userError);
    setSongs(songData || []);
    setPosts(postData || []);
    setUsers(userData || []);
  };

  const handleSongUpload = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('songs')
      .upload(fileName, file);
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }
    const { error: insertError } = await supabase.from('songs').insert({
      title: e.target.title.value,
      description: e.target.description.value,
      permalink: e.target.permalink.value || fileName.replace(/\s+/g, '-').toLowerCase(),
      meta_description: e.target.meta_description.value,
      tags: e.target.tags.value.split(','),
      category: e.target.category.value,
      focus_keyword: e.target.focus_keyword.value,
      file_path: fileName,
    });
    if (!insertError) {
      fetchInitialData();
      e.target.reset();
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('blog_posts').insert({
      title: e.target.title.value,
      content: e.target.content.value,
      permalink: e.target.permalink.value || e.target.title.value.replace(/\s+/g, '-').toLowerCase(),
      meta_description: e.target.meta_description.value,
      tags: e.target.tags.value.split(','),
      category: e.target.category.value,
      focus_keyword: e.target.focus_keyword.value,
    });
    if (!error) {
      fetchInitialData();
      e.target.reset();
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="container">
      <h2>Admin Dashboard</h2>
      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <button onClick={() => setActiveTab('library')}>Library</button>
        <button onClick={() => setActiveTab('blog')}>Blog Posts</button>
        <button onClick={() => setActiveTab('analytics')}>Analytics</button>
        <button onClick={() => setActiveTab('users')}>Manage Users</button>
      </div>
      <div style={{ background: '#fff', padding: '1rem', borderRadius: '5px' }}>
        {activeTab === 'library' && (
          <>
            <h3>Library</h3>
            <form onSubmit={handleSongUpload}>
              <input type="text" name="title" placeholder="Song Title" required style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <textarea name="description" placeholder="Description" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }}></textarea>
              <input type="text" name="permalink" placeholder="Permalink" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="meta_description" placeholder="Meta Description" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="tags" placeholder="Tags (comma-separated)" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="category" placeholder="Category" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="text" name="focus_keyword" placeholder="Focus Keyword" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
              <input type="file" name="file" accept=".pdf" required style={{ display: 'block', margin: '0.5rem 0' }} />
              <button type="submit" style={{ background: '#3cb371', color: '#fff', border: 'none', padding: '0.5rem' }}>Upload Song</button>
            </form>
            <h4>Current Songs</h4>
            <ul>{songs.map(song => <li key={song.id}>{song.title}</li>)}</ul>
          </>
        )}
        {activeTab === 'blog' && (
          <>
            <h3>Blog Posts</h3>
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
            <h4>Current Posts</h4>
            <ul>{posts.map(post => <li key={post.id}>{post.title}</li>)}</ul>
          </>
        )}
        {activeTab === 'analytics' && (
          <>
            <h3>Analytics</h3>
            <p>Google Analytics integration coming soon. Placeholder for metrics display.</p>
          </>
        )}
        {activeTab === 'users' && (
          <>
            <h3>Manage Users</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Full Name</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Choir</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Church</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Country</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>State</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Admin</th>
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
