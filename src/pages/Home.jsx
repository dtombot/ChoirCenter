import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

function Home() {
  const [songs, setSongs] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: songData } = await supabase.from('songs').select('*').order('created_at', { ascending: false }).limit(10);
      const { data: postData } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false }).limit(10);
      setSongs(songData || []);
      setPosts(postData || []);
    };
    fetchData();
  }, []);

  return (
    <>
      <section style={{ background: '#007bff', color: 'white', textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome to Choir Center</h2>
        <p>Find and download choir music resources easily.</p>
        <input type="text" placeholder="Search for songs..." style={{ padding: '0.5rem', width: '50%', maxWidth: '400px', border: 'none', borderRadius: '5px' }} />
        <div style={{ marginTop: '1rem' }}>
          <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#007bff' }}>Explore Library</button>
          <button style={{ padding: '0.75rem 1.5rem', margin: '0 0.5rem', border: 'none', borderRadius: '5px', background: '#fff', color: '#007bff' }}>Blog Posts</button>
        </div>
      </section>
      <div className="container">
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Recently Added Songs</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {songs.map(song => (
            <div key={song.id} style={{ background: '#fff', padding: '1rem', borderRadius: '5px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{song.title}</div>
          ))}
        </div>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', marginTop: '2rem' }}>Recent Blog Posts</h3>
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
