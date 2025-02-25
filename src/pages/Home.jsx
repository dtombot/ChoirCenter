import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Home() {
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [downloadPrompt, setDownloadPrompt] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (songError) {
        console.error('Song fetch error:', songError.message);
        setError('Failed to load songs.');
      } else {
        const songsWithSize = songData.map(song => ({
          ...song,
          fileSize: 'Unknown',
        }));
        setSongs(songsWithSize || []);
      }

      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (postError) {
        console.error('Post fetch error:', postError.message);
        setError(prev => prev ? `${prev} Failed to load posts.` : 'Failed to load posts.');
      } else {
        setPosts(postData || []);
      }
    };
    fetchData();
  }, []);

  const handleDownload = async (songId, fileId) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const isAuthenticated = userData?.user && !userError;

      if (!isAuthenticated) {
        const downloadCount = parseInt(localStorage.getItem('downloadCount') || '0', 10);
        if (downloadCount >= 5) {
          setDownloadPrompt('You’ve reached the limit of 5 downloads. Please log in to download more.');
          return;
        }
        localStorage.setItem('downloadCount', downloadCount + 1);
      }

      const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `choircenter.com-${songId}.pdf`;
      link.click();

      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: (songs.find(s => s.id === songId)?.downloads || 0) + 1 })
        .eq('id', songId);
      if (updateError) throw updateError;

      const { data: updatedSongs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setSongs(updatedSongs.map(song => ({ ...song, fileSize: 'Unknown' })) || []);
    } catch (err) {
      console.error('Download error:', err.message);
      setError('Failed to update download count.');
    }
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.description && song.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <section style={{ background: '#3cb371', color: 'white', textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' }}>Welcome to Choir Center</h2>
        <p style={{ fontSize: '1.2rem' }}>Find and download choir music resources easily.</p>
        <input
          type="text"
          placeholder="Search for songs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '0.5rem', width: '50%', maxWidth: '400px', border: 'none', borderRadius: '5px' }}
        />
        <div style={{ marginTop: '1rem' }}>
          <Link to="/library">
            <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#2f4f2f' }}>Explore Library</button>
          </Link>
          <Link to="/blog">
            <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#2f4f2f' }}>Blog Posts</button>
          </Link>
        </div>
      </section>
      <div className="container" style={{ padding: '2rem' }}>
        {error && <p style={{ color: '#e63946', marginBottom: '1rem' }}>{error}</p>}
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#2f4f2f', fontWeight: '700' }}>Recently Added Songs</h3>
        {songs.length === 0 && !error ? (
          <p>No songs available.</p>
        ) : (
          <div style={{ background: '#1a3c34', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {filteredSongs.map((song, index) => (
                <Link
                  to={`/song/${song.permalink || song.id}`}
                  key={song.id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: index % 2 === 0 ? '#2f4f2f' : '#1a3c34',
                      color: '#fff',
                      borderRadius: '4px',
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#3cb371')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? '#2f4f2f' : '#1a3c34')}
                  >
                    <span style={{ width: '2rem', textAlign: 'right', marginRight: '1rem', color: '#98fb98' }}>{index + 1}</span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', margin: 0 }}>{song.title}</h4>
                      <p style={{ fontSize: '0.875rem', color: '#98fb98', margin: 0 }}>{song.description || 'No description'}</p>
                    </div>
                    <span style={{ marginRight: '1rem', color: '#98fb98' }}>{song.fileSize}</span>
                    <span style={{ marginRight: '1rem', color: '#98fb98' }}>{song.downloads || 0} downloads</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownload(song.id, song.google_drive_file_id);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#98fb98',
                        color: '#2f4f2f',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                      }}
                    >
                      Download
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', marginTop: '2rem', color: '#2f4f2f', fontWeight: '700' }}>Recent Blog Posts</h3>
        {posts.length === 0 && !error ? (
          <p>No posts available.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {posts.map(post => (
              <Link
                to={`/blog/${post.permalink || post.id}`}
                key={post.id}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    background: '#fff',
                    padding: '1rem',
                    borderRadius: '5px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)')}
                >
                  <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#2f4f2f', margin: 0 }}>{post.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Download Limit Modal */}
      {downloadPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2f4f2f', marginBottom: '1rem' }}>Download Limit Reached</h3>
            <p style={{ fontSize: '1rem', color: '#333', marginBottom: '1.5rem' }}>
              {downloadPrompt} <Link to="/login" style={{ color: '#3cb371', textDecoration: 'underline' }}>Log in here</Link>.
            </p>
            <button
              onClick={() => setDownloadPrompt(null)}
              style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
