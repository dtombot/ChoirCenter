import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useParams } from 'react-router-dom';

function BlogPost() {
  const [post, setPost] = useState(null);
  const { id } = useParams(); // Matches permalink or id from URL

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('permalink', id)
        .single();
      if (error) {
        // If permalink fails, try by id
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

  if (!post) return <div>Loading...</div>;

  return (
    <div className="container" style={{ fontFamily: 'Circular Std, Arial, sans-serif', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#2f4f2f' }}>{post.title}</h1>
      <p style={{ fontSize: '1rem', color: '#666', margin: '1rem 0' }}>{post.created_at}</p>
      <div style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#333' }}>{post.content}</div>
      {post.tags && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Tags:</strong> {post.tags.join(', ')}
        </div>
      )}
      {post.category && (
        <div>
          <strong>Category:</strong> {post.category}
        </div>
      )}
    </div>
  );
}

export default BlogPost;
