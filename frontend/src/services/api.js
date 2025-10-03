// API service for backend integration
const API_BASE_URL = 'https://primaspot-y10q.onrender.com/api';

export const api = {
  // Validate user (auto-scrapes if not in DB)
  validateUser: async (username) => {
    const response = await fetch(`${API_BASE_URL}/user/validate/${username}`);
    return response.json();
  },

  // Get user profile
  getUserProfile: async (username) => {
    const response = await fetch(`${API_BASE_URL}/user/profile/${username}`);
    return response.json();
  },

  // Get user posts
  getUserPosts: async (username, page = 1, limit = 20) => {
    const response = await fetch(
      `${API_BASE_URL}/user/posts/${username}?page=${page}&limit=${limit}&sortBy=-likes_count`
    );
    return response.json();
  },

  // Get user reels
  getUserReels: async (username, page = 1, limit = 20) => {
    const response = await fetch(
      `${API_BASE_URL}/user/reels/${username}?page=${page}&limit=${limit}&sortBy=-views_count`
    );
    return response.json();
  },

  // Get post analytics
  getPostAnalytics: async (username) => {
    const response = await fetch(`${API_BASE_URL}/user/analytics/posts/${username}`);
    return response.json();
  },

  // Get engagement metrics
  getEngagementMetrics: async (username) => {
    const response = await fetch(`${API_BASE_URL}/user/engagement/${username}`);
    return response.json();
  },

  // Get reel analytics
  getReelAnalytics: async (username) => {
    const response = await fetch(`${API_BASE_URL}/user/analytics/reels/${username}`);
    return response.json();
  }
};

