import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { 
  profileData, 
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
  const [activeSection, setActiveSection] = useState('overview');
  const [activeTab, setActiveTab] = useState('analytics');
  const navigate = useNavigate();

  const sections = [
    { id: 'overview', name: 'Overview', data: engagementData },
    { id: 'performance', name: 'Performance', data: engagementData },
    { id: 'content', name: 'Content', data: contentAnalysisData },
    { id: 'quality', name: 'Quality', data: performanceData }
  ];

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
              <div className="photo-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            <div className="profile-details">
              <h1 className="profile-name">{profileData.username}</h1>
              <p className="profile-bio">{profileData.name} • {profileData.bio}</p>
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number">{profileData.totalPosts}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{profileData.totalFollowers}k</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{profileData.totalFollowing}</span>
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
                <span className="kpi-value">{profileData.averageLikes}</span>
                <span className="kpi-label">Avg Likes</span>
                <span className="kpi-trend">↗ {profileData.growthRate}%</span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon comments">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">52</span>
                <span className="kpi-label">Avg Comments</span>
                <span className="kpi-trend">↗ 8%</span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon engagement">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">6.2%</span>
                <span className="kpi-label">Engagement</span>
                <span className="kpi-trend">↗ 2%</span>
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
              <button className="filter-btn active">Posts</button>
              <button className="filter-btn">Reels</button>
            </div>
            <div className="content-actions">
              <button className="action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="content-grid">
            {Array.from({length: 12}, (_, i) => (
              <div key={i} className="content-card">
                <div className="card-media">
                  <div className="media-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                  </div>
                  <div className="media-overlay">
                    <div className="engagement-stats">
                      <span className="stat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
                        </svg>
                        {Math.floor(Math.random() * 1000) + 100}
                      </span>
                      <span className="stat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {Math.floor(Math.random() * 100) + 10}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card-content">
                  <div className="content-meta">
                    <span className="content-tag">#{['food', 'travel', 'lifestyle', 'aesthetic'][Math.floor(Math.random() * 4)]}</span>
                    <span className="content-vibe">{['Casual', 'Luxury', 'Energetic'][Math.floor(Math.random() * 3)]}</span>
                  </div>
                  <div className="content-performance">
                    <div className="performance-bar">
                      <div 
                        className="performance-fill" 
                        style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
                      ></div>
                    </div>
                    <span className="performance-score">{Math.floor(Math.random() * 40) + 60}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Analytics Navigation */}
          <div className="analytics-nav">
            <div className="analytics-pills">
              {sections.map(section => (
                <button
                  key={section.id}
                  className={`analytics-pill ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          {/* Analytics Display Area */}
          <div className="analytics-display">
            {activeSection === 'overview' && (
              <div className="analytics-content">
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
                    <h3>Likes vs Comments</h3>
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

        {activeSection === 'performance' && (
          <div className="analytics-content">
            <div className="chart-row">
              <div className="chart-container">
                <h3>Performance Metrics</h3>
                <div className="performance-chart">
                  <div className="chart-placeholder">
                    Performance analytics and trends
                  </div>
                </div>
              </div>
              <div className="chart-container">
                <h3>Growth Analysis</h3>
                <div className="growth-chart">
                  <div className="chart-placeholder">
                    Growth metrics and projections
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

            {activeSection === 'content' && (
              <div className="analytics-content">
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
                    <div className="tags-container">
                      {contentAnalysisData.topContentTags.map((tag, index) => (
                        <div key={tag.tag} className="tag-item">
                          <span className="tag-name">{tag.tag}</span>
                          <div className="tag-bar">
                            <div 
                              className="tag-fill" 
                              style={{ 
                                width: `${(tag.count / Math.max(...contentAnalysisData.topContentTags.map(t => t.count))) * 100}%`,
                                background: `linear-gradient(90deg, ${['#9D4EDD', '#FF3CAC', '#00F5D4', '#FF8E3C', '#A7F432'][index % 5]} 0%, ${['#FF3CAC', '#9D4EDD', '#FF8E3C', '#00F5D4', '#A7F432'][index % 5]} 100%)`
                              }}
                            ></div>
                          </div>
                          <span className="tag-count">{tag.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'quality' && (
              <div className="analytics-content">
                <div className="chart-row">
                  <div className="chart-container">
                    <h3>Post Quality vs Engagement</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={performanceData.qualityVsEngagement}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
                        <XAxis type="number" dataKey="quality" name="Quality" stroke="#B0B0B0" />
                        <YAxis type="number" dataKey="engagement" name="Engagement" stroke="#B0B0B0" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #121212', 
                            borderRadius: '8px',
                            color: '#F5F5F5'
                          }} 
                          formatter={(value, name) => [value, name === 'quality' ? 'Quality Score' : 'Engagement']}
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
