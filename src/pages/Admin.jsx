import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../styles.css';

function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
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
    description: '',
    category: '',
    tags: ''
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
  const [songCategoryFilter, setSongCategoryFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [analyticsSection, setAnalyticsSection] = useState('local');
  const [visitorPage, setVisitorPage] = useState(1);
  const visitorsPerPage = 10;
  const navigate = useNavigate();
  const location = useLocation();

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
      if (activeTab === 'analytics') fetchAnalytics();

      const fetchVisitors = async () => {
        try {
          const { data: adminProfiles, error: adminError } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_admin', true);
          if (adminError) throw adminError;
          const adminIds = adminProfiles.map(profile => profile.id);
          console.log('Admin IDs:', adminIds); // Debug

          const { data: allVisitors, error: visitorError } = await supabase
            .from('visitors')
            .select('id, ip_address, page_url, device_type, visit_timestamp, user_id, referrer, city, country, duration')
            .order('visit_timestamp', { ascending: false });
          if (visitorError) throw visitorError;
          console.log('All Visitors:', allVisitors); // Debug

          const filteredVisitors = allVisitors.filter(visitor => 
            !visitor.user_id || !adminIds.includes(visitor.user_id)
          );
          console.log('Filtered Visitors:', filteredVisitors); // Debug

          setVisitorData(filteredVisitors || []);
          if (filteredVisitors.length === 0) {
            console.log('No non-admin visitors found'); // Debug
          }
        } catch (error) {
          console.error('Visitor fetch error:', error.message); // Debug
          setError('Failed to load visitor data: ' + error.message);
        }
      };

      if (activeTab === 'analytics' && analyticsSection === 'visitors') {
        fetchVisitors();
        // Refresh every 30 seconds when on Visitors tab
        const visitorInterval = setInterval(fetchVisitors, 30000);
        const visitorSubscription = supabase
          .channel('visitors')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, (payload) => {
            console.log('New visitor inserted:', payload.new); // Debug
            setVisitorData((current) => [payload.new, ...current.filter(v => v.id !== payload.new.id)]);
          })
          .subscribe((status) => {
            console.log('Subscription status:', status); // Debug
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to visitors channel');
            }
          });

        return () => {
          clearInterval(visitorInterval);
          supabase.removeChannel(visitorSubscription);
        };
      }

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

      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      const editSongId = params.get('editSongId');
      if (tab === 'songs' && editSongId) {
        setActiveTab('songs');
        const songToEdit = songs.find(song => song.id === parseInt(editSongId, 10));
        if (songToEdit) {
          editSong(songToEdit);
        } else {
          const { data: songData, error: songError } = await supabase
            .from('songs')
            .select('*')
            .eq('id', parseInt(editSongId, 10))
            .single();
          if (!songError && songData) {
            editSong(songData);
          }
        }
      }

      return () => {
        // Cleanup for other subscriptions if any
      };
    };
    fetchUser();
  }, [navigate, location.search, activeTab, analyticsSection]);

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
            description: songForm.description || null,
            category: songForm.category || null,
            tags: songForm.tags ? songForm.tags.split(',').map(tag => tag.trim()) : null
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
            description: songForm.description || null,
            category: songForm.category || null,
            tags: songForm.tags ? songForm.tags.split(',').map(tag => tag.trim()) : null
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
        description: '',
        category: '',
        tags: ''
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
      description: song.description || '',
      category: song.category || '',
      tags: song.tags ? song.tags.join(', ') : ''
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
    const title = song.title || '';
    const composer = song.composer || '';
    const tags = song.tags || [];
    const matchesSearch = 
      title.toLowerCase().includes(songSearch.toLowerCase()) || 
      composer.toLowerCase().includes(songSearch.toLowerCase()) ||
      (tags && tags.some(tag => (tag || '').toLowerCase().includes(songSearch.toLowerCase())));
    const matchesFilter = 
      songFilter === 'all' || 
      (songFilter === 'public' && song.is_public) || 
      (songFilter === 'private' && !song.is_public);
    const matchesCategory = 
      songCategoryFilter === 'all' || (song.category || '') === songCategoryFilter;
    return matchesSearch && matchesFilter && matchesCategory;
  });

  const filteredUsers = users.filter(user => 
    (user.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

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

  const indexOfLastVisitor = visitorPage * visitorsPerPage;
  const indexOfFirstVisitor = indexOfLastVisitor - visitorsPerPage;
  const currentVisitors = visitorData.slice(indexOfFirstVisitor, indexOfLastVisitor);
  const totalVisitorPages = Math.ceil(visitorData.length / visitorsPerPage);

  const paginate = (pageNumber) => setVisitorPage(pageNumber);

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2 className="admin-title">Admin Dashboard</h2>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      <div className="tab-bar">
        <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-button ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>Songs</button>
        <button className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Blog Posts</button>
        <button className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
        <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Manage Users</button>
        <button className={`tab-button ${activeTab === 'songOfTheWeek' ? 'active' : ''}`} onClick={() => setActiveTab('songOfTheWeek')}>Song of the Week</button>
        <button className={`tab-button ${activeTab === 'advert' ? 'active' : ''}`} onClick={() => setActiveTab('advert')}>Advert</button>
      </div>
      <div className="admin-content">
        {error && (
          <div className="error-alert">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="overview-card">
              <h3>Total Songs</h3>
              <p>{songs.length}</p>
            </div>
            <div className="overview-card">
              <h3>Total Downloads</h3>
              <p>{totalDownloads}</p>
            </div>
            <div className="overview-card">
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </div>
            <div className="overview-card">
              <h3>Total Blog Posts</h3>
              <p>{posts.length}</p>
            </div>
          </div>
        )}
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
              <div className="admin-form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={songForm.category}
                  onChange={(e) => setSongForm({ ...songForm, category: e.target.value })}
                  className="admin-form-input"
                >
                  <option value="">Select Category</option>
                  <option value="Entrance">Entrance</option>
                  <option value="Kyrie">Kyrie</option>
                  <option value="Gloria">Gloria</option>
                  <option value="Responsorial Psalm">Responsorial Psalm</option>
                  <option value="Gospel Acclamation">Gospel Acclamation</option>
                  <option value="Credo">Credo</option>
                  <option value="Response to prayers">Response to Prayers</option>
                  <option value="Preconsecration">Preconsecration</option>
                  <option value="Offertory">Offertory</option>
                  <option value="Sanctus">Sanctus</option>
                  <option value="Agnus Dei">Agnus Dei</option>
                  <option value="Communion">Communion</option>
                  <option value="Dismissal">Dismissal</option>
                  <option value="Lent">Lent</option>
                  <option value="Pentecost">Pentecost</option>
                  <option value="Easter">Easter</option>
                  <option value="Advent">Advent</option>
                  <option value="Christmas">Christmas</option>
                  <option value="Trinity">Trinity</option>
                  <option value="Marian">Marian</option>
                  <option value="Classical">Classical</option>
                </select>
              </div>
              <input 
                type="text" 
                placeholder="Tags (comma-separated, e.g., piano, vocal)" 
                value={songForm.tags} 
                onChange={(e) => setSongForm({ ...songForm, tags: e.target.value })} 
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
                      description: '',
                      category: '',
                      tags: ''
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
                placeholder="Search songs or tags..." 
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
              <select 
                value={songCategoryFilter} 
                onChange={(e) => setSongCategoryFilter(e.target.value)} 
                className="admin-filter-select"
              >
                <option value="all">All Categories</option>
                <option value="Entrance">Entrance</option>
                <option value="Kyrie">Kyrie</option>
                <option value="Gloria">Gloria</option>
                <option value="Responsorial Psalm">Responsorial Psalm</option>
                <option value="Gospel Acclamation">Gospel Acclamation</option>
                <option value="Credo">Credo</option>
                <option value="Response to prayers">Response to Prayers</option>
                <option value="Preconsecration">Preconsecration</option>
                <option value="Offertory">Offertory</option>
                <option value="Sanctus">Sanctus</option>
                <option value="Agnus Dei">Agnus Dei</option>
                <option value="Communion">Communion</option>
                <option value="Dismissal">Dismissal</option>
                <option value="Lent">Lent</option>
                <option value="Pentecost">Pentecost</option>
                <option value="Easter">Easter</option>
                <option value="Advent">Advent</option>
                <option value="Christmas">Christmas</option>
                <option value="Trinity">Trinity</option>
                <option value="Marian">Marian</option>
                <option value="Classical">Classical</option>
              </select>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Composer</th>
                    <th>Category</th>
                    <th>Tags</th>
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
                      <td>{song.category || 'N/A'}</td>
                      <td>{song.tags ? song.tags.join(', ') : 'N/A'}</td>
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
                    style={{ height: '300px' }}
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
            <div className="analytics-sub-tab-bar">
              <button className={`sub-tab-button ${analyticsSection === 'local' ? 'active' : ''}`} onClick={() => setAnalyticsSection('local')}>Local Data</button>
              <button className={`sub-tab-button ${analyticsSection === 'ga' ? 'active' : ''}`} onClick={() => setAnalyticsSection('ga')}>Google Analytics</button>
              <button className={`sub-tab-button ${analyticsSection === 'gsc' ? 'active' : ''}`} onClick={() => setAnalyticsSection('gsc')}>Search Console</button>
              <button className={`sub-tab-button ${analyticsSection === 'visitors' ? 'active' : ''}`} onClick={() => setAnalyticsSection('visitors')}>Visitors</button>
            </div>
            {analyticsSection === 'local' && (
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
            )}
            {analyticsSection === 'ga' && (
              <div className="analytics-section google-data">
                <h3 className="analytics-section-title">Google Analytics (Last 30 Days)</h3>
                {analyticsData.ga ? (
                  analyticsData.ga.error ? (
                    <p>Error: {analyticsData.ga.error}</p>
                  ) : analyticsData.ga.rows?.length > 0 ? (
                    <div className="analytics-row">
                      <div className="admin-analytics-item">
                        <h4 className="admin-analytics-title">Active Users</h4>
                        <p className="admin-analytics-value">{analyticsData.ga.rows[0].metricValues[0]?.value || 'N/A'}</p>
                      </div>
                      <div className="admin-analytics-item">
                        <h4 className="admin-analytics-title">Page Views</h4>
                        <p className="admin-analytics-value">{analyticsData.ga.rows[0].metricValues[1]?.value || 'N/A'}</p>
                      </div>
                      <div className="admin-analytics-item">
                        <h4 className="admin-analytics-title">Sessions</h4>
                        <p className="admin-analytics-value">{analyticsData.ga.rows[0].metricValues[2]?.value || 'N/A'}</p>
                      </div>
                      <div className="admin-analytics-item">
                        <h4 className="admin-analytics-title">Bounce Rate</h4>
                        <p className="admin-analytics-value">{analyticsData.ga.rows[0].metricValues[3]?.value ? `${(parseFloat(analyticsData.ga.rows[0].metricValues[3].value) * 100).toFixed(1)}%` : 'N/A'}</p>
                      </div>
                      <div className="admin-analytics-item">
                        <h4 className="admin-analytics-title">Avg. Duration</h4>
                        <p className="admin-analytics-value">{analyticsData.ga.rows[0].metricValues[4]?.value ? `${Math.round(analyticsData.ga.rows[0].metricValues[4].value)}s` : 'N/A'}</p>
                      </div>
                      <div className="admin-analytics-item">
                        <h4 className="admin-analytics-title">Event Count</h4>
                        <p className="admin-analytics-value">{analyticsData.ga.rows[0].metricValues[5]?.value || 'N/A'}</p>
                      </div>
                      <div className="admin-analytics-item">
                        <h4 className="admin-analytics-title">New Users</h4>
                        <p className="admin-analytics-value">{analyticsData.ga.rows[0].metricValues[6]?.value || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <p>No Google Analytics data available for the past 30 days.</p>
                  )
                ) : (
                  <p>Loading Google Analytics data...</p>
                )}
              </div>
            )}
            {analyticsSection === 'gsc' && (
              <div className="analytics-section google-data">
                <h3 className="analytics-section-title">Search Console (Last 30 Days)</h3>
                {analyticsData.gsc ? (
                  analyticsData.gsc.error ? (
                    <p>Error: {analyticsData.gsc.error}</p>
                  ) : analyticsData.gsc.rows?.length > 0 ? (
                    <div className="analytics-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Query</th>
                            <th>Clicks</th>
                            <th>Impressions</th>
                            <th>CTR</th>
                            <th>Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.gsc.rows.map((row, index) => (
                            <tr key={index}>
                              <td>{row.keys[0]}</td>
                              <td>{row.clicks}</td>
                              <td>{row.impressions}</td>
                              <td>{((row.clicks / row.impressions) * 100).toFixed(1)}%</td>
                              <td>{row.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>No Search Console data available for the past 30 days.</p>
                  )
                ) : (
                  <p>Loading Search Console data...</p>
                )}
              </div>
            )}
            {analyticsSection === 'visitors' && (
              <div className="analytics-section visitors-data">
                <h3 className="analytics-section-title">Recent Visitors</h3>
                {visitorData.length > 0 ? (
                  <>
                    <div className="analytics-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>IP Address</th>
                            <th>Page URL</th>
                            <th>Device Type</th>
                            <th>Timestamp</th>
                            <th>User ID</th>
                            <th>Referrer</th>
                            <th>City</th>
                            <th>Country</th>
                            <th>Duration (s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentVisitors.map((visitor) => (
                            <tr key={visitor.id}>
                              <td>{visitor.ip_address}</td>
                              <td>{visitor.page_url}</td>
                              <td>{visitor.device_type}</td>
                              <td>{new Date(visitor.visit_timestamp).toLocaleString()}</td>
                              <td>{visitor.user_id || 'N/A'}</td>
                              <td>{visitor.referrer || 'Direct'}</td>
                              <td>{visitor.city || 'Unknown'}</td>
                              <td>{visitor.country || 'Unknown'}</td>
                              <td>{visitor.duration || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pagination">
                      <button 
                        onClick={() => paginate(visitorPage - 1)} 
                        disabled={visitorPage === 1}
                        className="pagination-button"
                      >
                        Previous
                      </button>
                      <span className="pagination-info">Page {visitorPage} of {totalVisitorPages}</span>
                      <button 
                        onClick={() => paginate(visitorPage + 1)} 
                        disabled={visitorPage === totalVisitorPages}
                        className="pagination-button"
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <p>No visitor data available.</p>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'users' && (
          <div className="admin-users-container">
            <div className="admin-filter-bar">
              <input 
                type="text" 
                placeholder="Search users by name or email..." 
                value={userSearch} 
                onChange={(e) => setUserSearch(e.target.value)} 
                className="admin-filter-input" 
              />
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Admin</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.full_name || 'N/A'}</td>
                      <td>{u.email}</td>
                      <td>
                        <button 
                          onClick={() => toggleUserAdmin(u.id, u.is_admin)} 
                          className={`admin-toggle-button ${u.is_admin ? 'active' : ''}`}
                          disabled={u.id === user.id}
                        >
                          {u.is_admin ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td>
                        <button 
                          onClick={() => deleteUser(u.id)} 
                          className="admin-delete-button"
                          disabled={u.id === user.id}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'songOfTheWeek' && (
          <div className="admin-form-card">
            <h3 className="admin-form-title">Song of the Week</h3>
            <form onSubmit={handleSongOfTheWeekSubmit} className="admin-modern-form-grid">
              <div className="admin-form-group full-width">
                <label htmlFor="songOfTheWeekHtml">Embed Code (iframe or audio URL)</label>
                <ReactQuill
                  id="songOfTheWeekHtml"
                  value={songOfTheWeekHtml}
                  onChange={setSongOfTheWeekHtml}
                  modules={quillModules}
                  formats={quillFormats}
                  className="admin-quill-editor"
                  placeholder="Paste embed code or audio URL here..."
                  style={{ height: '200px' }}
                />
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="admin-form-submit">Update Song of the Week</button>
              </div>
            </form>
          </div>
        )}
        {activeTab === 'advert' && (
          <div className="admin-advert-container">
            <div className="admin-form-card">
              <h3 className="admin-form-title">{editingAdId ? 'Edit Advertisement' : 'Add New Advertisement'}</h3>
              <form onSubmit={handleAdSubmit} className="admin-modern-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="adName">Name</label>
                  <input
                    id="adName"
                    type="text"
                    placeholder="e.g., Banner Ad 1"
                    value={adForm.name}
                    onChange={(e) => setAdForm({ ...adForm, name: e.target.value })}
                    className="admin-form-input"
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
                    <option value="home_below_sotw">Home - Below Song of the Week</option>
                    <option value="song_above_content">Song Page - Above Content</option>
                    <option value="song_below_content">Song Page - Below Content</option>
                    <option value="post_above_content">Post Page - Above Content</option>
                    <option value="post_below_content">Post Page - Below Content</option>
                  </select>
                </div>
                <div className="admin-form-group full-width">
                  <label htmlFor="adCode">Ad Code</label>
                  <textarea
                    id="adCode"
                    placeholder="Paste your ad code here (e.g., Google AdSense script)"
                    value={adForm.code}
                    onChange={(e) => setAdForm({ ...adForm, code: e.target.value })}
                    className="admin-form-input"
                    rows="5"
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={adForm.is_active}
                      onChange={(e) => setAdForm({ ...adForm, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
                <div className="admin-form-actions">
                  <button type="submit" className="admin-form-submit">{editingAdId ? 'Update Ad' : 'Add Ad'}</button>
                  {editingAdId && (
                    <button type="button" className="admin-cancel-button" onClick={() => { setAdForm({ name: '', code: '', position: 'home_above_sotw', is_active: true }); setEditingAdId(null); }}>Cancel</button>
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
                      <td>{ad.position}</td>
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
