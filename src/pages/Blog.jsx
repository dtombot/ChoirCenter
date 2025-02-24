import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function Blog() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      setPosts(data || []);
    };
    fetchPosts();
  }, []);

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f' }}>Blog Posts</h2>
      {posts.map(post => (
        <Link
          to={`/blog/${post.permalink || post.id}`}
          key={post.id}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div
            style={{
              padding: '1rem',
              margin: '1rem 0',
              background: '#fff',
              borderRadius: '5px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)')}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2f4f2f' }}>{post.title}</h3>
            <p style={{ fontSize: '1rem', color: '#666' }}>{post.content.substring(0, 100)}...</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default Blog;
