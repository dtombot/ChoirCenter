import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useParams } from 'react-router-dom';

function BlogPost() {
  const [post, setPost] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('permalink', id)
        .single();
      if (error) {
        const { data: idData } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();
        setPost(idData || null);
      } else {
        setPost(data);
      }
    };
    fetchPost();
  }, [id]);

  if (!post) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1 className="content-title">{post.title}</h1>
      <p className="content-text">{post.created_at}</p>
      <div className="content-body">{post.content}</div>
      {post.tags && (
        <div className="content-section">
          <strong className="content-strong">Tags:</strong> <span className="content-span">{post.tags.join(', ')}</span>
        </div>
      )}
      {post.category && (
        <div className="content-section">
          <strong className="content-strong">Category:</strong> <span className="content-span">{post.category}</span>
        </div>
      )}
    </div>
  );
}

export default BlogPost;
