import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

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
        content: e.target.content.value || null,
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

  if (!user) return <div>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f' }}>Admin Dashboard</h2>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            background: '#e63946',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#d32f2f')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#e63946')}
        >
          Logout
        </button>
      </div>
      {error && <p style={{ color: '#e63946', marginBottom: '1rem', fontSize: '1rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['library', 'blog', 'analytics', 'users'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === tab ? '#3cb371' : '#fff',
              color: activeTab === tab ? '#fff' : '#2f4f2f',
              border: '1px solid #3cb371',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) e.currentTarget.style.background = '#e6f4ea';
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) e.currentTarget.style.background = '#fff';
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {activeTab === 'library' && (
          <>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1.5rem' }}>Library Management</h3>
            <form onSubmit={handleSongSelect} style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" name="title" placeholder="Song Title" required style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="permalink" placeholder="Permalink" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="meta_description" placeholder="Meta Description" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="tags" placeholder="Tags (comma-separated)" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="category" placeholder="Category" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="focus_keyword" placeholder="Focus Keyword" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <textarea name="lyrics" placeholder="Song Lyrics" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', minHeight: '120px' }}></textarea>
              <input type="text" name="file_id" placeholder="Google Drive Song File ID" required style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Add Song</button>
            </form>

            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Search songs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '10px 16px', width: '100%', maxWidth: '300px', border: '1px solid #ccc', borderRadius: '25px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}
              />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 16px', borderRadius: '25px', border: '1px solid #ccc', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                <option value="created_at">Sort by Date</option>
                <option value="downloads">Sort by Downloads</option>
                <option value="title">Sort by Title</option>
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '10px 16px', borderRadius: '25px', border: '1px solid #ccc', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1rem' }}>Current Songs</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>#</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Title</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Category</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Downloads</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.map((song, index) => (
                    <tr key={song.id}>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{song.title}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{song.category || 'N/A'}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333', textAlign: 'center' }}>{song.downloads || 0}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', textAlign: 'center' }}>
                        <button onClick={() => handleEditSong(song)} style={{ padding: '0.5rem 1rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                        <button onClick={() => handleDeleteSong(song.id)} style={{ padding: '0.5rem 1rem', background: '#e63946', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1.5rem' }}>Blog Posts</h3>
            <form onSubmit={handlePostSubmit} style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" name="title" placeholder="Post Title" required style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <textarea name="content" placeholder="Content" rows="10" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }}></textarea>
              <input type="text" name="permalink" placeholder="Permalink" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="meta_description" placeholder="Meta Description" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="tags" placeholder="Tags (comma-separated)" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="category" placeholder="Category" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" name="focus_keyword" placeholder="Focus Keyword" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <button type="submit" style={{ padding: '0.75rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Add Post</button>
            </form>
            <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1rem' }}>Current Posts</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>#</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Title</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Category</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, index) => (
                    <tr key={post.id}>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{post.title}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{post.category || 'N/A'}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', textAlign: 'center' }}>
                        <button onClick={() => handleEditPost(post)} style={{ padding: '0.5rem 1rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                        <button onClick={() => handleDeletePost(post.id)} style={{ padding: '0.5rem 1rem', background: '#e63946', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1.5rem' }}>Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '0.5rem' }}>Total Songs</h4>
                <p style={{ fontSize: '1.5rem', color: '#333' }}>{songs.length}</p>
              </div>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '0.5rem' }}>Total Downloads</h4>
                <p style={{ fontSize: '1.5rem', color: '#333' }}>{totalDownloads}</p>
              </div>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '0.5rem' }}>Total Users</h4>
                <p style={{ fontSize: '1.5rem', color: '#333' }}>{totalUsers}</p>
              </div>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '0.5rem' }}>Total Posts</h4>
                <p style={{ fontSize: '1.5rem', color: '#333' }}>{posts.length}</p>
              </div>
            </div>
          </>
        )}
        {activeTab === 'users' && (
          <>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1.5rem' }}>Manage Users</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Full Name</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Email</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Choir</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Church</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Country</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>State</th>
                    <th style={{ border: '1px solid #ddd', padding: '1rem', fontWeight: '700', color: '#2f4f2f', background: '#f9fafb' }}>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{user.full_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{user.email}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{user.choir_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{user.church_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{user.country}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333' }}>{user.state}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1rem', color: '#333', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: user.is_admin ? '#e63946' : '#3cb371',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background 0.3s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = user.is_admin ? '#d32f2f' : '#2f9e5e')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = user.is_admin ? '#e63946' : '#3cb371')}
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

      {/* Song Edit Modal */}
      {editSongId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1rem' }}>Edit Song</h4>
            <form onSubmit={handleUpdateSong} style={{ display: 'grid', gap: '1rem' }}>
              <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} placeholder="Song Title" required style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editFormData.permalink} onChange={(e) => setEditFormData({ ...editFormData, permalink: e.target.value })} placeholder="Permalink" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editFormData.meta_description} onChange={(e) => setEditFormData({ ...editFormData, meta_description: e.target.value })} placeholder="Meta Description" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editFormData.tags} onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })} placeholder="Tags (comma-separated)" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })} placeholder="Category" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editFormData.focus_keyword} onChange={(e) => setEditFormData({ ...editFormData, focus_keyword: e.target.value })} placeholder="Focus Keyword" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <textarea value={editFormData.lyrics} onChange={(e) => setEditFormData({ ...editFormData, lyrics: e.target.value })} placeholder="Song Lyrics" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', minHeight: '120px' }}></textarea>
              <input type="text" value={editFormData.file_id} onChange={(e) => setEditFormData({ ...editFormData, file_id: e.target.value })} placeholder="Google Drive Song File ID" required style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Update Song</button>
                <button type="button" onClick={() => setEditSongId(null)} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Edit Modal */}
      {editPostId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1rem' }}>Edit Post</h4>
            <form onSubmit={handleUpdatePost} style={{ display: 'grid', gap: '1rem' }}>
              <input type="text" value={editPostData.title} onChange={(e) => setEditPostData({ ...editPostData, title: e.target.value })} placeholder="Post Title" required style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <textarea value={editPostData.content} onChange={(e) => setEditPostData({ ...editPostData, content: e.target.value })} placeholder="Content" rows="10" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }}></textarea>
              <input type="text" value={editPostData.permalink} onChange={(e) => setEditPostData({ ...editPostData, permalink: e.target.value })} placeholder="Permalink" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editPostData.meta_description} onChange={(e) => setEditPostData({ ...editPostData, meta_description: e.target.value })} placeholder="Meta Description" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editPostData.tags} onChange={(e) => setEditPostData({ ...editPostData, tags: e.target.value })} placeholder="Tags (comma-separated)" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editPostData.category} onChange={(e) => setEditPostData({ ...editPostData, category: e.target.value })} placeholder="Category" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <input type="text" value={editPostData.focus_keyword} onChange={(e) => setEditPostData({ ...editPostData, focus_keyword: e.target.value })} placeholder="Focus Keyword" style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#3cb371', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Update Post</button>
                <button type="button" onClick={() => setEditPostId(null)} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
