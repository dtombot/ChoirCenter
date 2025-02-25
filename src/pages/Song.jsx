import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useParams, Link } from 'react-router-dom';

function Song() {
  const [song, setSong] = useState(null);
  const { id } = useParams();
  const [downloadPrompt, setDownloadPrompt] = useState(null);

  useEffect(() => {
    const fetchSong = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('permalink', id)
        .single();
      let songData = data;
      if (error) {
        const { data: idData } = await supabase
          .from('songs')
          .select('*')
          .eq('id', id)
          .single();
        songData = idData || null;
      }
      setSong(songData ? { ...songData, fileSize: 'Unknown' } : null);
    };
    fetchSong();
  }, [id]);

  const handleDownload = async () => {
    if (!song) return;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const isAuthenticated = userData?.user && !userError;

      if (!isAuthenticated) {
        const downloadCount = parseInt(localStorage.getItem('downloadCount') || '0', 10);
        if (downloadCount >= 5) {
          setDownloadPrompt('You’ve reached the limit of 5 downloads. Please log in to download more.');
          return;
        }
        localStorage.setItem('downloadCount', downloadCount + 1);
      }

      const url = `https://drive.google.com/uc?export=download&id=${song.google_drive_file_id}`;
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = song.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      link.download = `choircenter.com-${safeTitle}-${song.id}.pdf`;
      link.click();

      const { error: updateError } = await supabase
        .from('songs')
        .update({ downloads: (song.downloads || 0) + 1 })
        .eq('id', song.id);
      if (updateError) throw updateError;

      setSong({ ...song, downloads: (song.downloads || 0) + 1 });
    } catch (err) {
      console.error('Download error:', err.message);
    }
  };

  if (!song) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1 className="content-title">{song.title}</h1>
      <p className="content-text">{song.description || 'No description'}</p>
      <p className="content-text">File Size: {song.fileSize}</p>
      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
        <button onClick={handleDownload} className="download-button">
          Download ({song.downloads || 0})
        </button>
      </div>
      {song.google_drive_thumbnail_id && (
        <div className="content-section">
          <h3 className="section-title">Preview</h3>
          <img
            src={`https://drive.google.com/thumbnail?id=${song.google_drive_thumbnail_id}`}
            alt={`${song.title} preview`}
            className="preview-image"
          />
        </div>
      )}
      {song.lyrics && (
        <div className="content-section">
          <h3 className="section-title">Lyrics</h3>
          <pre className="lyrics">{song.lyrics}</pre>
        </div>
      )}

      {downloadPrompt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Download Limit Reached</h3>
            <p className="modal-text">
              {downloadPrompt} <Link to="/login" className="modal-link">Log in here</Link>.
            </p>
            <button onClick={() => setDownloadPrompt(null)} className="cancel-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Song;
