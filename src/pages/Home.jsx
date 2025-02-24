import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Home() {
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: songData } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      const { data: postData } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setSongs(songData || []);
      setPosts(postData || []);
    };
    fetchData();
  }, []);

  const handleDownload = async (songId, filePath) => {
    try {
      const { data, error } = await supabase.storage.from('songs').download(filePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath.split('/').pop();
      link.click();
      URL.revokeObjectURL(url);

      // Increment download counter
      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: songs.find(s => s.id === songId).downloads + 1 })
        .eq('id', songId);
      if (updateError) throw updateError;

      // Refresh song list
      const { data: updatedSongs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setSongs(updatedSongs || []);
    } catch (err) {
      console.error('Download error:', err.message);
    }
  };

  return (
    <>
      <section style={{ background: '#3cb371', color: 'white', textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome to Choir Center</h2>
        <p>Find and download choir music resources easily.</p>
        <input type="text" placeholder="Search for songs..." style={{ padding: '0.5rem', width: '50%', maxWidth: '400px', border: 'none', borderRadius: '5px' }} />
        <div style={{ marginTop: '1rem' }}>
          <Link to="/library">
            <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#2f4f2f' }}>Explore Library</button>
          </Link>
          <Link to="/blog">
            <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#2f4f2f' }}>Blog Posts</button>
          </Link>
        </div>
      </section>
      <div className="container">
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#2f4f2f' }}>Recently Added Songs</h3>
        <div style={{ background: '#181818', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {songs.map((song, index) => (
              <div
                key={song.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: index % 2 === 0 ? '#282828' : '#181818',
                  color: '#fff',
                  borderRadius: '4px',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#383838')}
                onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? '#282828' : '#181818')}
              >
                <span style={{ width: '2rem', textAlign: 'right', marginRight: '1rem', color: '#b3b3b3' }}>{index + 1}</span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>{song.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: '#b3b3b3', margin: 0 }}>{song.description || 'No description'}</p>
                </div>
                <span style={{ marginRight: '1rem', color: '#b3b3b3' }}>{song.downloads || 0} downloads</span>
                <button
                  onClick={() => handleDownload(song.id, song.file_path)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#1db954',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', marginTop: '2rem', color: '#2f4f2f' }}>Recent Blog Posts</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: '#fff', padding: '1rem', borderRadius: '5px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{post.title}</div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Home;
