import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
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
      <aside className="ad-space">
        <div className="ad-sample">
          <span className="ad-text">Place your Ad here. Advertise on ChoirCenter.com</span>
          <svg className="ad-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="#3cb371" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"/>
            <path fill="#fff" d="M12 6l4 6h-8l4-6zm0 6v6h-2v-6h2z"/>
          </svg>
          <a href="mailto:admin@choircenter.com" className="ad-link">Contact Us</a>
        </div>
      </aside>
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
