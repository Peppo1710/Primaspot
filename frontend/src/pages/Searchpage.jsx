import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Searchpage.css';
import { setGlobalUsername } from '../store/globalStore';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // 'success', 'error', or null
  const [showLoader, setShowLoader] = useState(false);
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
      const backendUrl = 'https://primaspot-y10q.onrender.com/api';
      console.log(backendUrl);
      
      const response = await fetch(`${backendUrl}/api/user/validate/${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSearchStatus('success');
          setGlobalUsername(query.trim().toLowerCase());
          // Don't navigate yet, wait for user to click "Go" button
        } else {
          setSearchStatus('error');
        }
      } else if (response.status === 404) {
        setSearchStatus('error');
      } else {
        setSearchStatus('error');
      }
    } catch (error) {
      console.error('API Error:', error);
      console.log('API Error:', error);
      setSearchStatus('error');
    }
    
    setIsSearching(false);
  };

  const handleGoToDashboard = () => {
    // Show 5-second loader before navigating
    setShowLoader(true);
    setTimeout(() => {
      setShowLoader(false);
      navigate('/dashboard');
    }, 5000);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearchStatus(null);
  };

  return (
    <div className="search-container">
      {/* 5-Second Loader Animation */}
      {showLoader && (
        <div className="loader-overlay">
          <div className="loader-content">
            <div className="loader-spinner"></div>
            <h2>Fetching Instagram Data...</h2>
            <p>Analyzing @{query} profile and content</p>
          </div>
        </div>
      )}
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Instagram username to search analytics..."
                className="search-input"
                disabled={isSearching || showLoader}
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
              
              {searchStatus === 'success' ? (
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="search-button search-button-success"
                  disabled={showLoader}
                >
                  <span>Go</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  className="search-button"
                  disabled={isSearching || !query.trim() || showLoader}
                >
                  {isSearching ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <>
                      <span>Search</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Search Status Indicator */}
          {searchStatus && !showLoader && (
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
                      <h3>User Found!</h3>
                      <p>Loading dashboard for @{query}...</p>
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
                      <h3>User Not Found</h3>
                      <p>Instagram username @{query} not found. Please check the username and try again.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}