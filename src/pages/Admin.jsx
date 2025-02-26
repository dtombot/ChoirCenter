import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [songForm, setSongForm] = useState({ title: '', composer: '', google_drive_file_id: '', permalink: '', is_public: true });
  const [postForm, setPostForm] = useState({ title: '', content: '', permalink: '' });
  const [editingSongId, setEditingSongId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/login');
        return;
      }
      setUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (profileError || !profileData?.is_admin) {
        navigate('/');
      }
    };
    fetchUser();

    const fetchSongs = async () => {
      const { data, error } = await supabase.from('songs').select('*');
      if (error) setError('Failed to load songs.');
      else setSongs(data || []);
    };
    fetchSongs();

    const fetchPosts = async () => {
      const { data, error } = await supabase.from('blog_posts').select('*');
      if (error) setError('Failed to load posts.');
      else setPosts(data || []);
    };
    fetchPosts();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleSongSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSongId) {
        const { error } = await supabase
          .from('songs')
          .update({ title: songForm.title, composer: songForm.composer, google_drive_file_id: songForm.google_drive_file_id, permalink: songForm.permalink, is_public: songForm.is_public })
          .eq('id', editingSongId);
        if (error) throw error;
        setEditingSongId(null);
      } else {
        const { error } = await supabase
          .from('songs')
          .insert([{ title: songForm.title, composer: songForm.composer, google_drive_file_id: songForm.google_drive_file_id, permalink: songForm.permalink, is_public: songForm.is_public, downloads: 0 }]);
        if (error) throw error;
      }
      setSongForm({ title: '', composer: '', google_drive_file_id: '', permalink: '', is_public: true });
      const { data } = await supabase.from('songs').select('*');
      setSongs(data || []);
    } catch (err) {
      setError('Failed to save song.');
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPostId) {
        const { error } = await supabase
          .from('blog_posts')
          .update({ title: postForm.title, content: postForm.content, permalink: postForm.permalink })
          .eq('id', editingPostId);
        if (error) throw error;
        setEditingPostId(null);
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([{ title: postForm.title, content: postForm.content, permalink: postForm.permalink }]);
        if (error) throw error;
      }
      setPostForm({ title: '', content: '', permalink: '' });
      const { data } = await supabase.from('blog_posts').select('*');
      setPosts(data || []);
    } catch (err) {
      setError('Failed to save post.');
    }
  };

  const editSong = (song) => {
    setSongForm({ title: song.title, composer: song.composer, google_drive_file_id: song.google_drive_file_id, permalink: song.permalink, is_public: song.is_public });
    setEditingSongId(song.id);
  };

  const editPost = (post) => {
    setPostForm({ title: post.title, content: post.content, permalink: post.permalink });
    setEditingPostId(post.id);
  };

  const deleteSong = async (id) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) setError('Failed to delete song.');
      else setSongs(songs.filter(song => song.id !== id));
    }
  };

  const deletePost = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) setError('Failed to delete post.');
      else setPosts(posts.filter(post => post.id !== id));
    }
  };

  const toggleSongPublic = async (id, isPublic) => {
    const { error } = await supabase.from('songs').update({ is_public: !isPublic }).eq('id', id);
    if (error) setError('Failed to update song status.');
    else setSongs(songs.map(song => song.id === id ? { ...song, is_public: !isPublic } : song));
  };

  if (!user) return null;

  return (
    <div className="container">
      <div className="admin-header">
        <h2 className="admin-title">Admin Dashboard</h2>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      <div className="tab-bar">
        <button className={`tab-button ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>Songs</button>
        <button className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Blog Posts</button>
      </div>
      <div className="admin-content">
        {error && <p className="error-message">{error}</p>}
        {activeTab === 'songs' && (
          <>
            <form onSubmit={handleSongSubmit} className="form-grid">
              <input
                type="text"
                placeholder="Song Title"
                value={songForm.title}
                onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Composer"
                value={songForm.composer}
                onChange={(e) => setSongForm({ ...songForm, composer: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Google Drive File ID"
                value={songForm.google_drive_file_id}
                onChange={(e) => setSongForm({ ...songForm, google_drive_file_id: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Permalink"
                value={songForm.permalink}
                onChange={(e) => setSongForm({ ...songForm, permalink: e.target.value })}
                className="form-input"
              />
              <label>
                <input
                  type="checkbox"
                  checked={songForm.is_public}
                  onChange={(e) => setSongForm({ ...songForm, is_public: e.target.checked })}
                />
                Public
              </label>
              <button type="submit" className="form-submit">{editingSongId ? 'Update Song' : 'Add Song'}</button>
              {editingSongId && (
                <button type="button" className="cancel-button" onClick={() => { setSongForm({ title: '', composer: '', google_drive_file_id: '', permalink: '', is_public: true }); setEditingSongId(null); }}>Cancel</button>
              )}
            </form>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Composer</th>
                    <th>File ID</th>
                    <th>Downloads</th>
                    <th>Public</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map(song => (
                    <tr key={song.id}>
                      <td>{song.title}</td>
                      <td>{song.composer}</td>
                      <td>{song.google_drive_file_id}</td>
                      <td>{song.downloads || 0}</td>
                      <td>
                        <button
                          onClick={() => toggleSongPublic(song.id, song.is_public)}
                          className={`toggle-button ${song.is_public ? 'admin' : ''}`}
                        >
                          {song.is_public ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => editSong(song)} className="edit-button">Edit</button>
                        <button onClick={() => deleteSong(song.id)} className="delete-button">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'posts' && (
          <>
            <form onSubmit={handlePostSubmit} className="form-grid">
              <input
                type="text"
                placeholder="Post Title"
                value={postForm.title}
                onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Permalink"
                value={postForm.permalink}
                onChange={(e) => setPostForm({ ...postForm, permalink: e.target.value })}
                className="form-input"
              />
              <textarea
                placeholder="Content"
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                className="form-textarea"
                required
              />
              <button type="submit" className="form-submit">{editingPostId ? 'Update Post' : 'Add Post'}</button>
              {editingPostId && (
                <button type="button" className="cancel-button" onClick={() => { setPostForm({ title: '', content: '', permalink: '' }); setEditingPostId(null); }}>Cancel</button>
              )}
            </form>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post.id}>
                      <td>{post.title}</td>
                      <td>
                        <button onClick={() => editPost(post)} className="edit-button">Edit</button>
                        <button onClick={() => deletePost(post.id)} className="delete-button">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;
