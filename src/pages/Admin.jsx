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
  const [ads, setAds] = useState([]);
  const [songForm, setSongForm] = useState({ 
    title: '', 
    composer: '', 
    google_drive_file_id: '', 
    github_file_url: '', 
    permalink: '', 
    is_public: true,
    source: 'google_drive',
    audio_url: '',
    description: ''
  });
  const [postForm, setPostForm] = useState({ 
    title: '', 
    content: '', 
    permalink: '', 
    meta_description: '', 
    tags: '', 
    category: '', 
    focus_keyword: '',
    featured_image_url: ''
  });
  const [adForm, setAdForm] = useState({
    name: '',
    code: '',
    position: 'home_above_sotw',
    is_active: true
  });
  const [analyticsData, setAnalyticsData] = useState({ ga: null, gsc: null });
  const [visitorData, setVisitorData] = useState([]);
  const [topSongs, setTopSongs] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [songOfTheWeekHtml, setSongOfTheWeekHtml] = useState('');
  const [editingSongId, setEditingSongId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingAdId, setEditingAdId] = useState(null);
  const [error, setError] = useState(null);
  const [songSearch, setSongSearch] = useState('');
  const [songFilter, setSongFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        navigate('/login');
        return;
      }
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        navigate('/login');
        return;
      }
      setUser(userData.user);

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userData.user.id)
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
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch('/.netlify/functions/fetch-users', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('Failed to fetch users');
          const users = await response.json();
          setUsers(users || []);
        } catch (err) {
          setError('Failed to load users: ' + (err.name === 'AbortError' ? 'Request timed out' : err.message));
        }
      };
      fetchUsers();

      const fetchAds = async () => {
        const { data, error } = await supabase.from('advertisements').select('*');
        if (error) setError('Failed to load ads: ' + error.message);
        else setAds(data || []);
      };
      fetchAds();

      const fetchAnalytics = async () => {
        try {
          const response = await fetch('/.netlify/functions/analytics');
          if (!response.ok) throw new Error('Failed to fetch analytics data');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setAnalyticsData(data);
        } catch (err) {
          setError('Analytics fetch failed: ' + err.message);
        }
      };
      fetchAnalytics();

      const fetchVisitors = async () => {
        const { data, error } = await supabase
          .from('visitors')
          .select('*')
          .order('visit_timestamp', { ascending: false })
          .limit(100);
        if (error) setError('Failed to load visitor data: ' + error.message);
        else setVisitorData(data || []);
      };
      fetchVisitors();

      // Real-time visitor subscription
      const visitorSubscription = supabase
        .channel('visitors')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, (payload) => {
          setVisitorData((current) => {
            const newData = [payload.new, ...current].slice(0, 100);
            return newData;
          });
        })
        .subscribe();

      const fetchTopSongs = async () => {
        const { data, error } = await supabase
          .from('songs')
          .select('title, downloads')
          .order('downloads', { ascending: false })
          .limit(5);
        if (error) setError('Failed to load top songs: ' + error.message);
        else setTopSongs(data || []);
      };
      fetchTopSongs();

      const fetchTopPosts = async () => {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('title, views')
          .order('views', { ascending: false, nullsLast: true })
          .limit(5);
        if (error) console.warn('Top posts fetch warning: ' + error.message);
        else setTopPosts(data || []);
      };
      fetchTopPosts();

      const fetchSongOfTheWeek = async () => {
        const { data, error } = await supabase
          .from('song_of_the_week')
          .select('audio_url')
          .single();
        if (error) console.warn('Song of the week fetch warning: ' + error.message);
        else setSongOfTheWeekHtml(data?.audio_url || '');
      };
      fetchSongOfTheWeek();

      return () => {
        supabase.removeChannel(visitorSubscription);
      };
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
            is_public: songForm.is_public,
            audio_url: songForm.audio_url || null,
            description: songForm.description || null
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
            downloads: 0,
            audio_url: songForm.audio_url || null,
            description: songForm.description || null
          }]);
        if (error) throw error;
      }
      setSongForm({ 
        title: '', 
        composer: '', 
        google_drive_file_id: '', 
        github_file_url: '', 
        permalink: '', 
        is_public: true, 
        source: 'google_drive',
        audio_url: '',
        description: ''
      });
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

      const tagsArray = postForm.tags
        ? postForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : null;

      const postData = {
        title: postForm.title,
        content: postForm.content,
        permalink: generatedPermalink,
        meta_description: postForm.meta_description || null,
        tags: tagsArray,
        category: postForm.category || null,
        focus_keyword: postForm.focus_keyword || null,
        featured_image_url: postForm.featured_image_url || null,
        views: 0
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
      setPostForm({ title: '', content: '', permalink: '', meta_description: '', tags: '', category: '', focus_keyword: '', featured_image_url: '' });
      const { data } = await supabase.from('blog_posts').select('*');
      setPosts(data || []);
    } catch (err) {
      setError('Failed to save post: ' + err.message);
    }
  };

  const handleAdSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAdId) {
        const { error } = await supabase
          .from('advertisements')
          .update({ 
            name: adForm.name, 
            code: adForm.code, 
            position: adForm.position, 
            is_active: adForm.is_active 
          })
          .eq('id', editingAdId);
        if (error) throw error;
        setEditingAdId(null);
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([{ 
            name: adForm.name, 
            code: adForm.code, 
            position: adForm.position, 
            is_active: adForm.is_active 
          }]);
        if (error) throw error;
      }
      setAdForm({ name: '', code: '', position: 'home_above_sotw', is_active: true });
      const { data } = await supabase.from('advertisements').select('*');
      setAds(data || []);
      setError('Advertisement saved successfully!');
    } catch (err) {
      setError('Failed to save advertisement: ' + err.message);
    }
  };

  const handleSongOfTheWeekSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: existingData, error: fetchError } = await supabase
        .from('song_of_the_week')
        .select('id')
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingData) {
        const { error } = await supabase
          .from('song_of_the_week')
          .update({ audio_url: songOfTheWeekHtml })
          .eq('id', existingData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('song_of_the_week')
          .insert([{ audio_url: songOfTheWeekHtml }]);
        if (error) throw error;
      }
      setError('Song of the Week updated successfully!');
    } catch (err) {
      setError('Failed to update Song of the Week: ' + err.message);
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
      source: song.google_drive_file_id ? 'google_drive' : 'github',
      audio_url: song.audio_url || '',
      description: song.description || ''
    });
    setEditingSongId(song.id);
  };

  const editPost = (post) => {
    setPostForm({ 
      title: post.title, 
      content: post.content, 
      permalink: post.permalink || '', 
      meta_description: post.meta_description || '', 
      tags: post.tags ? post.tags.join(', ') : '',
      category: post.category || '', 
      focus_keyword: post.focus_keyword || '',
      featured_image_url: post.featured_image_url || ''
    });
    setEditingPostId(post.id);
  };

  const editAd = (ad) => {
    setAdForm({ 
      name: ad.name, 
      code: ad.code, 
      position: ad.position, 
      is_active: ad.is_active 
    });
    setEditingAdId(ad.id);
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

  const deleteAd = async (id) => {
    if (window.confirm('Are you sure you want to delete this advertisement?')) {
      const { error } = await supabase.from('advertisements').delete().eq('id', id);
      if (error) setError('Failed to delete ad: ' + error.message);
      else setAds(ads.filter(ad => ad.id !== id));
    }
  };

  const toggleSongPublic = async (id, isPublic) => {
    const { error } = await supabase.from('songs').update({ is_public: !isPublic }).eq('id', id);
    if (error) setError('Failed to update song status: ' + error.message);
    else setSongs(songs.map(song => song.id === id ? { ...song, is_public: !isPublic } : song));
  };

  const toggleAdActive = async (id, isActive) => {
    const { error } = await supabase.from('advertisements').update({ is_active: !isActive }).eq('id', id);
    if (error) setError('Failed to update ad status: ' + error.message);
    else setAds(ads.map(ad => ad.id === id ? { ...ad, is_active: !isActive } : ad));
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
      fetchUsers();
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
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) {
        setError('Failed to delete user from auth: ' + authError.message);
        return;
      }
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
      if (profileError) console.warn('Profile delete warning: ' + profileError.message);
      setUsers(users.filter(u => u.id !== id));
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

  const fetchUsers = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('/.netlify/functions/fetch-users', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      setUsers(users || []);
    } catch (err) {
      setError('Failed to load users: ' + (err.name === 'AbortError' ? 'Request timed out' : err.message));
    }
  };

  if (!user) return null;

  const totalDownloads = songs.reduce((sum, song) => sum + (song.downloads || 0), 0);
  const publicSongs = songs.filter(song => song.is_public).length;
  const privateSongs = songs.length - publicSongs;

  const totalVisits = visitorData.length;
  const uniqueVisitors = new Set(visitorData.map(v => v.ip_address)).size;
  const avgDuration = visitorData.length
    ? Math.round(visitorData.reduce((sum, v) => sum + (v.duration || 0), 0) / visitorData.length)
    : 0;
  const topCities = Object.entries(
    visitorData.reduce((acc, v) => {
      acc[v.city] = (acc[v.city] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topReferrers = Object.entries(
    visitorData.reduce((acc, v) => {
      acc[v.referrer] = (acc[v.referrer] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const deviceTypes = Object.entries(
    visitorData.reduce((acc, v) => {
      acc[v.device_type] = (acc[v.device_type] || 0) + 1;
      return acc;
    }, {})
  );

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
        <button className={`tab-button ${activeTab === 'songOfTheWeek' ? 'active' : ''}`} onClick={() => setActiveTab('songOfTheWeek')}>Song of the Week</button>
        <button className={`tab-button ${activeTab === 'advert' ? 'active' : ''}`} onClick={() => setActiveTab('advert')}>Advert</button>
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
              <input 
                type="text" 
                placeholder="Audio URL (e.g., https://archive.org/download/...)" 
                value={songForm.audio_url} 
                onChange={(e) => setSongForm({ ...songForm, audio_url: e.target.value })} 
                className="admin-form-input" 
              />
              <textarea 
                placeholder="Song Description" 
                value={songForm.description} 
                onChange={(e) => setSongForm({ ...songForm, description: e.target.value })} 
                className="admin-form-input" 
                rows="3"
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
                  onClick={() => { 
                    setSongForm({ 
                      title: '', 
                      composer: '', 
                      google_drive_file_id: '', 
                      github_file_url: '', 
                      permalink: '', 
                      is_public: true, 
                      source: 'google_drive',
                      audio_url: '',
                      description: ''
                    }); 
                    setEditingSongId(null); 
                  }}
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
                <div className="admin-form-group">
                  <label htmlFor="featured_image_url">Featured Image URL</label>
                  <input
                    id="featured_image_url"
                    type="text"
                    placeholder="e.g., https://storage.googleapis.com/your-bucket/image.jpg"
                    value={postForm.featured_image_url}
                    onChange={(e) => setPostForm({ ...postForm, featured_image_url: e.target.value })}
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
                    <button type="button" className="admin-cancel-button" onClick={() => { setPostForm({ title: '', content: '', permalink: '', meta_description: '', tags: '', category: '', focus_keyword: '', featured_image_url: '' }); setEditingPostId(null); }}>Cancel</button>
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
          <div className="admin-analytics-container">
            <div className="analytics-section local-data">
              <h3 className="analytics-section-title">Local Data</h3>
              <div className="analytics-row">
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
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Top Songs</h4>
                  {topSongs.length > 0 ? (
                    <ul className="top-items">
                      {topSongs.map((song, index) => (
                        <li key={index}>{song.title}: {song.downloads || 0}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-analytics-value">N/A</p>
                  )}
                </div>
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Top Posts</h4>
                  {topPosts.length > 0 ? (
                    <ul className="top-items">
                      {topPosts.map((post, index) => (
                        <li key={index}>{post.title}: {post.views || 0}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-analytics-value">N/A</p>
                  )}
                </div>
              </div>
            </div>
            <div className="analytics-section google-data">
              <h3 className="analytics-section-title">Google Analytics (Last 30 Days)</h3>
              {analyticsData.ga ? (
                <div className="analytics-row">
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
                    <h4 className="admin-analytics-title">Avg. Duration</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[4]?.value ? `${Math.round(analyticsData.ga.rows[0].metricValues[4].value)}s` : 'N/A'}</p>
                  </div>
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Event Count</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[5]?.value || 'N/A'}</p>
                  </div>
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">New Users</h4>
                    <p className="admin-analytics-value">{analyticsData.ga.rows?.[0]?.metricValues?.[6]?.value || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="analytics-row">
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Loading...</h4>
                    <p className="admin-analytics-value">Awaiting data</p>
                  </div>
                </div>
              )}
            </div>
            <div className="analytics-section google-data">
              <h3 className="analytics-section-title">Google Search Console (Last 30 Days)</h3>
              {analyticsData.gsc ? (
                <div className="analytics-row">
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Top Queries</h4>
                    {analyticsData.gsc.rows && analyticsData.gsc.rows.length > 0 ? (
                      <ul className="search-queries">
                        {analyticsData.gsc.rows.map((row, index) => (
                          <li key={index}>
                            {row.keys[0]}: {row.clicks} clicks, {row.impressions} imp., {(row.ctr * 100).toFixed(1)}% CTR, {row.position.toFixed(1)} pos.
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="admin-analytics-value">N/A</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="analytics-row">
                  <div className="admin-analytics-item">
                    <h4 className="admin-analytics-title">Loading...</h4>
                    <p className="admin-analytics-value">Awaiting data</p>
                  </div>
                </div>
              )}
            </div>
            <div className="analytics-section visitor-data">
              <h3 className="analytics-section-title">Site Visitors (Last 100 Visits)</h3>
              <div className="analytics-row">
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Total Visits</h4>
                  <p className="admin-analytics-value">{totalVisits}</p>
                </div>
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Unique Visitors</h4>
                  <p className="admin-analytics-value">{uniqueVisitors}</p>
                </div>
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Avg. Duration</h4>
                  <p className="admin-analytics-value">{avgDuration}s</p>
                </div>
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Top Cities</h4>
                  <ul className="top-items">
                    {topCities.map(([city, count]) => (
                      <li key={city}>{city}: {count}</li>
                    ))}
                  </ul>
                </div>
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Top Referrers</h4>
                  <ul className="top-items">
                    {topReferrers.map(([referrer, count]) => (
                      <li key={referrer}>{referrer}: {count}</li>
                    ))}
                  </ul>
                </div>
                <div className="admin-analytics-item">
                  <h4 className="admin-analytics-title">Device Types</h4>
                  <ul className="top-items">
                    {deviceTypes.map(([type, count]) => (
                      <li key={type}>{type}: {count}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <h4 className="analytics-section-subtitle">Recent Visits</h4>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>IP</th>
                      <th>City</th>
                      <th>Page</th>
                      <th>Duration (s)</th>
                      <th>Clicks</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorData.map(visit => (
                      <tr key={visit.id}>
                        <td>{new Date(visit.visit_timestamp).toLocaleString()}</td>
                        <td>{visit.ip_address}</td>
                        <td>{visit.city}</td>
                        <td>{visit.page_url}</td>
                        <td>{visit.duration || 0}</td>
                        <td>{visit.click_events.length ? visit.click_events.map(e => e.element).join(', ') : 'None'}</td>
                        <td>{visit.device_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        {activeTab === 'songOfTheWeek' && (
          <div className="admin-form-card">
            <h3 className="admin-form-title">Song of the Week</h3>
            <form onSubmit={handleSongOfTheWeekSubmit} className="admin-form-grid">
              <div className="admin-form-group full-width">
                <label htmlFor="audioUrl">Audio URL</label>
                <input
                  id="audioUrl"
                  type="text"
                  placeholder="e.g., https://archive.org/download/.../song.mp3"
                  value={songOfTheWeekHtml}
                  onChange={(e) => setSongOfTheWeekHtml(e.target.value)}
                  className="admin-form-input"
                />
              </div>
              <button type="submit" className="admin-form-submit">Update Song of the Week</button>
            </form>
            <p className="admin-note">Paste the direct URL to an audio file (e.g., .mp3). Leave blank to remove the player.</p>
          </div>
        )}
        {activeTab === 'advert' && (
          <div className="admin-advert-tab">
            <div className="admin-form-card">
              <h3 className="admin-form-title">{editingAdId ? 'Edit Advertisement' : 'Add New Advertisement'}</h3>
              <form onSubmit={handleAdSubmit} className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="adName">Ad Name *</label>
                  <input
                    id="adName"
                    type="text"
                    placeholder="e.g., Home Banner"
                    value={adForm.name}
                    onChange={(e) => setAdForm({ ...adForm, name: e.target.value })}
                    className="admin-form-input"
                    required
                  />
                </div>
                <div className="admin-form-group full-width">
                  <label htmlFor="adCode">Ad Code *</label>
                  <textarea
                    id="adCode"
                    placeholder="Paste your ad script here (e.g., Google AdSense code)"
                    value={adForm.code}
                    onChange={(e) => setAdForm({ ...adForm, code: e.target.value })}
                    className="admin-form-input"
                    rows="4"
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="adPosition">Position</label>
                  <select
                    id="adPosition"
                    value={adForm.position}
                    onChange={(e) => setAdForm({ ...adForm, position: e.target.value })}
                    className="admin-form-input"
                  >
                    <option value="home_above_sotw">Home - Above Song of the Week</option>
                    <option value="other_pages_below_header">Other Pages - Below Header</option>
                    <option value="song_page_below_header">Song Pages - Below Header</option>
                  </select>
                </div>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={adForm.is_active}
                    onChange={(e) => setAdForm({ ...adForm, is_active: e.target.checked })}
                  />
                  Active
                </label>
                <div className="admin-form-actions">
                  <button type="submit" className="admin-form-submit">{editingAdId ? 'Update Ad' : 'Add Ad'}</button>
                  {editingAdId && (
                    <button
                      type="button"
                      className="admin-cancel-button"
                      onClick={() => { setAdForm({ name: '', code: '', position: 'home_above_sotw', is_active: true }); setEditingAdId(null); }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map(ad => (
                    <tr key={ad.id}>
                      <td>{ad.name}</td>
                      <td>{ad.position === 'home_above_sotw' ? 'Home - Above SOTW' : ad.position === 'other_pages_below_header' ? 'Other Pages - Below Header' : 'Song Pages - Below Header'}</td>
                      <td>
                        <button
                          onClick={() => toggleAdActive(ad.id, ad.is_active)}
                          className={`admin-toggle-button ${ad.is_active ? 'active' : ''}`}
                        >
                          {ad.is_active ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => editAd(ad)} className="admin-edit-button">Edit</button>
                        <button onClick={() => deleteAd(ad.id)} className="admin-delete-button">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
