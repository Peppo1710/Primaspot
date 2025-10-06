// API service for backend integration
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ;

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any request modifications here if needed
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Return successful responses
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/status');
    return response.data;
  },

  // Validate user (auto-scrapes if not in DB)
  validateUser: async (username) => {
    const response = await apiClient.get(`/user/validate/${username}`);
    return response.data;
  },

  // Get user profile
  getUserProfile: async (username) => {
    const response = await apiClient.get(`/user/profile/${username}`);
    return response.data;
  },

  // Get user posts
  getUserPosts: async (username, page = 1, limit = 20) => {
    const response = await apiClient.get(
      `/user/posts/${username}?page=${page}&limit=${limit}&sortBy=-likes_count`
    );
    return response.data;
  },

  // Get user reels
  getUserReels: async (username, page = 1, limit = 20) => {
    const response = await apiClient.get(
      `/user/reels/${username}?page=${page}&limit=${limit}&sortBy=-views_count`
    );
    return response.data;
  },

  // Get post analytics
  getPostAnalytics: async (username) => {
    const response = await apiClient.get(`/user/analytics/posts/${username}`);
    return response.data;
  },

  // Get basic engagement metrics
  getEngagementMetrics: async (username) => {
    const response = await apiClient.get(`/user/engagement/${username}`);
    return response.data;
  },

  // Get reel analytics
  getReelAnalytics: async (username) => {
    const response = await apiClient.get(`/user/analytics/reels/${username}`);
    return response.data;
  },

  // NEW ANALYTICS ENDPOINTS
  
  // Get individual engagement rates for posts and reels
  getEngagementRates: async (username) => {
    const response = await apiClient.get(`/analytics/engagement/${username}`);
    return response.data;
  },

  // Get content analysis (Grok AI)
  getContentAnalysis: async (username) => {
    const response = await apiClient.get(`/analytics/contentanalysis/content/${username}`);
    return response.data;
  },

  // Get vibe analysis (Grok AI)
  getVibeAnalysis: async (username) => {
    const response = await apiClient.get(`/analytics/contentanalysis/vibe/${username}`);
    return response.data;
  },

  // Get performance PQ vs engagement
  getPerformancePQVsEngagement: async (username) => {
    const response = await apiClient.get(`/analytics/performance/pqvsengagement/${username}`);
    return response.data;
  },

  // Get likes vs comments analytics
  getLikesVsComments: async (username) => {
    const response = await apiClient.get(`/analytics/likesvscomments/${username}`);
    return response.data;
  },

  // Get quality indicators
  getQualityIndicators: async (username) => {
    const response = await apiClient.get(`/analytics/performance/quality/${username}`);
    return response.data;
  }
};

