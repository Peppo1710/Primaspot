import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Searchpage.css';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // 'success', 'error', or null
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  // Enhanced mock dataset with more realistic data
  const mockData = [
    { 
      id: 1, 
      title: 'Engagement spike: 12 Aug', 
      tags: ['engagement', 'likes', 'trending'], 
      snippet: 'Likes increased 24% on promo post. Peak engagement at 2 PM.',
      metrics: { likes: 1250, comments: 89, shares: 23 },
      date: '2024-01-15',
      type: 'performance'
    },
    { 
      id: 2, 
      title: 'Top performing content: Travel', 
      tags: ['travel', 'vibe', 'content'], 
      snippet: 'Travel posts outperform others in July by 40%. Best time: weekends.',
      metrics: { likes: 2100, comments: 156, shares: 67 },
      date: '2024-01-12',
      type: 'content'
    },
    { 
      id: 3, 
      title: 'Reel growth surge', 
      tags: ['reels', 'views', 'growth'], 
      snippet: 'Short-form content gained 3x reach. Average view time: 45 seconds.',
      metrics: { likes: 890, comments: 45, shares: 12 },
      date: '2024-01-10',
      type: 'growth'
    },
    { 
      id: 4, 
      title: 'Hashtag performance: #foodie', 
      tags: ['hashtags', 'food', 'trending'], 
      snippet: 'Food content with #foodie tag gets 60% more engagement.',
      metrics: { likes: 1800, comments: 134, shares: 89 },
      date: '2024-01-08',
      type: 'hashtags'
    },
    { 
      id: 5, 
      title: 'Audience peak hours', 
      tags: ['audience', 'timing', 'analytics'], 
      snippet: 'Highest engagement between 6-8 PM. Best posting time identified.',
      metrics: { likes: 950, comments: 78, shares: 34 },
      date: '2024-01-05',
      type: 'audience'
    }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setSearchStatus(null);
      return;
    }

    setIsSearching(true);
    setSearchStatus(null);
    
    try {
      // Simulate API call - replace with actual backend call
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, username })
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSearchStatus('success');
        // Navigate to dashboard after successful search
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setResults([]);
        setSearchStatus('error');
      }
    } catch (error) {
      // Fallback to mock data for development
      const q = query.toLowerCase();
      const matched = mockData.filter(d => (
        d.title.toLowerCase().includes(q) ||
        d.tags.join(' ').toLowerCase().includes(q) ||
        d.snippet.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
      ));
      
      setResults(matched);
      setSearchStatus(matched.length > 0 ? 'success' : 'error');
      
      // Navigate to dashboard if mock data has results
      if (matched.length > 0) {
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    }
    
    setIsSearching(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearchStatus(null);
  };

  const getTypeColor = (type) => {
    const colors = {
      performance: '#FF3CAC',
      content: '#9D4EDD',
      growth: '#00F5D4',
      hashtags: '#FF8E3C',
      audience: '#A7F432'
    };
    return colors[type] || '#B0B0B0';
  };

  const getTypeIcon = (type) => {
    const icons = {
      performance: '📈',
      content: '🎨',
      growth: '🚀',
      hashtags: '#️⃣',
      audience: '👥'
    };
    return icons[type] || '📊';
  };

  return (
    <div className="search-container">
      {/* Navigation */}
      <nav className="nav-bar">
        <div className="nav-content">
          <div className="nav-brand" onClick={() => navigate('/')}>
            <div className="brand-logo">
              <img src="logo.png" alt="" />
            </div>
            <span className="brand-text">PrimaSpot</span>
          </div>
          
          <div className="nav-links">
            <button 
              className="nav-link"
              onClick={() => navigate('/about')}
            >
              About Developer
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-content">
          <header className="hero-header">
            <h1 className="hero-title">
              Discover Your <span className="gradient-text">Trends</span>
            </h1>
            <p className="hero-subtitle">
              Quickly find trends, metrics, and content insights with AI-powered analytics
            </p>
          </header>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-container">
              <div className="search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setUsername(e.target.value);
                }}
                placeholder="Enter Instagram username to search analytics..."
                className="search-input"
                disabled={isSearching}
              />
              
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="clear-button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              
              <button
                type="submit"
                className={`search-button ${searchStatus === 'success' ? 'search-button-success' : ''}`}
                disabled={isSearching || !query.trim()}
              >
                {isSearching ? (
                  <div className="loading-spinner"></div>
                ) : searchStatus === 'success' ? (
                  <>
                    <span>Go to Dashboard</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Search</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Search Status Indicator - Positioned in visible area */}
          {searchStatus && (
            <div className="search-status">
              {searchStatus === 'success' ? (
                <div className="status-success">
                  <div className="success-content">
                    <div className="success-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </div>
                    <div className="success-text">
                      <h3>Search Successful!</h3>
                      <p>Found {results.length} result{results.length !== 1 ? 's' : ''} for your query.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="status-error">
                  <div className="error-content">
                    <div className="error-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m15 9-6 6"/>
                        <path d="m9 9 6 6"/>
                      </svg>
                    </div>
                    <div className="error-text">
                      <h3>No Results Found</h3>
                      <p>We couldn't find anything matching your search. Try different keywords or check your spelling.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Results Section */}
      {results.length > 0 && (
        <section className="results-section">
          <div className="results-header">
            <h2 className="results-title">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </h2>
            <p className="results-subtitle">for "{query}"</p>
          </div>

          <div className="results-grid">
            {results.map((result) => (
              <article key={result.id} className="result-card">
                <div className="result-header">
                  <div className="result-type">
                    <span className="type-icon">{getTypeIcon(result.type)}</span>
                    <span 
                      className="type-label"
                      style={{ color: getTypeColor(result.type) }}
                    >
                      {result.type}
                    </span>
                  </div>
                  <time className="result-date">{result.date}</time>
                </div>

                <h3 className="result-title">{result.title}</h3>
                <p className="result-snippet">{result.snippet}</p>

                <div className="result-metrics">
                  <div className="metric">
                    <span className="metric-icon">❤️</span>
                    <span className="metric-value">{result.metrics.likes.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-icon">💬</span>
                    <span className="metric-value">{result.metrics.comments}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-icon">🔄</span>
                    <span className="metric-value">{result.metrics.shares}</span>
                  </div>
                </div>

                <div className="result-tags">
                  {result.tags.map((tag) => (
                    <span key={tag} className="result-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}