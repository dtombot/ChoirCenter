import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../styles.css';

function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [songForm, setSongForm] = useState({ 
    title: '', 
    composer: '', 
    google_drive_file_id: '', 
    github_file_url: '', 
    permalink: '', 
    is_public: true,
    source: 'google_drive'
  });
  const [postForm, setPostForm] = useState({ 
    title: '', 
    content: '', 
    permalink: '', 
    meta_description: '', 
    tags: '', 
    category: '', 
    focus_keyword: '' 
  });
  const [analyticsData, setAnalyticsData] = useState({ ga: null, gsc: null });
  const [editingSongId, setEditingSongId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [error, setError] = useState(null);
  const [songSearch, setSongSearch] = useState('');
  const [songFilter, setSongFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/login');
        return;
      }
      setUser(user);

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      if (adminError || !adminData) {
        navigate('/');
        return;
      }

      const fetchSongs = async () => {
        const { data, error } = await supabase.from('songs').select('*');
        if (error) setError('Failed to load songs: ' + error.message);
        else setSongs(data || []);
      };
      fetchSongs();

      const fetchPosts = async () => {
        const { data, error } = await supabase.from('blog_posts').select('*');
        if (error) setError('Failed to load posts: ' + error.message);
        else setPosts(data || []);
      };
      fetchPosts();

      const fetchUsers = async () => {
        const { data, error } = await supabase.from('profiles').select('id, email, is_admin');
        if (error) setError('Failed to load users: ' + error.message);
        else setUsers(data || []);
      };
      fetchUsers();

      const fetchAnalytics = async () => {
        try {
          const response = await fetch('/.netlify/functions/analytics');
          if (!response.ok) throw new Error('Failed to fetch analytics data');
          const data = await response.json();
          setAnalyticsData(data);
        } catch (err) {
          setError('Analytics fetch failed: ' + err.message);
        }
      };
      fetchAnalytics();
    };
    fetchUser();
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
          .update({ 
            title: songForm.title, 
            composer: songForm.composer, 
            google_drive_file_id: songForm.source === 'google_drive' ? songForm.google_drive_file_id : null, 
            github_file_url: songForm.source === 'github' ? songForm.github_file_url : null, 
            permalink: songForm.permalink, 
            is_public: songForm.is_public 
          })
          .eq('id', editingSongId);
        if (error) throw error;
        setEditingSongId(null);
      } else {
        const { error } = await supabase
          .from('songs')
          .insert([{ 
            title: songForm.title, 
            composer: songForm.composer, 
            google_drive_file_id: songForm.source === 'google_drive' ? songForm.google_drive_file_id : null, 
            github_file_url: songForm.source === 'github' ? songForm.github_file_url : null, 
            permalink: songForm.permalink, 
            is_public: songForm.is_public, 
            downloads: 0 
          }]);
        if (error) throw error;
      }
      setSongForm({ title: '', composer: '', google_drive_file_id: '', github_file_url: '', permalink: '', is_public: true, source: 'google_drive' });
      const { data } = await supabase.from('songs').select('*');
      setSongs(data || []);
    } catch (err) {
      setError('Failed to save song: ' + err.message);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      const generatedPermalink = postForm.permalink.trim() || postForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!postForm.title.trim()) {
        setError('Title is required');
        return;
      }

      const postData = {
        title: postForm.title,
        content: postForm.content,
        permalink: generatedPermalink,
        meta_description: postForm.meta_description || null,
        tags: postForm.tags || null,
        category: postForm.category || null,
        focus_keyword: postForm.focus_keyword || null
      };

      if (editingPostId) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPostId);
        if (error) throw error;
        setEditingPostId(null);
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([postData]);
        if (error) throw error;
      }
      setPostForm({ title: '', content: '', permalink: '', meta_description: '', tags: '', category: '', focus_keyword: '' });
      const { data } = await supabase.from('blog_posts').select('*');
      setPosts(data || []);
    } catch (err) {
      setError('Failed to save post: ' + err.message);
    }
  };

  const editSong = (song) => {
    setSongForm({ 
      title: song.title, 
      composer: song.composer, 
      google_drive_file_id: song.google_drive_file_id || '', 
      github_file_url: song.github_file_url || '', 
      permalink: song.permalink, 
      is_public: song.is_public,
      source: song.google_drive_file_id ? 'google_drive' : 'github'
    });
    setEditingSongId(song.id);
  };

  const editPost = (post) => {
    setPostForm({ 
      title: post.title, 
      content: post.content, 
      permalink: post.permalink || '', 
      meta_description: post.meta_description || '', 
      tags: post.tags || '', 
      category: post.category || '', 
      focus_keyword: post.focus_keyword || '' 
    });
    setEditingPostId(post.id);
  };

  const deleteSong = async (id) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) setError('Failed to delete song: ' + error.message);
      else setSongs(songs.filter(song => song.id !== id));
    }
  };

  const deletePost = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) setError('Failed to delete post: ' + error.message);
      else setPosts(posts.filter(post => post.id !== id));
    }
  };

  const toggleSongPublic = async (id, isPublic) => {
    const { error } = await supabase.from('songs').update({ is_public: !isPublic }).eq('id', id);
    if (error) setError('Failed to update song status: ' + error.message);
    else setSongs(songs.map(song => song.id === id ? { ...song, is_public: !isPublic } : song));
  };

  const toggleUserAdmin = async (id, isAdmin) => {
    if (id === user.id) {
      setError('Cannot modify your own admin status.');
      return;
    }
    try {
      if (isAdmin) {
        const { error } = await supabase.from('admins').delete().eq('user_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('admins').insert([{ user_id: id }]);
        if (error) throw error;
      }
      const { data } = await supabase.from('profiles').select('id, email, is_admin');
      setUsers(data || []);
    } catch (err) {
      setError('Failed to update user status: ' + err.message);
    }
  };

  const deleteUser = async (id) => {
    if (id === user.id) {
      setError('Cannot delete your own account.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) setError('Failed to delete user: ' + err.message);
      else setUsers(users.filter(u => u.id !== id));
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: { matchVisual: false }
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'link', 'image'
  ];

  const filteredSongs = songs.filter(song => {
    const matchesSearch = 
      song.title.toLowerCase().includes(songSearch.toLowerCase()) || 
      song.composer.toLowerCase().includes(songSearch.toLowerCase());
    const matchesFilter = 
      songFilter === 'all' || 
      (songFilter === 'public' && song.is_public) || 
      (songFilter === 'private' && !song.is_public);
    return matchesSearch && matchesFilter;
  });

  if (!user) return null;

  const totalDownloads = songs.reduce((sum, song) => sum + (song.downloads || 0), 0);
  const publicSongs = songs.filter(song => song.is_public).length;
  const privateSongs = songs.length - publicSongs;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2 className="admin-title">Admin Dashboard</h2>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      <div className="tab-bar">
        <button className={`tab-button ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>Songs</button>
        <button className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Blog Posts</button>
        <button className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
        <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Manage Users</button>
      </div>
      <div className="admin-content">
        {error && <p className="error-message">{error}</p>}
        {activeTab === 'songs' && (
          <>
            <form onSubmit={handleSongSubmit} className="admin-form-grid">
              <input 
                type="text" 
                placeholder="Song Title" 
                value={songForm.title} 
                onChange={(e) => setSongForm({ ...songForm, title: e.target.value })} 
                className="admin-form-input" 
                required 
              />
              <input 
                type="text" 
                placeholder="Composer" 
                value={songForm.composer} 
                onChange={(e) => setSongForm({ ...songForm, composer: e.target.value })} 
                className="admin-form-input" 
                required 
              />
              <div className="admin-form-group">
                <label htmlFor="source">File Source</label>
                <select
                  id="source"
                  value={songForm.source}
                  onChange={(e) => setSongForm({ ...songForm, source: e.target.value })}
                  className="admin-form-input"
                >
                  <option value="google_drive">Google Drive</option>
                  <option value="github">GitHub (/public/pdf)</option>
                </select>
              </div>
              {songForm.source === 'google_drive' ? (
                <input 
                  type="text" 
                  placeholder="Google Drive File ID" 
                  value={songForm.google_drive_file_id} 
                  onChange={(e) => setSongForm({ ...songForm, google_drive_file_id: e.target.value })} 
                  className="admin-form-input" 
                  required 
                />
              ) : (
                <input 
                  type="text" 
                  placeholder="GitHub Raw URL (e.g., https://raw.githubusercontent.com/.../song.pdf)" 
                  value={songForm.github_file_url} 
                  onChange={(e) => setSongForm({ ...songForm, github_file_url: e.target.value })} 
                  className="admin-form-input" 
                  required 
                />
              )}
              <input 
                type="text" 
                placeholder="Permalink" 
                value={songForm.permalink} 
                onChange={(e) => setSongForm({ ...songForm, permalink: e.target.value })} 
                className="admin-form-input" 
              />
              <label className="admin-checkbox">
                <input 
                  type="checkbox" 
                  checked={songForm.is_public} 
                  onChange={(e) => setSongForm({ ...songForm, is_public: e.target.checked })} 
                />
                Public
              </label>
              <button type="submit" className="admin-form-submit">{editingSongId ? 'Update Song' : 'Add Song'}</button>
              {editingSongId && (
                <button 
                  type="button" 
                  className="admin-cancel-button" 
                  onClick={() => { setSongForm({ title: '', composer: '', google_drive_file_id: '', github_file_url: '', permalink: '', is_public: true, source: 'google_drive' }); setEditingSongId(null); }}
                >
                  Cancel
                </button>
              )}
            </form>
            <div className="admin-filter-bar">
              <input 
                type="text" 
                placeholder="Search songs..." 
                value={songSearch} 
                onChange={(e) => setSongSearch(e.target.value)} 
                className="admin-filter-input" 
              />
              <select 
                value={songFilter} 
                onChange={(e) => setSongFilter(e.target.value)} 
                className="admin-filter-select"
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Composer</th>
                    <th>File Source</th>
                    <th>Downloads</th>
                    <th>Public</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.map(song => (
                    <tr key={song.id}>
                      <td>{song.title}</td>
                      <td>{song.composer}</td>
                      <td>{song.google_drive_file_id ? 'Google Drive' : 'GitHub'}</td>
                      <td>{song.downloads || 0}</td>
                      <td>
                        <button 
                          onClick={() => toggleSongPublic(song.id, song.is_public)} 
                          className={`admin-toggle-button ${song.is_public ? 'active' : ''}`}
                        >
                          {song.is_public ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => editSong(song)} className="admin-edit-button">Edit</button>
                        <button onClick={() => deleteSong(song.id)} className="admin-delete-button">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'posts' && (
          <div className="admin-posts-tab">
            <div className="admin-form-card">
              <h3 className="admin-form-title">{editingPostId ? 'Edit Blog Post' : 'Add New Blog Post'}</h3>
              <form onSubmit={handlePostSubmit} className="admin-modern-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="title">Title *</label>
                  <input
                    id="title"
                    type="text"
                    placeholder="Enter post title"
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    className="admin-form-input"
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="permalink">Permalink (auto-generated if blank)</label>
                  <input
                    id="permalink"
                    type="text"
                    placeholder="e.g., my-post-title"
                    value={postForm.permalink}
                    onChange={(e) => setPostForm({ ...postForm, permalink: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group full-width">
                  <label htmlFor="content">Content</label>
                  <ReactQuill
                    value={postForm.content}
                    onChange={(content) => setPostForm({ ...postForm, content })}
                    modules={quillModules}
                    formats={quillFormats}
                    className="admin-quill-editor"
                    placeholder="Write your blog post content here..."
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="meta_description">Meta Description</label>
                  <input
                    id="meta_description"
                    type="text"
                    placeholder="Short description for SEO"
                    value={postForm.meta_description}
                    onChange={(e) => setPostForm({ ...postForm, meta_description: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="tags">Tags (comma-separated)</label>
                  <input
                    id="tags"
                    type="text"
                    placeholder="e.g., music, choir"
                    value={postForm.tags}
                    onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="category">Category</label>
                  <input
                    id="category"
                    type="text"
                    placeholder="e.g., Vocal Tips"
                    value={postForm.category}
                    onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="focus_keyword">Focus Keyword</label>
                  <input
                    id="focus_keyword"
                    type="text"
                    placeholder="e.g., vocal warm-ups"
                    value={postForm.focus_keyword}
                    onChange={(e) => setPostForm({ ...postForm, focus_keyword: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-actions">
                  <button type="submit" className="admin-form-submit">{editingPostId ? 'Update Post' : 'Add Post'}</button>
                  {editingPostId && (
                    <button type="button" className="admin-cancel-button" onClick={() => { setPostForm({ title: '', content: '', permalink: '', meta_description: '', tags: '', category: '', focus_keyword: '' }); setEditingPostId(null); }}>Cancel</button>
                  )}
                </div>
              </form>
            </div>
            <div className="admin-posts-grid">
              {posts.map(post => (
                <div key={post.id} className="admin-post-card">
                  <h4 className="admin-post-card-title">{post.title}</h4>
                  <p className="admin-post-card-meta"><strong>Permalink:</strong> {post.permalink || 'N/A'}</p>
                  <p className="admin-post-card-meta"><strong>Category:</strong> {post.category || 'Uncategorized'}</p>
                  <p className="admin-post-card-meta"><strong>Created:</strong> {new Date(post.created_at).toLocaleDateString()}</p>
                  <div className="admin-post-card-actions">
                    <button onClick={() => editPost(post)} className="admin-edit-button">Edit</button>
                    <button onClick={() => deletePost(post.id)} className="admin-delete-button">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="admin-analytics-grid">
            <div className="analytics-section local-data">
              <h3 className="analytics-section-title">Local Data</h3>
              <div className="admin-analytics-item">
                <h4 className="admin-analytics-title">Total Songs</h4>
                <p className="admin-analytics-value">{songs.length}</p>
              </div>
              <div className="admin-analytics-item">
                <h4 className="admin-analytics-title">Total Downloads</h4>
                <p className="admin-analytics-value">{totalDownloads}</p>
              </div>
              <div className="admin-analytics-item">
                <h4 className="admin-analytics-title">Public Songs</h4>
                <p className="admin-analytics-value">{publicSongs}</p>
              </div>
              <div className="admin-analytics-item">
                <h4 className="admin-analytics-title">Private Songs</h4>
                <p className="admin-analytics-value">{privateSongs}</p>
              </div>
              <div className="admin-analytics-item">
                <h4 className="admin-analytics-title">Total Blog Posts</h4>
                <p className="admin-analytics-value">{posts.length}</p>
              </div>
              <div className="admin-analytics-item">
                <h4 className="admin-analytics-title">Total Users</h4>
                <p className="admin-analytics-value">{users.length}</p>
              </div>
            </div>
            <div className="analytics-section google-data">
              <h3 className="analytics-section-title">Google Analytics (Last 30 Days)</h3>
              {analyticsData.ga ? (
                <>
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Active Users</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[0]?.value || 'N/A'}</p>
                  </div>
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Page Views</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[1]?.value || 'N/A'}</p>
                  </div>
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Sessions</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[2]?.value || 'N/A'}</p>
                  </div>
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Bounce Rate</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[3]?.value ? `${(parseFloat(analyticsData.ga.rows[0].metricValues[3].value) * 100).toFixed(1)}%` : 'N/A'}</p>
                  </div>
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Avg. Session Duration</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[4]?.value ? `${Math.round(analyticsData.ga.rows[0].metricValues[4].value)}s` : 'N/A'}</p>
                  </div>
                </>
              ) : (
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Loading...</h4>
                  <p className="admin-analytics-value">Awaiting data</p>
                </div>
              )}
            </div>
            <div className="analytics-section google-data">
              <h3 className="analytics-section-title">Google Search Console (Last 30 Days)</h3>
              {analyticsData.gsc ? (
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Top Search Queries</h4>
                  {analyticsData.gsc.rows && analyticsData.gsc.rows.length > 0 ? (
                    <ul className="search-queries">
                      {analyticsData.gsc.rows.map((row, index) => (
                        <li key={index}>{row.keys[0]}: {row.clicks} clicks</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-analytics-value">No data available</p>
                  )}
                </div>
              ) : (
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Loading...</h4>
                  <p className="admin-analytics-value">Awaiting data</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Admin</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>
                      <button onClick={() => toggleUserAdmin(u.id, u.is_admin)} className={`admin-toggle-button ${u.is_admin ? 'active' : ''}`} disabled={u.id === user.id}>
                        {u.is_admin ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => deleteUser(u.id)} className="admin-delete-button" disabled={u.id === user.id}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
