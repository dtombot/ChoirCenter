import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import './styles.css';

function Blog() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, permalink, created_at, content')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        setError('Failed to load posts: ' + error.message);
      } else {
        setPosts(data || []);
      }
    };
    fetchPosts();
  }, []);

  const getExcerpt = (content) => {
    const text = content.replace(/<[^>]+>/g, ''); // Strip HTML tags
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  return (
    <div className="blog-index-container">
      <h1 className="blog-index-title">Blog</h1>
      {error ? (
        <div className="error-card">
          <p className="error-message">{error}</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map(post => (
            <Link key={post.id} to={`/blog/${post.permalink}`} className="blog-card">
              <h2 className="blog-card-title">{post.title}</h2>
              <p className="blog-card-excerpt">{getExcerpt(post.content)}</p>
              <span className="blog-card-date">{new Date(post.created_at).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Blog;
