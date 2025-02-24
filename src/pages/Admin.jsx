import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || !data.user.user_metadata.is_admin) {
        navigate('/login');
      } else {
        setUser(data.user);
      }
    };
    checkUser();
  }, [navigate]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    const { data } = await supabase.storage.from('songs').upload(`${Date.now()}.pdf`, file);
    await supabase.from('songs').insert({
      title: e.target.title.value,
      description: e.target.description.value,
      file_path: data.path,
    });
  };

  if (!user) return null;

  return (
    <div className="container">
      <h2>Admin Dashboard</h2>
      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <button>Library</button>
        <button>Blog Posts</button>
        <button>Analytics</button>
        <button>Manage Users</button>
      </div>
      <div style={{ background: '#fff', padding: '1rem' }}>
        <h3>Library</h3>
        <form onSubmit={handleUpload}>
          <input type="text" name="title" placeholder="Song Title" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }} />
          <textarea name="description" placeholder="Description" style={{ display: 'block', margin: '0.5rem 0', width: '100%' }}></textarea>
          <input type="file" name="file" accept=".pdf" style={{ display: 'block', margin: '0.5rem 0' }} />
          <button type="submit">Upload Song</button>
        </form>
      </div>
    </div>
  );
}

export default Admin;
