import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useSearchParams, Link } from 'react-router-dom';
import '../styles.css';

function Search() {
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query')?.toLowerCase() || '';

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setError('Please enter a search term.');
        console.log('Empty search query');
        return;
      }

      console.log('Fetching search results for query:', query);

      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title, composer, permalink, is_public, downloads')
        .or(`title.ilike.%${query}%,composer.ilike.%${query}%`)
        .eq('is_public', true)
        .limit(10);
      if (songError) {
        console.error('Song search error:', songError.message);
        setError('Failed to search songs: ' + songError.message);
        return;
      }

      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('id, title, permalink')
        .ilike('title', `%${query}%`)
        .limit(10);
      if (postError) {
        console.error('Post search error:', postError.message);
        setError('Failed to search posts: ' + postError.message);
        return;
      }

      const results = [...(songData || []), ...(postData || [])];
      console.log('Search results:', JSON.stringify(results, null, 2));
      setSearchResults(results);
    };

    fetchSearchResults();
  }, [query]);

  return (
    <div className="home-container">
      <h1 className="search-title animate-text">Search Results for "{query}"</h1>
      {error ? (
        <p className="error-message">{error}</p>
      ) : searchResults.length === 0 ? (
        <p className="no-results">No results found for "{query}".</p>
      ) : (
        <>
          <section className="latest-additions">
            <h2 className="section-title animate-text">Songs</h2>
            <div className="song-grid">
              {searchResults.filter(result => result.composer).length > 0 ? (
                searchResults.filter(result => result.composer).map((song, index) => (
                  <div
                    key={song.id}
                    className={`song-card-modern ${index % 2 === 0 ? 'variant-1' : 'variant-2'}`}
                  >
                    <Link to={`/song/${song.permalink || song.id}`} className="song-card-link">
                      <div className="song-card-content">
                        <h3 className="song-card-title-modern">{song.title}</h3>
                        <p className="song-card-composer-modern">{song.composer || 'Unknown Composer'}</p>
                        <p className="song-card-downloads-modern">Downloaded {song.downloads || 0} times</p>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <p>No matching songs found.</p>
              )}
            </div>
          </section>
          <hr className="section-separator" />
          <section className="blog-list-container">
            <h2 className="section-title animate-text">Blog Posts</h2>
            <div className="blog-list">
              {searchResults.filter(result => !result.composer).length > 0 ? (
                searchResults.filter(result => !result.composer).map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.permalink || `post-${post.id}`}`}
                    className={`blog-card-modern ${index % 2 === 0 ? 'variant-1' : 'variant-2'}`}
                  >
                    <h3 className="blog-card-title-modern">{post.title}</h3>
                  </Link>
                ))
              ) : (
                <p>No matching blog posts found.</p>
              )}
            </div>
          </section>
        </>
      )}
      <Link to="/" className="action-button">Back to Home</Link>
    </div>
  );
}

export default Search;
