import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useSearchParams, Link } from 'react-router-dom';
import '../styles.css';

function Search() {
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query') || '';

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setError('Please enter a search term.');
        return;
      }

      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title, composer, permalink')
        .or(`title.ilike.%${query}%,composer.ilike.%${query}%`)
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

      setSearchResults([...(songData || []), ...(postData || [])]);
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
              to={result.composer ? `/song/${result.id}` : `/blog/${result.permalink || `post-${result.id}`}`}
              className="search-card animate-card"
            >
              <h3 className="search-card-title">{result.title}</h3>
              {result.composer && <p className="search-card-composer">{result.composer}</p>}
              <span className="search-card-type">{result.composer ? 'Song' : 'Blog Post'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
