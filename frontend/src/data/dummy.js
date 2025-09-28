// Dummy data for analytics dashboard
export const profileData = {
  username: "john_creator",
  name: "John Creator",
  bio: "Content creator | Food & Travel enthusiast | Photography lover",
  totalPosts: 156,
  totalFollowers: 12.5,
  totalFollowing: 234,
  averageLikes: 457,
  growthRate: 4
};

export const engagementData = {
  // Line Chart - Engagement Over Time (Last 10 posts)
  engagementOverTime: [
    { post: "Post 1", likes: 420, comments: 45, date: "2024-01-15" },
    { post: "Post 2", likes: 380, comments: 52, date: "2024-01-12" },
    { post: "Post 3", likes: 520, comments: 38, date: "2024-01-10" },
    { post: "Post 4", likes: 460, comments: 67, date: "2024-01-08" },
    { post: "Post 5", likes: 340, comments: 29, date: "2024-01-05" },
    { post: "Post 6", likes: 580, comments: 73, date: "2024-01-03" },
    { post: "Post 7", likes: 490, comments: 41, date: "2024-01-01" },
    { post: "Post 8", likes: 510, comments: 58, date: "2023-12-29" },
    { post: "Post 9", likes: 430, comments: 35, date: "2023-12-27" },
    { post: "Post 10", likes: 470, comments: 62, date: "2023-12-25" }
  ],
  
  // Bar Chart - Likes vs Comments Breakdown
  likesVsComments: [
    { post: "Recent 1", likes: 520, comments: 73 },
    { post: "Recent 2", likes: 380, comments: 52 },
    { post: "Recent 3", likes: 460, comments: 67 },
    { post: "Recent 4", likes: 340, comments: 29 },
    { post: "Recent 5", likes: 580, comments: 73 }
  ]
};

export const contentAnalysisData = {
  // Pie Chart - Content Categories
  contentCategories: [
    { category: "Food", count: 45, percentage: 35 },
    { category: "Travel", count: 32, percentage: 25 },
    { category: "Fashion", count: 28, percentage: 22 },
    { category: "Lifestyle", count: 23, percentage: 18 }
  ],
  
  // Donut Chart - Post Vibe Distribution
  postVibeDistribution: [
    { vibe: "Casual", count: 38, percentage: 30 },
    { vibe: "Aesthetic", count: 32, percentage: 25 },
    { vibe: "Luxury", count: 28, percentage: 22 },
    { vibe: "Energetic", count: 30, percentage: 23 }
  ],
  
  // Horizontal Bar Chart - Top Content Tags
  topContentTags: [
    { tag: "#foodie", count: 89 },
    { tag: "#travel", count: 76 },
    { tag: "#lifestyle", count: 64 },
    { tag: "#photography", count: 58 },
    { tag: "#aesthetic", count: 52 },
    { tag: "#delicious", count: 45 },
    { tag: "#adventure", count: 41 },
    { tag: "#vibes", count: 38 }
  ]
};

export const performanceData = {
  // Scatter Plot - Post Quality vs Engagement
  qualityVsEngagement: [
    { quality: 85, engagement: 520, post: "Post A" },
    { quality: 72, engagement: 380, post: "Post B" },
    { quality: 90, engagement: 580, post: "Post C" },
    { quality: 68, engagement: 340, post: "Post D" },
    { quality: 88, engagement: 490, post: "Post E" },
    { quality: 75, engagement: 430, post: "Post F" },
    { quality: 92, engagement: 610, post: "Post G" },
    { quality: 70, engagement: 365, post: "Post H" }
  ],
  
  // Quality Indicators Progress Bars
  qualityIndicators: [
    { name: "Lighting Quality", value: 80, max: 100 },
    { name: "Visual Appeal", value: 90, max: 100 },
    { name: "Consistency", value: 60, max: 100 }
  ]
};

// Placeholder API functions for backend integration
export const apiFunctions = {
  // Profile data API
  getProfileData: async (userId) => {
    // TODO: Replace with actual API call
    console.log(`Fetching profile data for user: ${userId}`);
    return profileData;
  },
  
  // Engagement data API
  getEngagementData: async (userId, timeRange) => {
    // TODO: Replace with actual API call
    console.log(`Fetching engagement data for user: ${userId}, range: ${timeRange}`);
    return engagementData;
  },
  
  // Content analysis API
  getContentAnalysis: async (userId) => {
    // TODO: Replace with actual API call
    console.log(`Fetching content analysis for user: ${userId}`);
    return contentAnalysisData;
  },
  
  // Performance insights API
  getPerformanceData: async (userId) => {
    // TODO: Replace with actual API call
    console.log(`Fetching performance data for user: ${userId}`);
    return performanceData;
  }
};
