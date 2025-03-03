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
        .eq('is_public', true) // Only public songs
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
    <div className="search-container">
      <h1 className="search-title animate-text">Search Results for "{query}"</h1>
      {error ? (
        <p className="error-message">{error}</p>
      ) : searchResults.length === 0 ? (
        <p className="no-results">No results found for "{query}".</p>
      ) : (
        <div className="search-grid">
          {searchResults.map(result => (
            <Link
              key={result.id}
              to={result.composer ? `/song/${result.permalink || result.id}` : `/blog/${result.permalink || `post-${result.id}`}`}
              className="search-card animate-card"
            >
              <h3 className="search-card-title">{result.title}</h3>
              {result.composer && <p className="search-card-composer">{result.composer}</p>}
              {result.downloads !== undefined && (
                <p className="search-card-downloads">Downloaded {result.downloads || 0} times</p>
              )}
              <span className="search-card-type">{result.composer ? 'Song' : 'Blog Post'}</span>
            </Link>
          ))}
        </div>
      )}
      <Link to="/" className="action-button">Back to Home</Link>
    </div>
  );
}

export default Search;
