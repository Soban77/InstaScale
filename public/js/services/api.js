const BASE_URL = '/api';

/**
 * Thin fetch wrapper: attaches the bearer token, handles JSON vs
 * multipart bodies, and normalizes error responses into thrown Errors.
 */
async function request(path, { method = 'GET', body, isMultipart = false, headers = {} } = {}) {
  const token = localStorage.getItem('accessToken');

  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (!isMultipart && body) finalHeaders['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    credentials: 'include',
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  verify2FA: (payload) => request('/auth/2fa/verify', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),

  // Users
  getProfile: (username) => request(`/users/${encodeURIComponent(username)}`),
  updateProfile: (formData) => request('/users/profile', { method: 'PUT', body: formData, isMultipart: true }),
  toggleFollow: (userId) => request(`/users/${userId}/follow`, { method: 'POST' }),
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),

  // Posts
  getFeed: (page = 1) => request(`/posts/feed?page=${page}`),
  getReels: (page = 1) => request(`/posts/reels?page=${page}`),
  createPost: (formData) => request('/posts', { method: 'POST', body: formData, isMultipart: true }),
  toggleLike: (postId) => request(`/posts/${postId}/like`, { method: 'POST' }),
  getComments: (postId) => request(`/posts/${postId}/comments`),
  addComment: (postId, text) => request(`/posts/${postId}/comments`, { method: 'POST', body: { text } }),
  deletePost: (postId) => request(`/posts/${postId}`, { method: 'DELETE' }),

  // Stories
  getStoryFeed: () => request('/stories/feed'),
  createStory: (formData) => request('/stories', { method: 'POST', body: formData, isMultipart: true }),
  markStoryViewed: (storyId) => request(`/stories/${storyId}/view`, { method: 'POST' }),
  getStoryViewers: (storyId) => request(`/stories/${storyId}/viewers`),

  // Profile extras
  getFollowers: (userId) => request(`/users/${userId}/followers`),
  getFollowing: (userId) => request(`/users/${userId}/following`),
  getCollections: () => request('/users/collections'),
  createCollection: (name) => request('/users/collections', { method: 'POST', body: { name } }),
  toggleSavePost: (postId, collectionName) =>
    request(`/users/${postId}/save`, { method: 'POST', body: { collectionName } }),
  toggleArchivePost: (postId) => request(`/posts/${postId}/archive`, { method: 'POST' }),
  getArchive: () => request('/posts/archive/mine'),

  // Messaging
  getConversations: () => request('/messages/conversations'),
  startConversation: (payload) => request('/messages/conversations', { method: 'POST', body: payload }),
  getChatHistory: (conversationId) => request(`/messages/${conversationId}`),
  sendMessage: (conversationId, payload, isMultipart = false) =>
    request(`/messages/${conversationId}`, { method: 'POST', body: payload, isMultipart }),
  markConversationRead: (conversationId) => request(`/messages/${conversationId}/read`, { method: 'POST' }),
  acceptMessageRequest: (conversationId) =>
    request(`/messages/requests/${conversationId}/accept`, { method: 'POST' }),
  declineMessageRequest: (conversationId) => request(`/messages/requests/${conversationId}`, { method: 'DELETE' }),

  // Shop
  getProducts: (params = '') => request(`/shop/products${params}`),
  getProduct: (id) => request(`/shop/products/${id}`),
  createProduct: (formData) => request('/shop/products', { method: 'POST', body: formData, isMultipart: true }),
  getCart: () => request('/shop/cart'),
  addToCart: (productId, quantity = 1) => request('/shop/cart', { method: 'POST', body: { productId, quantity } }),
  updateCartItem: (productId, quantity) =>
    request(`/shop/cart/${productId}`, { method: 'PUT', body: { quantity } }),
  removeFromCart: (productId) => request(`/shop/cart/${productId}`, { method: 'DELETE' }),
  checkout: () => request('/shop/checkout', { method: 'POST' }),
  getMyOrders: () => request('/shop/orders'),

  // Creator dashboard & ads
  getCreatorDashboard: () => request('/creator/dashboard'),
  getCampaigns: () => request('/creator/campaigns'),
  createCampaign: (payload) => request('/creator/campaigns', { method: 'POST', body: payload }),
  updateCampaignStatus: (id, status) => request(`/creator/campaigns/${id}`, { method: 'PUT', body: { status } }),

  // Reports & admin
  fileReport: (payload) => request('/reports', { method: 'POST', body: payload }),
  getAdminReports: (status = 'open') => request(`/admin/reports?status=${status}`),
  resolveReport: (id, payload) => request(`/admin/reports/${id}`, { method: 'PUT', body: payload }),
  banUser: (id) => request(`/admin/users/${id}/ban`, { method: 'POST' }),
  unbanUser: (id) => request(`/admin/users/${id}/unban`, { method: 'POST' }),
  getPlatformInsights: () => request('/admin/insights')
};
