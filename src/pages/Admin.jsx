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
  const [currentPage, setCurrentPage] = useState({ songs: 1, posts: 1, users: 1, ads: 1, visitors: 1 });
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const navigate = useNavigate();
  const location = useLocation();

  const songCategories = [
    'Entrance', 'Kyrie', 'Gloria', 'Responsorial Psalm', 'Gospel Acclamation', 'Credo', 
    'Response to prayers', 'Preconsecration', 'Offertory', 'Sanctus', 'Agnus Dei', 
    'Communion', 'Dismissal', 'Lent', 'Pentecost', 'Easter', 'Advent', 'Christmas', 
    'Trinity', 'Marian', 'Classical'
  ];

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
          const response = await fetch('/.netlify/functions/fetch-users');
          if (!response.ok) throw new Error('Failed to fetch users');
          const users = await response.json();
          setUsers(users || []);
        } catch (err) {
          setError('Failed to load users: ' + err.message);
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
        const { data, error } = await supabase
          .from('visitors')
          .select('ip_address, page_visited, click_events, visit_timestamp, duration, city, country, device_type, referrer')
          .order('visit_timestamp', { ascending: false });
        if (error) setError('Failed to load visitor data: ' + error.message);
        else setVisitorData(data || []);
      };
      if (activeTab === 'analytics') fetchVisitors();

      const visitorSubscription = supabase
        .channel('visitors')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, (payload) => {
          setVisitorData((current) => [payload.new, ...current]);
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
        supabase.removeChannel(visitorSubscription);
      };
    };
    fetchUser();
  }, [navigate, location.search, activeTab]);

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
      setCurrentPage(prev => ({ ...prev, songs: 1 }));
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
      setCurrentPage(prev => ({ ...prev, posts: 1 }));
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
      setCurrentPage(prev => ({ ...prev, ads: 1 }));
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
      const response = await fetch('/.netlify/functions/fetch-users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      setUsers(users || []);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    }
  };

  // Pagination Functions
  const paginate = (items, pageKey) => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage[pageKey] - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedItems: items.slice(startIndex, endIndex),
      totalPages,
      totalItems
    };
  };

  const handlePageChange = (pageKey, page) => {
    setCurrentPage(prev => ({ ...prev, [pageKey]: page }));
    window.scrollTo(0, 0);
  };

  const getPaginationRange = (pageKey) => {
    const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
    if (pageKey === 'posts') totalPages = Math.ceil(posts.length / itemsPerPage);
    if (pageKey === 'users') totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (pageKey === 'ads') totalPages = Math.ceil(ads.length / itemsPerPage);
    if (pageKey === 'visitors') totalPages = Math.ceil(visitorData.length / itemsPerPage);
    
    const range = [];
    const maxVisiblePages = 5;
    const sideRange = 2;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      const startRange = Math.max(2, currentPage[pageKey] - sideRange);
      if (startRange > 2) range.push('...');
      for (let i = startRange; i <= Math.min(totalPages - 1, currentPage[pageKey] + sideRange); i++) {
        range.push(i);
      }
      const endRange = Math.min(totalPages - 1, currentPage[pageKey] + sideRange);
      if (endRange < totalPages - 1) range.push('...');
      if (totalPages > 1) range.push(totalPages);
    }
    return range;
  };

  if (!user) return null;

  const totalDownloads = songs.reduce((sum, song) => sum + (song.downloads || 0), 0);
  const publicSongs = songs.filter(song => song.is_public).length;
  const privateSongs = songs.length - publicSongs;

  const { paginatedItems: paginatedSongs, totalPages: songPages } = paginate(filteredSongs, 'songs');
  const { paginatedItems: paginatedPosts, totalPages: postPages } = paginate(posts, 'posts');
  const { paginatedItems: paginatedUsers, totalPages: userPages } = paginate(filteredUsers, 'users');
  const { paginatedItems: paginatedAds, totalPages: adPages } = paginate(ads, 'ads');
  const { paginatedItems: paginatedVisitors, totalPages: visitorPages } = paginate(visitorData, 'visitors');

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
            <div className="overview-card"><h3>Total Songs</h3><p>{songs.length}</p></div>
            <div className="overview-card"><h3>Total Downloads</h3><p>{totalDownloads}</p></div>
            <div className="overview-card"><h3>Total Users</h3><p>{users.length}</p></div>
            <div className="overview-card"><h3>Total Blog Posts</h3><p>{posts.length}</p></div>
          </div>
        )}
        {activeTab === 'songs' && (
          <>
            <form onSubmit={handleSongSubmit} className="admin-form-grid">
              <input type="text" placeholder="Song Title" value={songForm.title} onChange={(e) => setSongForm({ ...songForm, title: e.target.value })} className="admin-form-input" required />
              <input type="text" placeholder="Composer" value={songForm.composer} onChange={(e) => setSongForm({ ...songForm, composer: e.target.value })} className="admin-form-input" required />
              <div className="admin-form-group">
                <label htmlFor="source">File Source</label>
                <select id="source" value={songForm.source} onChange={(e) => setSongForm({ ...songForm, source: e.target.value })} className="admin-form-input">
                  <option value="google_drive">Google Drive</option>
                  <option value="github">GitHub (/public/pdf)</option>
                </select>
              </div>
              {songForm.source === 'google_drive' ? (
                <input type="text" placeholder="Google Drive File ID" value={songForm.google_drive_file_id} onChange={(e) => setSongForm({ ...songForm, google_drive_file_id: e.target.value })} className="admin-form-input" required />
              ) : (
                <input type="text" placeholder="GitHub Raw URL" value={songForm.github_file_url} onChange={(e) => setSongForm({ ...songForm, github_file_url: e.target.value })} className="admin-form-input" required />
              )}
              <input type="text" placeholder="Permalink" value={songForm.permalink} onChange={(e) => setSongForm({ ...songForm, permalink: e.target.value })} className="admin-form-input" />
              <input type="text" placeholder="Audio URL" value={songForm.audio_url} onChange={(e) => setSongForm({ ...songForm, audio_url: e.target.value })} className="admin-form-input" />
              <textarea placeholder="Song Description" value={songForm.description} onChange={(e) => setSongForm({ ...songForm, description: e.target.value })} className="admin-form-input" rows="3" />
              <div className="admin-form-group">
                <label htmlFor="category">Category</label>
                <select id="category" value={songForm.category} onChange={(e) => setSongForm({ ...songForm, category: e.target.value })} className="admin-form-input">
                  <option value="">Select Category</option>
                  {songCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Tags (comma-separated)" value={songForm.tags} onChange={(e) => setSongForm({ ...songForm, tags: e.target.value })} className="admin-form-input" />
              <label className="admin-checkbox">
                <input type="checkbox" checked={songForm.is_public} onChange={(e) => setSongForm({ ...songForm, is_public: e.target.checked })} />
                Public
              </label>
              <button type="submit" className="admin-form-submit">{editingSongId ? 'Update Song' : 'Add Song'}</button>
              {editingSongId && (
                <button type="button" className="admin-cancel-button" onClick={() => { setSongForm({ title: '', composer: '', google_drive_file_id: '', github_file_url: '', permalink: '', is_public: true, source: 'google_drive', audio_url: '', description: '', category: '', tags: '' }); setEditingSongId(null); }}>Cancel</button>
              )}
            </form>
            <div className="admin-filter-bar">
              <input type="text" placeholder="Search songs or tags..." value={songSearch} onChange={(e) => setSongSearch(e.target.value)} className="admin-filter-input" />
              <select value={songFilter} onChange={(e) => setSongFilter(e.target.value)} className="admin-filter-select">
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <select value={songCategoryFilter} onChange={(e) => setSongCategoryFilter(e.target.value)} className="admin-filter-select">
                <option value="all">All Categories</option>
                {songCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            {filteredSongs.length > itemsPerPage && (
              <div className="pagination-top">
                <div className="pagination-controls">
                  <label htmlFor="itemsPerPage">Items per page:</label>
                  <select id="itemsPerPage" value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(prev => ({ ...prev, songs: 1 })); }} className="pagination-select">
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <div className="pagination">
                  <button onClick={() => handlePageChange('songs', currentPage.songs - 1)} disabled={currentPage.songs === 1} className="pagination-button">Previous</button>
                  {getPaginationRange('songs').map((item, index) => (
                    item === '...' ? (
                      <span key={index} className="pagination-ellipsis">...</span>
                    ) : (
                      <button key={index} onClick={() => handlePageChange('songs', item)} className={`pagination-button ${currentPage.songs === item ? 'active' : ''}`}>{item}</button>
                    )
                  ))}
                  <button onClick={() => handlePageChange('songs', currentPage.songs + 1)} disabled={currentPage.songs === songPages} className="pagination-button">Next</button>
                </div>
              </div>
            )}
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
                  {paginatedSongs.map(song => (
                    <tr key={song.id}>
                      <td>{song.title}</td>
                      <td>{song.composer}</td>
                      <td>{song.category || 'N/A'}</td>
                      <td>{song.tags ? song.tags.join(', ') : 'N/A'}</td>
                      <td>{song.google_drive_file_id ? 'Google Drive' : 'GitHub'}</td>
                      <td>{song.downloads || 0}</td>
                      <td>
                        <button onClick={() => toggleSongPublic(song.id, song.is_public)} className={`admin-toggle-button ${song.is_public ? 'active' : ''}`}>
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
                  <input id="title" type="text" placeholder="Enter post title" value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} className="admin-form-input" required />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="permalink">Permalink (auto-generated if blank)</label>
                  <input id="permalink" type="text" placeholder="e.g., my-post-title" value={postForm.permalink} onChange={(e) => setPostForm({ ...postForm, permalink: e.target.value })} className="admin-form-input" />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="featured_image_url">Featured Image URL</label>
                  <input id="featured_image_url" type="text" placeholder="e.g., https://storage.googleapis.com/your-bucket/image.jpg" value={postForm.featured_image_url} onChange={(e) => setPostForm({ ...postForm, featured_image_url: e.target.value })} className="admin-form-input" />
                </div>
                <div className="admin-form-group full-width">
                  <label htmlFor="content">Content</label>
                  <ReactQuill
                    value={postForm.content}
                    onChange={(content) => setPostForm({ ...postForm, content })}
                    modules={quillModules}
                    formats={quillFormats}
                    className="admin-quill-editor large"
                    placeholder="Write your blog post content here..."
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="meta_description">Meta Description</label>
                  <input id="meta_description" type="text" placeholder="Short description for SEO" value={postForm.meta_description} onChange={(e) => setPostForm({ ...postForm, meta_description: e.target.value })} className="admin-form-input" />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="tags">Tags (comma-separated)</label>
                  <input id="tags" type="text" placeholder="e.g., music, choir" value={postForm.tags} onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })} className="admin-form-input" />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="category">Category</label>
                  <input id="category" type="text" placeholder="e.g., Vocal Tips" value={postForm.category} onChange={(e) => setPostForm({ ...postForm, category: e.target.value })} className="admin-form-input" />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="focus_keyword">Focus Keyword</label>
                  <input id="focus_keyword" type="text" placeholder="e.g., vocal warm-ups" value={postForm.focus_keyword} onChange={(e) => setPostForm({ ...postForm, focus_keyword: e.target.value })} className="admin-form-input" />
                </div>
                <div className="admin-form-actions">
                  <button type="submit" className="admin-form-submit">{editingPostId ? 'Update Post' : 'Add Post'}</button>
                  {editingPostId && (
                    <button type="button" className="admin-cancel-button" onClick={() => { setPostForm({ title: '', content: '', permalink: '', meta_description: '', tags: '', category: '', focus_keyword: '', featured_image_url: '' }); setEditingPostId(null); }}>Cancel</button>
                  )}
                </div>
              </form>
            </div>
            {posts.length > itemsPerPage && (
              <div className="pagination-top">
                <div className="pagination-controls">
                  <label htmlFor="itemsPerPagePosts">Items per page:</label>
                  <select id="itemsPerPagePosts" value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(prev => ({ ...prev, posts: 1 })); }} className="pagination-select">
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <div className="pagination">
                  <button onClick={() => handlePageChange('posts', currentPage.posts - 1)} disabled={currentPage.posts === 1} className="pagination-button">Previous</button>
                  {getPaginationRange('posts').map((item, index) => (
                    item === '...' ? (
                      <span key={index} className="pagination-ellipsis">...</span>
                    ) : (
                      <button key={index} onClick={() => handlePageChange('posts', item)} className={`pagination-button ${currentPage.posts === item ? 'active' : ''}`}>{item}</button>
                    )
                  ))}
                  <button onClick={() => handlePageChange('posts', currentPage.posts + 1)} disabled={currentPage.posts === postPages} className="pagination-button">Next</button>
                </div>
              </div>
            )}
            <div className="admin-posts-grid">
              {paginatedPosts.map(post => (
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
                  <div className="admin-analytics-item"><h4>Total Songs</h4><p>{songs.length}</p></div>
                  <div className="admin-analytics-item"><h4>Total Downloads</h4><p>{totalDownloads}</p></div>
                  <div className="admin-analytics-item"><h4>Public Songs</h4><p>{publicSongs}</p></div>
                  <div className="admin-analytics-item"><h4>Private Songs</h4><p>{privateSongs}</p></div>
                  <div className="admin-analytics-item"><h4>Total Blog Posts</h4><p>{posts.length}</p></div>
                  <div className="admin-analytics-item"><h4>Total Users</h4><p>{users.length}</p></div>
                  <div className="admin-analytics-item">
                    <h4>Top Songs</h4>
                    {topSongs.length > 0 ? <ul className="top-items">{topSongs.map((song, index) => <li key={index}>{song.title}: {song.downloads || 0}</li>)}</ul> : <p>N/A</p>}
                  </div>
                  <div className="admin-analytics-item">
                    <h4>Top Posts</h4>
                    {topPosts.length > 0 ? <ul className="top-items">{topPosts.map((post, index) => <li key={index}>{post.title}: {post.views || 0}</li>)}</ul> : <p>N/A</p>}
                  </div>
                </div>
              </div>
            )}
            {analyticsSection === 'ga' && (
              <div className="analytics-section google-data">
                <h3 className="analytics-section-title">Google Analytics (Last 30 Days)</h3>
                {analyticsData.ga ? (
                  <div className="analytics-row">
                    <div className="admin-analytics-item"><h4>Active Users</h4><p>{analyticsData.ga.activeUsers || 'N/A'}</p></div>
                    <div className="admin-analytics-item"><h4>Page Views</h4><p>{analyticsData.ga.screenPageViews || 'N/A'}</p></div>
                    <div className="admin-analytics-item"><h4>Sessions</h4><p>{analyticsData.ga.sessions || 'N/A'}</p></div>
                    <div className="admin-analytics-item"><h4>Bounce Rate</h4><p>{analyticsData.ga.bounceRate ? `${(analyticsData.ga.bounceRate * 100).toFixed(1)}%` : 'N/A'}</p></div>
                    <div className="admin-analytics-item"><h4>Avg. Duration</h4><p>{analyticsData.ga.averageSessionDuration ? `${Math.round(analyticsData.ga.averageSessionDuration)}s` : 'N/A'}</p></div>
                    <div className="admin-analytics-item"><h4>Event Count</h4><p>{analyticsData.ga.eventCount || 'N/A'}</p></div>
                    <div className="admin-analytics-item"><h4>New Users</h4><p>{analyticsData.ga.newUsers || 'N/A'}</p></div>
                  </div>
                ) : (
                  <p>Loading Google Analytics data...</p>
                )}
              </div>
            )}
            {analyticsSection === 'gsc' && (
              <div className="analytics-section google-data">
                <h3 className="analytics-section-title">Google Search Console (Last 30 Days)</h3>
                {analyticsData.gsc && analyticsData.gsc.rows ? (
                  <div className="analytics-row">
                    <div className="admin-analytics-item">
                      <h4>Top Queries</h4>
                      <ul className="search-queries">
                        {analyticsData.gsc.rows.slice(0, 5).map((row, index) => (
                          <li key={index}>
                            {row.keys[0]}: {row.clicks} clicks, {row.impressions} imp., {(row.ctr * 100).toFixed(1)}% CTR, Pos. {row.position.toFixed(1)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p>Loading Search Console data...</p>
                )}
              </div>
            )}
            {analyticsSection === 'visitors' && (
              <div className="analytics-section visitor-data">
                <h3 className="analytics-section-title">Site Visitors</h3>
                {visitorData.length > itemsPerPage && (
                  <div className="pagination-top">
                    <div className="pagination-controls">
                      <label htmlFor="itemsPerPageVisitors">Items per page:</label>
                      <select id="itemsPerPageVisitors" value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(prev => ({ ...prev, visitors: 1 })); }} className="pagination-select">
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                      </select>
                    </div>
                    <div className="pagination">
                      <button onClick={() => handlePageChange('visitors', currentPage.visitors - 1)} disabled={currentPage.visitors === 1} className="pagination-button">Previous</button>
                      {getPaginationRange('visitors').map((item, index) => (
                        item === '...' ? (
                          <span key={index} className="pagination-ellipsis">...</span>
                        ) : (
                          <button key={index} onClick={() => handlePageChange('visitors', item)} className={`pagination-button ${currentPage.visitors === item ? 'active' : ''}`}>{item}</button>
                        )
                      ))}
                      <button onClick={() => handlePageChange('visitors', currentPage.visitors + 1)} disabled={currentPage.visitors === visitorPages} className="pagination-button">Next</button>
                    </div>
                  </div>
                )}
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>IP Address</th>
                        <th>Page Visited</th>
                        <th>Click Events</th>
                        <th>Visit Time</th>
                        <th>Duration (s)</th>
                        <th>City</th>
                        <th>Country</th>
                        <th>Device</th>
                        <th>Referrer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedVisitors.map((visit, index) => (
                        <tr key={index}>
                          <td>{visit.ip_address}</td>
                          <td>{visit.page_visited || 'N/A'}</td>
                          <td>{visit.click_events ? JSON.stringify(visit.click_events) : 'None'}</td>
                          <td>{new Date(visit.visit_timestamp).toLocaleString()}</td>
                          <td>{visit.duration || 0}</td>
                          <td>{visit.city || 'N/A'}</td>
                          <td>{visit.country || 'N/A'}</td>
                          <td>{visit.device_type || 'N/A'}</td>
                          <td>{visit.referrer || 'Direct'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'users' && (
          <>
            <div className="admin-filter-bar">
              <input type="text" placeholder="Search users by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="admin-filter-input" />
            </div>
            {filteredUsers.length > itemsPerPage && (
              <div className="pagination-top">
                <div className="pagination-controls">
                  <label htmlFor="itemsPerPageUsers">Items per page:</label>
                  <select id="itemsPerPageUsers" value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(prev => ({ ...prev, users: 1 })); }} className="pagination-select">
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <div className="pagination">
                  <button onClick={() => handlePageChange('users', currentPage.users - 1)} disabled={currentPage.users === 1} className="pagination-button">Previous</button>
                  {getPaginationRange('users').map((item, index) => (
                    item === '...' ? (
                      <span key={index} className="pagination-ellipsis">...</span>
                    ) : (
                      <button key={index} onClick={() => handlePageChange('users', item)} className={`pagination-button ${currentPage.users === item ? 'active' : ''}`}>{item}</button>
                    )
                  ))}
                  <button onClick={() => handlePageChange('users', currentPage.users + 1)} disabled={currentPage.users === userPages} className="pagination-button">Next</button>
                </div>
              </div>
            )}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Choir Name</th>
                    <th>Church Name</th>
                    <th>Country</th>
                    <th>State</th>
                    <th>Donated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.choir_name || 'N/A'}</td>
                      <td>{user.church_name || 'N/A'}</td>
                      <td>{user.country || 'N/A'}</td>
                      <td>{user.state || 'N/A'}</td>
                      <td>
                        <button className={`admin-toggle-button ${user.has_donated ? 'active' : ''}`} disabled>
                          {user.has_donated ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => toggleUserAdmin(user.id, user.is_admin)} className="admin-edit-button">
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button onClick={() => deleteUser(user.id)} className="admin-delete-button">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'songOfTheWeek' && (
          <form onSubmit={handleSongOfTheWeekSubmit} className="admin-form-grid">
            <textarea placeholder="Song of the Week Audio URL" value={songOfTheWeekHtml} onChange={(e) => setSongOfTheWeekHtml(e.target.value)} className="admin-form-input" rows="3" />
            <button type="submit" className="admin-form-submit">Update Song of the Week</button>
          </form>
        )}
        {activeTab === 'advert' && (
          <form onSubmit={handleAdSubmit} className="admin-form-grid">
            <input type="text" placeholder="Ad Name" value={adForm.name} onChange={(e) => setAdForm({ ...adForm, name: e.target.value })} className="admin-form-input" required />
            <textarea placeholder="Ad Code" value={adForm.code} onChange={(e) => setAdForm({ ...adForm, code: e.target.value })} className="admin-form-input" rows="3" required />
            <select value={adForm.position} onChange={(e) => setAdForm({ ...adForm, position: e.target.value })} className="admin-form-input">
              <option value="home_above_sotw">Home (Above Song of the Week)</option>
              <option value="home_below_sotw">Home (Below Song of the Week)</option>
            </select>
            <label className="admin-checkbox">
              <input type="checkbox" checked={adForm.is_active} onChange={(e) => setAdForm({ ...adForm, is_active: e.target.checked })} />
              Active
            </label>
            <button type="submit" className="admin-form-submit">{editingAdId ? 'Update Ad' : 'Add Ad'}</button>
            {editingAdId && (
              <button type="button" className="admin-cancel-button" onClick={() => { setAdForm({ name: '', code: '', position: 'home_above_sotw', is_active: true }); setEditingAdId(null); }}>Cancel</button>
            )}
            {ads.length > itemsPerPage && (
              <div className="pagination-top">
                <div className="pagination-controls">
                  <label htmlFor="itemsPerPageAds">Items per page:</label>
                  <select id="itemsPerPageAds" value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(prev => ({ ...prev, ads: 1 })); }} className="pagination-select">
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <div className="pagination">
                  <button onClick={() => handlePageChange('ads', currentPage.ads - 1)} disabled={currentPage.ads === 1} className="pagination-button">Previous</button>
                  {getPaginationRange('ads').map((item, index) => (
                    item === '...' ? (
                      <span key={index} className="pagination-ellipsis">...</span>
                    ) : (
                      <button key={index} onClick={() => handlePageChange('ads', item)} className={`pagination-button ${currentPage.ads === item ? 'active' : ''}`}>{item}</button>
                    )
                  ))}
                  <button onClick={() => handlePageChange('ads', currentPage.ads + 1)} disabled={currentPage.ads === adPages} className="pagination-button">Next</button>
                </div>
              </div>
            )}
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
                  {paginatedAds.map(ad => (
                    <tr key={ad.id}>
                      <td>{ad.name}</td>
                      <td>{ad.position}</td>
                      <td>
                        <button onClick={() => toggleAdActive(ad.id, ad.is_active)} className={`admin-toggle-button ${ad.is_active ? 'active' : ''}`}>
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
          </form>
        )}
      </div>
    </div>
  );
}

export default Admin;
