import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles.css';

function BlogPost() {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const { permalink } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      if (!permalink || permalink === 'undefined') {
        setError('Invalid post URL');
        return;
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('permalink', permalink)
        .single();
      if (error) {
        setError(`Failed to load post: ${error.message}`);
        return;
      }
      if (!data) {
        setError('Post not found');
        return;
      }
      setPost(data);
    };

    const fetchComments = async () => {
      if (!post?.id) return;
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, profiles (email)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) setError('Failed to load comments: ' + error.message);
      else setComments(data || []);
    };

    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) setError('Failed to fetch user: ' + error.message);
      else setUser(user);
    };

    fetchPost();
    fetchUser();
  }, [permalink, navigate]);

  useEffect(() => {
    if (post) {
      setComments([]);
      const fetchComments = async () => {
        const { data, error } = await supabase
          .from('comments')
          .select('id, content, created_at, user_id, profiles (email)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });
        if (error) setError('Failed to load comments: ' + error.message);
        else setComments(data || []);
      };
      fetchComments();
    }
  }, [post]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to comment.');
      return;
    }
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{ post_id: post.id, user_id: user.id, content: newComment }]);
      if (error) throw error;
      setNewComment('');
      const { data } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, profiles (email)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setComments(data || []);
    } catch (err) {
      setError('Failed to add comment: ' + err.message);
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);
        if (error) throw error;
        setComments(comments.filter(comment => comment.id !== commentId));
      } catch (err) {
        setError('Failed to delete comment: ' + err.message);
      }
    }
  };

  const shareUrl = window.location.href;
  const shareTitle = post?.title || 'Check out this blog post!';

  if (!post && !error) return <div className="loading">Loading...</div>;

  return (
    <div className="blog-post-container">
      {error ? (
        <div className="error-card">
          <h1 className="error-title">Error</h1>
          <p className="error-message">{error}</p>
          <button onClick={() => navigate('/')} className="back-button">Back to Home</button>
        </div>
      ) : (
        <>
          <div className="post-card">
            <h1 className="post-title">{post.title}</h1>
            <div className="post-meta">
              <span>Posted on {new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <div className="post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
            <div className="social-share">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="share-button facebook">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} target="_blank" rel="noopener noreferrer" className="share-button twitter">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
              </a>
              <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="share-button whatsapp">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff"><path d="M20.1 3.9C17.8 1.7 14.5 0.5 11 0.5 5.3 0.5 0.6 5.2 0.6 10.9c0 1.8 0.5 3.6 1.4 5.2L0 23l7.1-1.9c1.6 0.9 3.4 1.4 5.3 1.4 5.7 0 10.4-4.7 10.4-10.4 0-2.8-1.1-5.4-3.2-7.2zm-8.9 16.1c-1.6 0-3.2-0.5-4.5-1.3l-0.3-0.2-4.2 1.1 1.1-4.1-0.2-0.3c-0.9-1.3-1.4-2.9-1.4-4.6 0-4.8 3.9-8.7 8.7-8.7 2.3 0 4.5 0.9 6.1 2.5 1.6 1.6 2.5 3.8 2.5 6.1 0 4.8-3.9 8.7-8.7 8.7zm4.7-6.5c-0.3-0.1-1.7-0.8-2-0.9-0.3-0.1-0.5-0.1-0.7 0.2-0.2 0.3-0.8 0.9-1 1.1-0.2 0.2-0.4 0.2-0.7 0.1-0.3-0.1-1.3-0.4-2.5-1.2-0.9-0.6-1.5-1.4-1.7-1.6-0.2-0.2-0.1-0.4 0-0.6 0.1-0.2 0.3-0.5 0.4-0.7 0.1-0.2 0.2-0.4 0.3-0.6 0.1-0.2 0-0.4-0.1-0.6-0.1-0.2-0.7-0.3-1.5-0.3z"/></svg>
              </a>
            </div>
          </div>
          <div className="comments-section">
            <button className="comments-toggle" onClick={() => setIsCommentsOpen(!isCommentsOpen)}>
              {isCommentsOpen ? 'Hide Comments' : `Show Comments (${comments.length})`}
            </button>
            {isCommentsOpen && (
              <div className="comments-container">
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-card">
                      <p className="comment-text">{comment.content}</p>
                      <div className="comment-details">
                        <span>By {comment.profiles?.email || 'Unknown'}</span>
                        <span>{new Date(comment.created_at).toLocaleString()}</span>
                        {user && user.id === comment.user_id && (
                          <button onClick={() => handleCommentDelete(comment.id)} className="delete-comment">Delete</button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-comments">No comments yet.</p>
                )}
                {user ? (
                  <form onSubmit={handleCommentSubmit} className="comment-form">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add your comment..."
                      className="comment-input"
                      required
                    />
                    <button type="submit" className="submit-comment">Post Comment</button>
                  </form>
                ) : (
                  <p className="login-prompt">Please <a href="/login">log in</a> to comment.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BlogPost;
