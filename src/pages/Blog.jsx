import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

function Blog() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      setPosts(data || []);
    };
    fetchPosts();
  }, []);

  return (
    <div className="container">
      <h2>Blog Posts</h2>
      {posts.map(post => (
        <div key={post.id} style={{ margin: '1rem 0', padding: '1rem', background: '#fff' }}>
          <h3>{post.title}</h3>
          <p>{post.content.substring(0, 100)}...</p>
        </div>
      ))}
    </div>
  );
}

export default Blog;
