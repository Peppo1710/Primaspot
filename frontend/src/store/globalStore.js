// Global state management for username
let globalUsername = '';

export const setGlobalUsername = (username) => {
  globalUsername = username;
  localStorage.setItem('instagram_username', username);
};

export const getGlobalUsername = () => {
  if (!globalUsername) {
    globalUsername = localStorage.getItem('instagram_username') || '';
  }
  return globalUsername;
};

export const clearGlobalUsername = () => {
  globalUsername = '';
  localStorage.removeItem('instagram_username');
};

