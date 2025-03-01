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
        console.error('Fetch post error:', error.message);
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
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (commentError) {
        console.error('Fetch comments error:', commentError.message, commentError.details);
        setError('Failed to load comments: ' + commentError.message);
        return;
      }

      const userIds = commentData.map(comment => comment.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      if (profileError) {
        console.error('Fetch profiles error:', profileError.message);
        setError('Failed to load user data: ' + profileError.message);
        return;
      }

      const enrichedComments = commentData.map(comment => ({
        ...comment,
        profiles: profileData.find(profile => profile.id === comment.user_id) || { email: 'Unknown' }
      }));
      setComments(enrichedComments || []);
    };

    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Fetch user error:', error.message);
      } else {
        setUser(user);
      }
    };

    fetchPost();
    fetchUser();
  }, [permalink, navigate]);

  useEffect(() => {
    if (post) fetchComments();
  }, [post]);

  const fetchComments = async () => {
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (commentError) {
      console.error('Fetch comments error:', commentError.message, commentError.details);
      setError('Failed to load comments: ' + commentError.message);
      return;
    }

    const userIds = commentData.map(comment => comment.user_id);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    if (profileError) {
      console.error('Fetch profiles error:', profileError.message);
      setError('Failed to load user data: ' + profileError.message);
      return;
    }

    const enrichedComments = commentData.map(comment => ({
      ...comment,
      profiles: profileData.find(profile => profile.id === comment.user_id) || { email: 'Unknown' }
    }));
    setComments(enrichedComments || []);
  };

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
      fetchComments();
    } catch (err) {
      console.error('Comment submit error:', err.message);
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
        console.error('Comment delete error:', err.message);
        setError('Failed to delete comment: ' + err.message);
      }
    }
  };

  const shareUrl = window.location.href;
  const shareTitle = post?.title || 'Check out this blog post!';

  if (!post && !error) return <div className="loading">Loading...</div>;

  return (
    <div className="blog-post-container">
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
              </a>
              <a href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} target="_blank" rel="noopener noreferrer" className="share-button twitter">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="share-button whatsapp">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l4.93-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm3.97 15.03c-.25.7-.76 1.27-1.45 1.6-.7.34-1.6.5-2.52.25-1.8-.5-3.3-2-3.8-3.8-.25-.9-.08-1.8.25-2.52.33-.7.9-1.2 1.6-1.45.15-.05.3-.08.45-.08s.3.03.45.08c.35.15.6.45.7.8.1.35.15.7.15 1.05 0 .35-.05.7-.15 1.05-.5 1.5.5 2.5 1.5 3s2-.5 1.5-1.5c-.15-.35-.2-.7-.15-1.05s.2-.7.55-.85c.15-.05.3-.08.45-.08s.3.03.45.08z"/></svg>
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
