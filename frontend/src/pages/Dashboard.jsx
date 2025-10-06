import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { getGlobalUsername } from '../store/globalStore';
import { api } from '../services/api';
import imageCache from '../services/imageCache';

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

  // NEW ANALYTICS STATES
  const [engagementRates, setEngagementRates] = useState(null);
  const [contentAnalysis, setContentAnalysis] = useState(null);
  const [vibeAnalysis, setVibeAnalysis] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [likesVsComments, setLikesVsComments] = useState(null);
  const [qualityIndicators, setQualityIndicators] = useState(null);

  // Helper function to get analytics for a specific post/reel
  const getAnalyticsForContent = (contentId, contentType) => {
    const analyticsData = contentType === 'posts' ? postAnalytics : reelAnalytics;
    
    // Check if analyticsData exists and is valid
    if (!analyticsData) {
      return null;
    }
    
    // Check if analyticsData is an array and has data
    if (!Array.isArray(analyticsData)) {
      // If analyticsData is an object with analytics array, use that
      if (analyticsData.analytics && Array.isArray(analyticsData.analytics)) {
        return analyticsData.analytics.find(analytics => analytics.post_id === contentId || analytics.reel_id === contentId);
      }
      
      return null;
    }
    
    if (analyticsData.length === 0) {
      return null;
    }
    
    // If analyticsData is directly an array
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
        // Health check first
        try {
          const healthRes = await api.healthCheck();
          console.log('Backend health check:', healthRes);
        } catch (error) {
          console.error('Backend health check failed:', error);
        }

        const [
          profileRes, 
          postsRes, 
          reelsRes, 
          analyticsRes, 
          engagementRes, 
          postAnalyticsRes, 
          reelAnalyticsRes,
          // NEW ANALYTICS API CALLS
          engagementRatesRes,
          contentAnalysisRes,
          vibeAnalysisRes,
          performanceDataRes,
          likesVsCommentsRes,
          qualityIndicatorsRes
        ] = await Promise.all([
          api.getUserProfile(user),
          api.getUserPosts(user, 1, 50),
          api.getUserReels(user, 1, 50),
          api.getPostAnalytics(user).catch(() => ({ success: false })),
          api.getEngagementMetrics(user),
          api.getPostAnalytics(user).catch(() => ({ success: false })),
          api.getReelAnalytics(user).catch(() => ({ success: false })),
          // NEW ANALYTICS API CALLS
          api.getEngagementRates(user).catch(() => ({ success: false })),

          
          api.getContentAnalysis(user).catch(() => ({ success: false })),
          api.getVibeAnalysis(user).catch(() => ({ success: false })),
          api.getPerformancePQVsEngagement(user).catch(() => ({ success: false })),
          api.getLikesVsComments(user).catch(() => ({ success: false })),
          api.getQualityIndicators(user).catch(() => ({ success: false }))
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
        
        // Handle post analytics data
        if (postAnalyticsRes.success && postAnalyticsRes.data) {
          setPostAnalytics(postAnalyticsRes.data);
        }
        
        // Handle reel analytics data  
        if (reelAnalyticsRes.success && reelAnalyticsRes.data) {
          setReelAnalytics(reelAnalyticsRes.data);
        }

        // Handle NEW ANALYTICS DATA
        if (engagementRatesRes.success && engagementRatesRes.data) {
          setEngagementRates(engagementRatesRes.data);
        }
        
        if (contentAnalysisRes.success && contentAnalysisRes.data) {
          // Content analysis returns {analysis: "stringified JSON"} structure
          console.log('Raw content analysis response:', contentAnalysisRes);
          try {
            const parsedAnalysis = JSON.parse(contentAnalysisRes.data.analysis);
            console.log('Parsed content analysis:', parsedAnalysis);
            // Filter out miscellaneous entries
            if (parsedAnalysis.tags) {
              parsedAnalysis.tags = parsedAnalysis.tags.filter(tag => 
                tag.tag && tag.tag.toLowerCase() !== 'miscellaneous'
              );
              console.log('Filtered tags:', parsedAnalysis.tags);
            }
            setContentAnalysis(parsedAnalysis);
          } catch (error) {
            console.error('Error parsing content analysis:', error);
            console.log('Content analysis data structure:', contentAnalysisRes.data);
            setContentAnalysis(contentAnalysisRes.data);
          }
        } else {
          console.log('Content analysis failed or no data:', contentAnalysisRes);
        }
        
        if (vibeAnalysisRes.success && vibeAnalysisRes.data) {
          // Vibe analysis returns {analysis: "stringified JSON"} structure
          console.log('Raw vibe analysis response:', vibeAnalysisRes);
          try {
            const parsedAnalysis = JSON.parse(vibeAnalysisRes.data.analysis);
            console.log('Parsed vibe analysis:', parsedAnalysis);
            // Filter out miscellaneous and empty entries
            if (parsedAnalysis.vibes) {
              parsedAnalysis.vibes = parsedAnalysis.vibes.filter(vibe => 
                vibe.vibe && 
                vibe.vibe.toLowerCase() !== 'miscellaneous' && 
                vibe.vibe.toLowerCase() !== 'empty' &&
                vibe.percentage > 0
              );
              console.log('Filtered vibes:', parsedAnalysis.vibes);
            }
            setVibeAnalysis(parsedAnalysis);
          } catch (error) {
            console.error('Error parsing vibe analysis:', error);
            console.log('Vibe analysis data structure:', vibeAnalysisRes.data);
            setVibeAnalysis(vibeAnalysisRes.data);
          }
        } else {
          console.log('Vibe analysis failed or no data:', vibeAnalysisRes);
        }
        
        if (performanceDataRes.success && performanceDataRes.data) {
          setPerformanceData(performanceDataRes.data);
        }
        
        if (likesVsCommentsRes.success && likesVsCommentsRes.data) {
          setLikesVsComments(likesVsCommentsRes.data);
        }
        
        if (qualityIndicatorsRes.success && qualityIndicatorsRes.data) {
          setQualityIndicators(qualityIndicatorsRes.data);
        }

        // Debug logging for engagement performance only
        console.log('=== ENGAGEMENT PERFORMANCE DEBUG ===');
        console.log('Engagement Rates Response:', engagementRatesRes);
        console.log('Posts data:', postsRes);
        console.log('Reels data:', reelsRes);
        console.log('Posts count:', postsRes.success ? postsRes.data.length : 0);
        console.log('Reels count:', reelsRes.success ? reelsRes.data.length : 0);
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
                <span className="kpi-value">
                  {engagementRates ? (
                    (() => {
                      const allEngagementRates = [
                        ...(engagementRates.posts || []).map(p => p.engagement_rate),
                        ...(engagementRates.reels || []).map(r => r.engagement_rate)
                      ];
                      const avgEngagementRate = allEngagementRates.length > 0 
                        ? (allEngagementRates.reduce((sum, rate) => sum + rate, 0) / allEngagementRates.length)
                        : 0;
                      return avgEngagementRate.toFixed(2);
                    })()
                  ) : engagement?.engagement_rate || '0'}%
                </span>
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
                    <div key={post.post_id || i} className="wireframe-card">
                      {/* Left Panel - Content Display */}
                      <div className="card-left-panel">
                        <div className="image-section">
                          {post.image_url ? (
                            <img 
                              src={post.image_url} 
                              alt="Post"
                              onError={(e) => {
                                console.error('Failed to load post image:', post.image_url);
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="image-placeholder">
                              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect width="18" height="18" x="3" y="3" rx="2"/>
                                <circle cx="9" cy="9" r="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Navigation Indicators */}
                        <div className="indicators">
                          <div className="indicator-dot"></div>
                          <div className="indicator-dot"></div>
                        </div>
                        
                        {/* Bio Section */}
                        <div className="bio-section">
                          <h4 className="bio-title">Bio</h4>
                          <p className="bio-text">
                            {post.caption ? post.caption.substring(0, 100) + '...' : 'No caption available'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Right Panel - Analysis Section */}
                      <div className="card-right-panel">
                        <div className="analysis-header">
                          <h4>Analysis</h4>
                        </div>
                        
                        {/* Tags Section */}
                        <div className="analysis-section">
                          <h5 className="section-label">Tags -</h5>
                          <div className="tags-display">
                            {analytics && analytics.keywords && analytics.keywords.length > 0 ? (
                              analytics.keywords.slice(0, 3).map((tag, idx) => (
                                <div key={idx} className="tag-item">{tag}</div>
                              ))
                            ) : (
                              <>
                                <div className="tag-item placeholder">Tag 1</div>
                                <div className="tag-item placeholder">Tag 2</div>
                                <div className="tag-item placeholder">Tag 3</div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Ambience Section */}
                        <div className="analysis-section">
                          <h5 className="section-label">Ambience -</h5>
                          <div className="ambience-display">
                            {analytics && analytics.vibe_classification ? (
                              analytics.vibe_classification.split(',').slice(0, 3).map((vibe, idx) => (
                                <div key={idx} className="ambience-item">{vibe.trim()}</div>
                              ))
                            ) : (
                              <>
                                <div className="ambience-item placeholder">Ambience 1</div>
                                <div className="ambience-item placeholder">Ambience 2</div>
                                <div className="ambience-item placeholder">Ambience 3</div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Quality Section */}
                        <div className="analysis-section compact">
                          <h5 className="section-label">Quality</h5>
                          <div className="quality-display compact">
                            {analytics ? (
                              <>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Quality</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.quality_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.quality_score || 0) * 10), 100)}%</span>
                                </div>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Lighting</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.lighting_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.lighting_score || 0) * 10), 100)}%</span>
                                </div>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Visual</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.visual_appeal_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.visual_appeal_score || 0) * 10), 100)}%</span>
                                </div>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Consistency</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.consistency_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.consistency_score || 0) * 10), 100)}%</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Quality</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '75%'}}></div>
                                  </div>
                                  <span className="quality-value-small">75%</span>
                                </div>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Lighting</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '60%'}}></div>
                                  </div>
                                  <span className="quality-value-small">60%</span>
                                </div>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Visual</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '80%'}}></div>
                                  </div>
                                  <span className="quality-value-small">80%</span>
                                </div>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Consistency</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '45%'}}></div>
                                  </div>
                                  <span className="quality-value-small">45%</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-content">No posts found</div>
              )
            ) : (
              (() => {
                console.log('Rendering reels section, reels count:', reels.length);
                console.log('Reels data:', reels);
                return reels.length > 0 ? (
                  reels.map((reel, i) => {
                  const analytics = getAnalyticsForContent(reel.reel_id, 'reels');
                  return (
                    <div key={reel.reel_id || i} className="wireframe-card">
                      {/* Left Panel - Content Display */}
                      <div className="card-left-panel">
                        <div className="image-section">
                          {reel.thumbnail_url ? (
                            <img 
                              src={reel.thumbnail_url} 
                              alt="Reel"
                              onError={(e) => {
                                console.error('Failed to load reel thumbnail:', reel.thumbnail_url);
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="image-placeholder">
                              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Navigation Indicators */}
                        <div className="indicators">
                          <div className="indicator-dot"></div>
                          <div className="indicator-dot"></div>
                        </div>
                        
                        {/* Bio Section */}
                        <div className="bio-section">
                          <h4 className="bio-title">Bio</h4>
                          <p className="bio-text">
                            {reel.caption ? reel.caption.substring(0, 100) + '...' : 'No caption available'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Right Panel - Analysis Section */}
                      <div className="card-right-panel">
                        <div className="analysis-header">
                          <h4>Analysis</h4>
                        </div>
                        
                        {/* Tags Section */}
                        <div className="analysis-section">
                          <h5 className="section-label">Tags -</h5>
                          <div className="tags-display">
                            {analytics && analytics.descriptive_tags && analytics.descriptive_tags.length > 0 ? (
                              analytics.descriptive_tags.slice(0, 3).map((tag, idx) => (
                                <div key={idx} className="tag-item">{tag}</div>
                              ))
                            ) : (
                              <>
                                <div className="tag-item placeholder">Tag 1</div>
                                <div className="tag-item placeholder">Tag 2</div>
                                <div className="tag-item placeholder">Tag 3</div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Ambience Section */}
                        <div className="analysis-section">
                          <h5 className="section-label">Ambience -</h5>
                          <div className="ambience-display">
                            {analytics && analytics.vibe_classification ? (
                              analytics.vibe_classification.split(',').slice(0, 3).map((vibe, idx) => (
                                <div key={idx} className="ambience-item">{vibe.trim()}</div>
                              ))
                            ) : (
                              <>
                                <div className="ambience-item placeholder">Ambience 1</div>
                                <div className="ambience-item placeholder">Ambience 2</div>
                                <div className="ambience-item placeholder">Ambience 3</div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Quality Section */}
                        <div className="analysis-section compact">
                          <h5 className="section-label">Quality</h5>
                          <div className="quality-display compact">
                            {analytics ? (
                              <>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Quality</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.quality_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.quality_score || 0) * 10), 100)}%</span>
                                </div>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Lighting</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.lighting_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.lighting_score || 0) * 10), 100)}%</span>
                                </div>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Visual</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.visual_appeal_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.visual_appeal_score || 0) * 10), 100)}%</span>
                                </div>
                                <div className="quality-item compact">
                                  <span className="quality-label-small">Consistency</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: `${Math.min(Math.min(Math.round((analytics.consistency_score || 0) * 10), 100), 100)}%`}}></div>
                                  </div>
                                  <span className="quality-value-small">{Math.min(Math.round((analytics.consistency_score || 0) * 10), 100)}%</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Quality</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '75%'}}></div>
                                  </div>
                                  <span className="quality-value-small">75%</span>
                                </div>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Lighting</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '60%'}}></div>
                                  </div>
                                  <span className="quality-value-small">60%</span>
                                </div>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Visual</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '80%'}}></div>
                                  </div>
                                  <span className="quality-value-small">80%</span>
                                </div>
                                <div className="quality-item compact placeholder">
                                  <span className="quality-label-small">Consistency</span>
                                  <div className="quality-bar compact">
                                    <div className="quality-fill" style={{width: '45%'}}></div>
                                  </div>
                                  <span className="quality-value-small">45%</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                ) : (
                  <div className="no-content">No reels found</div>
                );
              })()
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
                  <h2> Engagement Performance</h2>
                  <p>Individual engagement rates for posts and reels</p>
                </div>
                <div className="chart-row">
                  <div className="chart-container">
                    <h3>Individual Engagement Rates - Posts</h3>
                    {engagementRates?.posts && engagementRates.posts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={engagementRates.posts.slice(0, 10).map((post, index) => ({
                          ...post,
                          postLabel: `Post ${index + 1}`
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                          <XAxis 
                            dataKey="postLabel" 
                            stroke="#B0B0B0" 
                            height={60}
                            interval={0}
                          />
                          <YAxis 
                            stroke="#B0B0B0"
                            label={{ value: 'ER (%)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFFFFF', 
                              border: '1px solid #E0E0E0', 
                              borderRadius: '8px',
                              color: '#000000'
                            }}
                            formatter={(value, name, props) => {
                              if (name === 'engagement_rate') {
                                return [
                                  <div>
                                    <div><strong>Engagement Rate:</strong> {value}%</div>
                                    <div><strong>Likes:</strong> {props.payload.likes_count}</div>
                                    <div><strong>Comments:</strong> {props.payload.comments_count}</div>
                                    <div><strong>Total Engagement:</strong> {props.payload.total_engagement}</div>
                                  </div>
                                ];
                              }
                              return [value, name];
                            }}
                            labelFormatter={(label) => label}
                          />
                          <Bar dataKey="engagement_rate" fill="#FF3CAC" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">
                        {engagementRates ? 'No posts engagement data available' : 'Loading engagement data...'}
                      </div>
                    )}
                  </div>
                  <div className="chart-container">
                    <h3>Individual Engagement Rates - Reels</h3>
                    {engagementRates?.reels && engagementRates.reels.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={engagementRates.reels.slice(0, 10).map((reel, index) => ({
                          ...reel,
                          reelLabel: `Reel ${index + 1}`
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                          <XAxis 
                            dataKey="reelLabel" 
                            stroke="#B0B0B0" 
                            height={60}
                            interval={0}
                          />
                          <YAxis 
                            stroke="#B0B0B0"
                            label={{ value: 'ER (%)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFFFFF', 
                              border: '1px solid #E0E0E0', 
                              borderRadius: '8px',
                              color: '#000000'
                            }}
                            formatter={(value, name, props) => {
                              if (name === 'engagement_rate') {
                                return [
                                  <div>
                                    <div><strong>Engagement Rate:</strong> {value}%</div>
                                    <div><strong>Likes:</strong> {props.payload.likes_count}</div>
                                    <div><strong>Comments:</strong> {props.payload.comments_count}</div>
                                    <div><strong>Total Engagement:</strong> {props.payload.total_engagement}</div>
                                  </div>
                                ];
                              }
                              return [value, name];
                            }}
                            labelFormatter={(label) => label}
                          />
                          <Bar dataKey="engagement_rate" fill="#00F5D4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">
                        {engagementRates ? 'No reels engagement data available' : 'Loading engagement data...'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="chart-row">
                  <div className="chart-container full-width">
                    <h3>Likes vs Comments Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={likesVsComments?.posts_data?.slice(0, 10) || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis dataKey="date" stroke="#B0B0B0" />
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
                    {contentAnalysis?.tags && contentAnalysis.tags.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={contentAnalysis.tags}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({tag, percentage}) => `${tag} ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="percentage"
                          >
                            {contentAnalysis.tags.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#9D4EDD', '#FF3CAC', '#00F5D4', '#FF8E3C', '#A7F432'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFFFFF', 
                              border: '1px solid #E0E0E0', 
                              borderRadius: '8px',
                              color: '#000000'
                            }}
                            formatter={(value, name) => [`${value}%`, 'Percentage']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">
                        {contentAnalysis ? `No content tags found (${contentAnalysis.tags ? contentAnalysis.tags.length : 0} tags)` : 'Loading content analysis...'}
                        <br />
                        <small>Debug: {JSON.stringify(contentAnalysis)}</small>
                      </div>
                    )}
                  </div>
                  <div className="chart-container">
                    <h3>Post Vibe Distribution</h3>
                    {vibeAnalysis?.vibes && vibeAnalysis.vibes.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={vibeAnalysis.vibes}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="percentage"
                            label={({vibe, percentage}) => `${vibe} ${percentage}%`}
                          >
                            {vibeAnalysis.vibes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#A7F432', '#9D4EDD', '#FF3CAC', '#00F5D4', '#FF8E3C'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFFFFF', 
                              border: '1px solid #E0E0E0', 
                              borderRadius: '8px',
                              color: '#000000'
                            }}
                            formatter={(value, name) => [`${value}%`, 'Percentage']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">
                        {vibeAnalysis ? `No vibe data found (${vibeAnalysis.vibes ? vibeAnalysis.vibes.length : 0} vibes)` : 'Loading vibe analysis...'}
                        <br />
                        <small>Debug: {JSON.stringify(vibeAnalysis)}</small>
                      </div>
                    )}
                  </div>
                </div>
                <div className="chart-row">
                  <div className="chart-container full-width">
                    <h3>Top Content Tags</h3>
                    {contentAnalysis?.tags && contentAnalysis.tags.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart 
                          data={contentAnalysis.tags} 
                          layout="vertical"
                          margin={{ left: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                          <XAxis type="number" stroke="#B0B0B0" domain={[0, 100]} />
                          <YAxis dataKey="tag" type="category" stroke="#B0B0B0" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFFFFF', 
                              border: '1px solid #E0E0E0', 
                              borderRadius: '8px',
                              color: '#000000'
                            }}
                            formatter={(value, name) => [`${value}%`, 'Percentage']}
                          />
                          <Bar dataKey="percentage" fill="#FF3CAC" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">
                        {contentAnalysis ? `No content tags found for bar chart (${contentAnalysis.tags ? contentAnalysis.tags.length : 0} tags)` : 'Loading content tags...'}
                        <br />
                        <small>Debug: {JSON.stringify(contentAnalysis)}</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. PERFORMANCE INSIGHTS CHARTS */}
            {activeSection === 'performance' && (
              <div className="analytics-content">
                <div className="section-header">
                  <h2>⚡ Performance Insights</h2>
                  <p>Quality scores vs engagement rates for posts and reels</p>
                </div>
                <div className="chart-row">
                  <div className="chart-container">
                    <h3>Posts: Quality Score vs Engagement Rate</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={performanceData?.posts || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis type="number" dataKey="quality_score" name="Quality Score" stroke="#B0B0B0" domain={[0, 100]} />
                        <YAxis type="number" dataKey="engagement_rate_percentage" name="Engagement Rate %" stroke="#B0B0B0" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }}
                          formatter={(value, name) => {
                            if (name === 'quality_score') return [value, 'Quality Score'];
                            if (name === 'engagement_rate_percentage') return [`${value}%`, 'Engagement Rate'];
                            return [value, name];
                          }}
                        />
                        <Scatter dataKey="engagement_rate_percentage" fill="#FF3CAC" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container">
                    <h3>Reels: Quality Score vs Engagement Rate</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={performanceData?.reels || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis type="number" dataKey="quality_score" name="Quality Score" stroke="#B0B0B0" domain={[0, 100]} />
                        <YAxis type="number" dataKey="engagement_rate_percentage" name="Engagement Rate %" stroke="#B0B0B0" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }}
                          formatter={(value, name) => {
                            if (name === 'quality_score') return [value, 'Quality Score'];
                            if (name === 'engagement_rate_percentage') return [`${value}%`, 'Engagement Rate'];
                            return [value, name];
                          }}
                        />
                        <Scatter dataKey="engagement_rate_percentage" fill="#00F5D4" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="chart-row">
                  <div className="chart-container full-width">
                    <h3>Quality Indicators</h3>
                    <div className="quality-indicators">
                      {qualityIndicators?.quality_indicators ? (
                        Object.entries(qualityIndicators.quality_indicators).map(([key, value], index) => {
                          // Normalize values to 0-100 scale
                          let normalizedValue = value;
                          if (typeof value === 'number') {
                            // If value is already in 0-100 range, use as is
                            // If value is in 0-10 range, multiply by 10
                            // If value is in 0-1 range, multiply by 100
                            if (value <= 1) {
                              normalizedValue = value * 100;
                            } else if (value <= 10) {
                              normalizedValue = value * 10;
                            } else if (value > 100) {
                              normalizedValue = Math.min(value / 10, 100); // Cap at 100
                            }
                          }
                          
                          return (
                            <div key={key} className="quality-item">
                              <span className="quality-label">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{
                                    width: `${Math.min(normalizedValue, 100)}%`,
                                    background: `linear-gradient(90deg, ${['#9D4EDD', '#FF3CAC', '#00F5D4'][index % 3]} 0%, ${['#FF3CAC', '#00F5D4', '#FF8E3C'][index % 3]} 100%)`
                                  }}
                                ></div>
                              </div>
                              <span className="quality-value">{Math.round(normalizedValue)}%</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="no-data">No quality indicators data available</div>
                      )}
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
