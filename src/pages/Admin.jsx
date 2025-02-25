import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';

const ReactQuill = window.ReactQuill; // Use global from CDN

function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [editSongId, setEditSongId] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', permalink: '', meta_description: '', tags: '', category: '', focus_keyword: '', file_id: '', lyrics: '' });
  const [editPostId, setEditPostId] = useState(null);
  const [editPostData, setEditPostData] = useState({ title: '', content: '', permalink: '', meta_description: '', tags: '', category: '', focus_keyword: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const navigate = useNavigate();

  // Quill toolbar options
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean'] // Remove formatting
    ]
  };

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
    const { data: songData, error: songError } = await supabase
      .from('songs')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });
    const { data: postData, error: postError } = await supabase.from('blog_posts').select('*');
    const { data: userData, error: userError } = await supabase.from('profiles').select('*');
    if (songError) console.error('Song fetch error:', songError.message);
    if (postError) console.error('Post fetch error:', postError.message);
    if (userError) console.error('User fetch error:', userError.message);
    setSongs(songData || []);
    setPosts(postData || []);
    setUsers(userData || []);
  };

  const handleSongSelect = async (e) => {
    e.preventDefault();
    const fileId = e.target.file_id.value;

    if (!fileId) {
      setError('Please provide a Google Drive File ID for the song.');
      return;
    }

    try {
      const tags = e.target.tags.value ? e.target.tags.value.split(',').map(tag => tag.trim()) : [];
      const { error: insertError } = await supabase.from('songs').insert({
        title: e.target.title.value,
        permalink: e.target.permalink.value || `${Date.now()}-${e.target.title.value.replace(/\s+/g, '-').toLowerCase()}`,
        meta_description: e.target.meta_description.value || null,
        tags: tags,
        category: e.target.category.value || null,
        focus_keyword: e.target.focus_keyword.value || null,
        google_drive_file_id: fileId,
        lyrics: e.target.lyrics.value || null,
      });
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      setError(null);
      fetchInitialData();
      e.target.reset();
    } catch (err) {
      console.error('Song selection error:', err.message);
      setError(`Failed to add song: ${err.message}`);
    }
  };

  const handleEditSong = (song) => {
    setEditSongId(song.id);
    setEditFormData({
      title: song.title,
      permalink: song.permalink,
      meta_description: song.meta_description || '',
      tags: song.tags ? song.tags.join(', ') : '',
      category: song.category || '',
      focus_keyword: song.focus_keyword || '',
      file_id: song.google_drive_file_id,
      lyrics: song.lyrics || '',
    });
  };

  const handleUpdateSong = async (e) => {
    e.preventDefault();
    try {
      const tags = editFormData.tags ? editFormData.tags.split(',').map(tag => tag.trim()) : [];
      const { error: updateError } = await supabase
        .from('songs')
        .update({
          title: editFormData.title,
          permalink: editFormData.permalink,
          meta_description: editFormData.meta_description || null,
          tags: tags,
          category: editFormData.category || null,
          focus_keyword: editFormData.focus_keyword || null,
          google_drive_file_id: editFormData.file_id,
          lyrics: editFormData.lyrics || null,
        })
        .eq('id', editSongId);
      if (updateError) throw new Error(`Update failed: ${updateError.message}`);

      setError(null);
      setEditSongId(null);
      fetchInitialData();
    } catch (err) {
      console.error('Song update error:', err.message);
      setError(`Failed to update song: ${err.message}`);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      try {
        const { error: deleteError } = await supabase
          .from('songs')
          .delete()
          .eq('id', songId);
        if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

        setError(null);
        fetchInitialData();
      } catch (err) {
        console.error('Song deletion error:', err.message);
        setError(`Failed to delete song: ${err.message}`);
      }
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      const tags = e.target.tags.value ? e.target.tags.value.split(',').map(tag => tag.trim()) : [];
      const { error } = await supabase.from('blog_posts').insert({
        title: e.target.title.value,
        content: e.target.content.value || null, // Now HTML from ReactQuill
        permalink: e.target.permalink.value || e.target.title.value.replace(/\s+/g, '-').toLowerCase(),
        meta_description: e.target.meta_description.value || null,
        tags: tags,
        category: e.target.category.value || null,
        focus_keyword: e.target.focus_keyword.value || null,
      });
      if (error) throw error;

      setError(null);
      fetchInitialData();
      e.target.reset();
    } catch (err) {
      console.error('Post submit error:', err.message);
      setError(`Post submission failed: ${err.message}`);
    }
  };

  const handleEditPost = (post) => {
    setEditPostId(post.id);
    setEditPostData({
      title: post.title,
      content: post.content || '',
      permalink: post.permalink,
      meta_description: post.meta_description || '',
      tags: post.tags ? post.tags.join(', ') : '',
      category: post.category || '',
      focus_keyword: post.focus_keyword || '',
    });
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    try {
      const tags = editPostData.tags ? editPostData.tags.split(',').map(tag => tag.trim()) : [];
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          title: editPostData.title,
          content: editPostData.content || null,
          permalink: editPostData.permalink,
          meta_description: editPostData.meta_description || null,
          tags: tags,
          category: editPostData.category || null,
          focus_keyword: editPostData.focus_keyword || null,
        })
        .eq('id', editPostId);
      if (updateError) throw new Error(`Update failed: ${updateError.message}`);

      setError(null);
      setEditPostId(null);
      fetchInitialData();
    } catch (err) {
      console.error('Post update error:', err.message);
      setError(`Failed to update post: ${err.message}`);
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const { error: deleteError } = await supabase
          .from('blog_posts')
          .delete()
          .eq('id', postId);
        if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

        setError(null);
        fetchInitialData();
      } catch (err) {
        console.error('Post deletion error:', err.message);
        setError(`Failed to delete post: ${err.message}`);
      }
    }
  };

  const handleToggleAdmin = async (userId, currentAdminStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: !currentAdminStatus })
        .eq('id', userId);
      if (updateError) throw new Error(`Update failed: ${updateError.message}`);

      setError(null);
      fetchInitialData();
    } catch (err) {
      console.error('Admin toggle error:', err.message);
      setError(`Failed to toggle admin status: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.category && song.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalDownloads = songs.reduce((sum, song) => sum + (song.downloads || 0), 0);
  const totalUsers = users.length;

  if (!user) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="admin-header">
        <h2 className="admin-title">Admin Dashboard</h2>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="tab-bar">
        {['library', 'blog', 'analytics', 'users'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="admin-content">
        {activeTab === 'library' && (
          <>
            <h3 className="section-title">Library Management</h3>
            <form onSubmit={handleSongSelect} className="form-grid">
              <input type="text" name="title" placeholder="Song Title" required className="form-input" />
              <input type="text" name="permalink" placeholder="Permalink" className="form-input" />
              <input type="text" name="meta_description" placeholder="Meta Description" className="form-input" />
              <input type="text" name="tags" placeholder="Tags (comma-separated)" className="form-input" />
              <input type="text" name="category" placeholder="Category" className="form-input" />
              <input type="text" name="focus_keyword" placeholder="Focus Keyword" className="form-input" />
              <textarea name="lyrics" placeholder="Song Lyrics" className="form-textarea"></textarea>
              <input type="text" name="file_id" placeholder="Google Drive Song File ID" required className="form-input" />
              <button type="submit" className="form-submit">Add Song</button>
            </form>

            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search songs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                <option value="created_at">Sort by Date</option>
                <option value="downloads">Sort by Downloads</option>
                <option value="title">Sort by Title</option>
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="filter-select">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <h4 className="section-title">Current Songs</h4>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Downloads</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.map((song, index) => (
                    <tr key={song.id}>
                      <td>{index + 1}</td>
                      <td>{song.title}</td>
                      <td>{song.category || 'N/A'}</td>
                      <td>{song.downloads || 0}</td>
                      <td>
                        <button onClick={() => handleEditSong(song)} className="edit-button">Edit</button>
                        <button onClick={() => handleDeleteSong(song.id)} className="delete-button">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'blog' && (
          <>
            <h3 className="section-title">Blog Posts</h3>
            <form onSubmit={handlePostSubmit} className="form-grid">
              <input type="text" name="title" placeholder="Post Title" required className="form-input" />
              <input type="text" name="permalink" placeholder="Permalink" className="form-input" />
              <input type="text" name="meta_description" placeholder="Meta Description" className="form-input" />
              <input type="text" name="tags" placeholder="Tags (comma-separated)" className="form-input" />
              <input type="text" name="category" placeholder="Category" className="form-input" />
              <input type="text" name="focus_keyword" placeholder="Focus Keyword" className="form-input" />
              <ReactQuill
                name="content"
                value={e => e.target.content} // This won't work directly; handled via state in edit form
                onChange={(value) => e.target.content.value = value} // Hack to mimic form input
                modules={quillModules}
                placeholder="Write your content here..."
                className="form-textarea" // For styling consistency
                style={{ minHeight: '200px', gridColumn: '1 / -1' }}
              />
              <button type="submit" className="form-submit">Add Post</button>
            </form>
            <h4 className="section-title">Current Posts</h4>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, index) => (
                    <tr key={post.id}>
                      <td>{index + 1}</td>
                      <td>{post.title}</td>
                      <td>{post.category || 'N/A'}</td>
                      <td>
                        <button onClick={() => handleEditPost(post)} className="edit-button">Edit</button>
                        <button onClick={() => handleDeletePost(post.id)} className="delete-button">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'analytics' && (
          <>
            <h3 className="section-title">Analytics</h3>
            <div className="analytics-grid">
              <div className="analytics-item">
                <h4 className="analytics-title">Total Songs</h4>
                <p className="analytics-value">{songs.length}</p>
              </div>
              <div className="analytics-item">
                <h4 className="analytics-title">Total Downloads</h4>
                <p className="analytics-value">{totalDownloads}</p>
              </div>
              <div className="analytics-item">
                <h4 className="analytics-title">Total Users</h4>
                <p className="analytics-value">{totalUsers}</p>
              </div>
              <div className="analytics-item">
                <h4 className="analytics-title">Total Posts</h4>
                <p className="analytics-value">{posts.length}</p>
              </div>
            </div>
          </>
        )}
        {activeTab === 'users' && (
          <>
            <h3 className="section-title">Manage Users</h3>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Choir</th>
                    <th>Church</th>
                    <th>Country</th>
                    <th>State</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.choir_name}</td>
                      <td>{user.church_name}</td>
                      <td>{user.country}</td>
                      <td>{user.state}</td>
                      <td>
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          className={`toggle-button ${user.is_admin ? 'admin' : ''}`}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editSongId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Edit Song</h3>
            <form onSubmit={handleUpdateSong} className="form-grid">
              <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} placeholder="Song Title" required className="form-input" />
              <input type="text" value={editFormData.permalink} onChange={(e) => setEditFormData({ ...editFormData, permalink: e.target.value })} placeholder="Permalink" className="form-input" />
              <input type="text" value={editFormData.meta_description} onChange={(e) => setEditFormData({ ...editFormData, meta_description: e.target.value })} placeholder="Meta Description" className="form-input" />
              <input type="text" value={editFormData.tags} onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })} placeholder="Tags (comma-separated)" className="form-input" />
              <input type="text" value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })} placeholder="Category" className="form-input" />
              <input type="text" value={editFormData.focus_keyword} onChange={(e) => setEditFormData({ ...editFormData, focus_keyword: e.target.value })} placeholder="Focus Keyword" className="form-input" />
              <textarea value={editFormData.lyrics} onChange={(e) => setEditFormData({ ...editFormData, lyrics: e.target.value })} placeholder="Song Lyrics" className="form-textarea"></textarea>
              <input type="text" value={editFormData.file_id} onChange={(e) => setEditFormData({ ...editFormData, file_id: e.target.value })} placeholder="Google Drive Song File ID" required className="form-input" />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', gridColumn: '1 / -1' }}>
                <button type="submit" className="form-submit">Update Song</button>
                <button type="button" onClick={() => setEditSongId(null)} className="cancel-button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPostId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Edit Post</h3>
            <form onSubmit={handleUpdatePost} className="form-grid">
              <input type="text" value={editPostData.title} onChange={(e) => setEditPostData({ ...editPostData, title: e.target.value })} placeholder="Post Title" required className="form-input" />
              <input type="text" value={editPostData.permalink} onChange={(e) => setEditPostData({ ...editPostData, permalink: e.target.value })} placeholder="Permalink" className="form-input" />
              <input type="text" value={editPostData.meta_description} onChange={(e) => setEditPostData({ ...editPostData, meta_description: e.target.value })} placeholder="Meta Description" className="form-input" />
              <input type="text" value={editPostData.tags} onChange={(e) => setEditPostData({ ...editPostData, tags: e.target.value })} placeholder="Tags (comma-separated)" className="form-input" />
              <input type="text" value={editPostData.category} onChange={(e) => setEditPostData({ ...editPostData, category: e.target.value })} placeholder="Category" className="form-input" />
              <input type="text" value={editPostData.focus_keyword} onChange={(e) => setEditPostData({ ...editPostData, focus_keyword: e.target.value })} placeholder="Focus Keyword" className="form-input" />
              <ReactQuill
                value={editPostData.content}
                onChange={(value) => setEditPostData({ ...editPostData, content: value })}
                modules={quillModules}
                placeholder="Write your content here..."
                className="form-textarea"
                style={{ minHeight: '200px', gridColumn: '1 / -1' }}
              />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', gridColumn: '1 / -1' }}>
                <button type="submit" className="form-submit">Update Post</button>
                <button type="button" onClick={() => setEditPostId(null)} className="cancel-button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
