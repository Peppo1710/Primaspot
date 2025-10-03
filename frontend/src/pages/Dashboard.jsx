import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { getGlobalUsername } from '../store/globalStore';
import { api } from '../services/api';
import imageCache from '../services/imageCache';
import { 
  engagementData, 
  contentAnalysisData, 
  performanceData 
} from '../data/dummy';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('engagement');
  const [activeTab, setActiveTab] = useState('content');
  const [contentType, setContentType] = useState('posts');
  const navigate = useNavigate();
  
  // API Data States
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [postAnalytics, setPostAnalytics] = useState([]);
  const [reelAnalytics, setReelAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get analytics for a specific post/reel
  const getAnalyticsForContent = (contentId, contentType) => {
    const analyticsData = contentType === 'posts' ? postAnalytics : reelAnalytics;
    return analyticsData.find(analytics => analytics.post_id === contentId || analytics.reel_id === contentId);
  };

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      const user = getGlobalUsername();
      if (!user) {
        navigate('/');
        return;
      }
      
      setUsername(user);
      setLoading(true);
      
      try {
        const [profileRes, postsRes, reelsRes, analyticsRes, engagementRes, postAnalyticsRes, reelAnalyticsRes] = await Promise.all([
          api.getUserProfile(user),
          api.getUserPosts(user, 1, 50),
          api.getUserReels(user, 1, 50),
          api.getPostAnalytics(user).catch(() => ({ success: false })),
          api.getEngagementMetrics(user),
          api.getPostAnalytics(user).catch(() => ({ success: false })),
          api.getReelAnalytics(user).catch(() => ({ success: false }))
        ]);
        
        // Cache images locally in browser (no backend involved)
        if (profileRes.success && postsRes.success && reelsRes.success) {
          const cachedData = await imageCache.processUserData(
            user,
            profileRes.data,
            postsRes.data,
            reelsRes.data
          );
          
          setProfileData(cachedData.profile);
          setPosts(cachedData.posts);
          setReels(cachedData.reels);
        } else {
          if (profileRes.success) setProfileData(profileRes.data);
          if (postsRes.success) setPosts(postsRes.data);
          if (reelsRes.success) setReels(reelsRes.data);
        }
        
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
        if (engagementRes.success) setEngagement(engagementRes.data);
        if (postAnalyticsRes.success) setPostAnalytics(postAnalyticsRes.data);
        if (reelAnalyticsRes.success) setReelAnalytics(reelAnalyticsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-screen">
          <div className="loader-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="analytics-container">
        <div className="error-screen">
          <p>Failed to load profile data</p>
          <button onClick={() => navigate('/')}>Back to Search</button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Floating Action Button */}
      <button 
        className="floating-action-btn"
        onClick={() => navigate('/')}
        title="Back to Search"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="profile-showcase">
            <div className="profile-photo">
              <div className="photo-glow"></div>
              {profileData.profile.profile_picture_url ? (
                <img 
                  src={profileData.profile.profile_picture_url} 
                  alt={profileData.username}
                  onError={(e) => {
                    console.error('Failed to load profile image:', profileData.profile.profile_picture_url);
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.photo-inner').style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="photo-inner" style={{ display: profileData.profile.profile_picture_url ? 'none' : 'flex' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            <div className="profile-details">
              <h1 className="profile-name">@{profileData.username}</h1>
              <p className="profile-bio">
                {profileData.profile.full_name}
                {profileData.profile.is_verified && ' ✓'}
              </p>
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number">{profileData.stats.postsCount}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {profileData.stats.followersCount > 1000000 
                      ? `${(profileData.stats.followersCount / 1000000).toFixed(1)}M` 
                      : profileData.stats.followersCount > 1000 
                      ? `${(profileData.stats.followersCount / 1000).toFixed(1)}K` 
                      : profileData.stats.followersCount}
                  </span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{profileData.stats.followingCount}</span>
                  <span className="stat-label">Following</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="kpi-showcase">
            <div className="kpi-card">
              <div className="kpi-icon likes">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{engagement?.avg_likes.toLocaleString() || '0'}</span>
                <span className="kpi-label">Avg Likes</span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon comments">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{engagement?.avg_comments || '0'}</span>
                <span className="kpi-label">Avg Comments</span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon engagement">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{engagement?.engagement_rate || '0'}%</span>
                <span className="kpi-label">Engagement</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Navigation */}
      <div className="modern-nav">
        <div className="nav-pills">
          <button 
            className={`nav-pill ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M9 9h6v6H9z"/>
            </svg>
            Content
          </button>
          <button 
            className={`nav-pill ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/>
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
            </svg>
            Analytics
          </button>
        </div>
      </div>

      {/* Content/Analytics Display */}
      {activeTab === 'content' ? (
        <div className="content-display">
          <div className="content-header">
            <div className="content-filters">
              <button 
                className={`filter-btn ${contentType === 'posts' ? 'active' : ''}`}
                onClick={() => setContentType('posts')}
              >
                Posts ({posts.length})
              </button>
              <button 
                className={`filter-btn ${contentType === 'reels' ? 'active' : ''}`}
                onClick={() => setContentType('reels')}
              >
                Reels ({reels.length})
              </button>
            </div>
          </div>
          <div className="content-grid">
            {contentType === 'posts' ? (
              posts.length > 0 ? (
                posts.map((post, i) => {
                  const analytics = getAnalyticsForContent(post.post_id, 'posts');
                  return (
                    <div key={post.post_id || i} className="content-card enhanced-card">
                      <div className="card-layout">
                        <div className="card-media">
                          {post.image_url ? (
                            <>
                              <img 
                                src={post.image_url} 
                                alt="Post"
                                onError={(e) => {
                                  console.error('Failed to load post image:', post.image_url);
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                              <div className="media-placeholder" style={{ display: 'none' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                                  <circle cx="9" cy="9" r="2"/>
                                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                </svg>
                              </div>
                            </>
                          ) : (
                            <div className="media-placeholder">
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect width="18" height="18" x="3" y="3" rx="2"/>
                                <circle cx="9" cy="9" r="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                              </svg>
                            </div>
                          )}
                          <div className="media-overlay">
                            <div className="engagement-stats">
                              <span className="stat">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
                                </svg>
                                {post.likes_count?.toLocaleString() || 0}
                              </span>
                              <span className="stat">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                {post.comments_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="card-content">
                          <p className="content-caption">
                            {post.caption ? post.caption.substring(0, 80) + '...' : 'No caption'}
                          </p>
                          
                          {analytics && (
                            <div className="ml-analysis">
                              <div className="analysis-header">
                                <h4>AI Analysis</h4>
                                <div className="quality-score">
                                  Quality: {Math.round(analytics.quality_score || 0)}/10
                                </div>
                              </div>
                              
                              {analytics.keywords && analytics.keywords.length > 0 && (
                                <div className="analysis-section">
                                  <h5>Tags</h5>
                                  <div className="tags-list">
                                    {analytics.keywords.slice(0, 6).map((tag, idx) => (
                                      <span key={idx} className="tag">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {analytics.vibe_classification && (
                                <div className="analysis-section">
                                  <h5>Vibe</h5>
                                  <span className="vibe-badge">{analytics.vibe_classification}</span>
                                </div>
                              )}
                              
                              {analytics.num_people !== undefined && (
                                <div className="analysis-section">
                                  <h5>People</h5>
                                  <span className="people-count">{analytics.num_people} person{analytics.num_people !== 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-content">No posts found</div>
              )
            ) : (
              reels.length > 0 ? (
                reels.map((reel, i) => {
                  const analytics = getAnalyticsForContent(reel.reel_id, 'reels');
                  return (
                    <div key={reel.reel_id || i} className="content-card enhanced-card">
                      <div className="card-layout">
                        <div className="card-media">
                          {reel.thumbnail_url ? (
                            <>
                              <img 
                                src={reel.thumbnail_url} 
                                alt="Reel"
                                onError={(e) => {
                                  console.error('Failed to load reel thumbnail:', reel.thumbnail_url);
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                              <div className="media-placeholder" style={{ display: 'none' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                              </div>
                            </>
                          ) : (
                            <div className="media-placeholder">
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                              </svg>
                            </div>
                          )}
                          <div className="media-overlay">
                            <div className="engagement-stats">
                              <span className="stat">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                                {reel.views_count?.toLocaleString() || 0}
                              </span>
                              <span className="stat">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
                                </svg>
                                {reel.likes_count?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="card-content">
                          <p className="content-caption">
                            {reel.caption ? reel.caption.substring(0, 80) + '...' : 'No caption'}
                          </p>
                          
                          {analytics && (
                            <div className="ml-analysis">
                              <div className="analysis-header">
                                <h4>AI Analysis</h4>
                                <div className="quality-score">
                                  Quality: {Math.round(analytics.quality_score || 0)}/10
                                </div>
                              </div>
                              
                              {analytics.descriptive_tags && analytics.descriptive_tags.length > 0 && (
                                <div className="analysis-section">
                                  <h5>Tags</h5>
                                  <div className="tags-list">
                                    {analytics.descriptive_tags.slice(0, 6).map((tag, idx) => (
                                      <span key={idx} className="tag">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {analytics.vibe_classification && (
                                <div className="analysis-section">
                                  <h5>Vibe</h5>
                                  <span className="vibe-badge">{analytics.vibe_classification}</span>
                                </div>
                              )}
                              
                              {analytics.num_people !== undefined && (
                                <div className="analysis-section">
                                  <h5>People</h5>
                                  <span className="people-count">{analytics.num_people} person{analytics.num_people !== 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-content">No reels found</div>
              )
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Analytics Navigation */}
          <div className="analytics-nav">
            <div className="analytics-pills">
              <button
                className={`analytics-pill ${activeSection === 'engagement' ? 'active' : ''}`}
                onClick={() => setActiveSection('engagement')}
              >
                Engagement Performance
              </button>
              <button
                className={`analytics-pill ${activeSection === 'content' ? 'active' : ''}`}
                onClick={() => setActiveSection('content')}
              >
                Content Analysis
              </button>
              <button
                className={`analytics-pill ${activeSection === 'performance' ? 'active' : ''}`}
                onClick={() => setActiveSection('performance')}
              >
                Performance Insights
              </button>
            </div>
          </div>

          {/* Analytics Display Area */}
          <div className="analytics-display">
            {/* 1. ENGAGEMENT PERFORMANCE CHARTS */}
            {activeSection === 'engagement' && (
              <div className="analytics-content">
                <div className="section-header">
                  <h2>📊 Engagement Performance</h2>
                  <p>Track your engagement metrics over time</p>
                </div>
                <div className="chart-row">
                  <div className="chart-container">
                    <h3>Engagement Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={engagementData.engagementOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis dataKey="post" stroke="#B0B0B0" />
                        <YAxis stroke="#B0B0B0" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }} 
                        />
                        <Line type="monotone" dataKey="likes" stroke="#FF3CAC" strokeWidth={3} dot={{ fill: '#FF3CAC', strokeWidth: 2, r: 6 }} />
                        <Line type="monotone" dataKey="comments" stroke="#00F5D4" strokeWidth={3} dot={{ fill: '#00F5D4', strokeWidth: 2, r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container">
                    <h3>Likes vs Comments Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={engagementData.likesVsComments}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis dataKey="post" stroke="#B0B0B0" />
                        <YAxis stroke="#B0B0B0" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }} 
                        />
                        <Bar dataKey="likes" fill="#FF3CAC" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="comments" fill="#FF8E3C" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CONTENT ANALYSIS CHARTS */}
            {activeSection === 'content' && (
              <div className="analytics-content">
                <div className="section-header">
                  <h2>🎨 Content Analysis</h2>
                  <p>AI-powered insights into your content categories and vibes</p>
                </div>
                <div className="chart-row">
                  <div className="chart-container">
                    <h3>Content Categories</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={contentAnalysisData.contentCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({category, percentage}) => `${category} ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {contentAnalysisData.contentCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#9D4EDD', '#FF3CAC', '#00F5D4', '#FF8E3C'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container">
                    <h3>Post Vibe Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={contentAnalysisData.postVibeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          label={({vibe, percentage}) => `${vibe} ${percentage}%`}
                        >
                          {contentAnalysisData.postVibeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#A7F432', '#9D4EDD', '#FF3CAC', '#00F5D4'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="chart-row">
                  <div className="chart-container full-width">
                    <h3>Top Content Tags</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={contentAnalysisData.topContentTags} 
                        layout="vertical"
                        margin={{ left: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis type="number" stroke="#B0B0B0" />
                        <YAxis dataKey="tag" type="category" stroke="#B0B0B0" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }} 
                        />
                        <Bar dataKey="count" fill="#FF3CAC" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PERFORMANCE INSIGHTS CHARTS */}
            {activeSection === 'performance' && (
              <div className="analytics-content">
                <div className="section-header">
                  <h2>⚡ Performance Insights</h2>
                  <p>Analyze the relationship between quality and engagement</p>
                </div>
                <div className="chart-row">
                  <div className="chart-container">
                    <h3>Post Quality vs Engagement</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={performanceData.qualityVsEngagement}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis type="number" dataKey="quality" name="Quality Score" stroke="#B0B0B0" domain={[0, 100]} />
                        <YAxis type="number" dataKey="engagement" name="Total Engagement" stroke="#B0B0B0" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }} 
                          formatter={(value, name) => {
                            if (name === 'quality') return [value, 'Quality Score'];
                            if (name === 'engagement') return [value, 'Total Engagement'];
                            return [value, name];
                          }}
                        />
                        <Scatter dataKey="engagement" fill="#FF3CAC" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container">
                    <h3>Quality Indicators</h3>
                    <div className="quality-indicators">
                      {performanceData.qualityIndicators.map((indicator, index) => (
                        <div key={indicator.name} className="quality-item">
                          <span className="quality-label">{indicator.name}</span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{
                                width: `${indicator.value}%`,
                                background: `linear-gradient(90deg, ${['#9D4EDD', '#FF3CAC', '#00F5D4'][index % 3]} 0%, ${['#FF3CAC', '#00F5D4', '#FF8E3C'][index % 3]} 100%)`
                              }}
                            ></div>
                          </div>
                          <span className="quality-value">{indicator.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
