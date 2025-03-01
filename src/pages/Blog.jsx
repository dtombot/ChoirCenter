import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import AdBanner from '../components/AdBanner';
import '../styles.css';

function Blog() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, permalink, created_at, content')
        .order('created_at', { ascending: false });
      if (error) {
        setError('Failed to load posts: ' + error.message);
      } else {
        setPosts(data || []);
      }
    };
    fetchPosts();
  }, []);

  const getExcerpt = (content) => {
    const text = content.replace(/<[^>]+>/g, '');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  return (
    <div className="blog-container">
      <AdBanner position="other_pages_below_header" />
      <h1 className="blog-title animate-text">Blog</h1>
      {error ? (
        <div className="error-card">
          <p className="error-message">{error}</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map(post => (
            <Link
              key={post.id}
              to={`/blog/${post.permalink || `post-${post.id}`}`}
              className="blog-card animate-card"
            >
              <h2 className="blog-card-title">{post.title}</h2>
              <p className="blog-card-excerpt">{getExcerpt(post.content)}</p>
              <span className="blog-card-date">{new Date(post.created_at).toLocaleDateString()}</span>
              <span className="blog-card-readmore">Read More</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Blog;
