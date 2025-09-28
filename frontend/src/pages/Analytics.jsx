import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Analytics.css';
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

const Analytics = () => {
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
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-photo"></div>
        <div className="profile-info">
          <h2 className="username">{profileData.username}</h2>
          <p className="profile-sections">{profileData.name}, {profileData.bio}</p>
          <p className="stats">
            {profileData.totalPosts} posts • {profileData.totalFollowers}k followers • {profileData.totalFollowing} following
          </p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="kpi-section">
        <div className="kpi-item">
          <span className="kpi-label">Average Likes</span>
          <span className="kpi-value">{profileData.averageLikes}</span>
          <span className="kpi-trend">↗ {profileData.growthRate}%</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Average Comments</span>
          <span className="kpi-value">52</span>
          <span className="kpi-trend">↗ 8%</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Engagement Rate</span>
          <span className="kpi-value">6.2%</span>
          <span className="kpi-trend">↗ 2%</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="primary-nav">
        <button 
          className={`nav-button ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button 
          className={`nav-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Content/Analytics Display */}
      {activeTab === 'content' ? (
        <div className="content-display">
          <div className="content-nav">
            <button className="content-tab active">Posts</button>
            <button className="content-tab">Reels</button>
          </div>
          <div className="content-grid">
            {Array.from({length: 12}, (_, i) => (
              <div key={i} className="content-item">
                <div className="content-photo">
                  <span>Photo {i + 1}</span>
                  <div className="content-stats">
                    <span>❤️ {Math.floor(Math.random() * 1000) + 100}</span>
                    <span>💬 {Math.floor(Math.random() * 100) + 10}</span>
                  </div>
                </div>
                <div className="content-info">
                  <div className="content-keywords">
                    <span className="keyword">#{['food', 'travel', 'lifestyle', 'aesthetic'][Math.floor(Math.random() * 4)]}</span>
                    <span className="vibe">{['Casual', 'Luxury', 'Energetic'][Math.floor(Math.random() * 3)]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Secondary Navigation - Analytics Sub-tabs */}
          <div className="secondary-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`nav-tab ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.name}
              </button>
            ))}
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

export default Analytics;
