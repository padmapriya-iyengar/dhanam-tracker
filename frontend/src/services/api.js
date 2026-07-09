import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.BASE_URL}api` });

export const getAuthToken = () => localStorage.getItem('dhanam.authToken') || '';

export const setAuthToken = (token) => {
  if (token) localStorage.setItem('dhanam.authToken', token);
  else localStorage.removeItem('dhanam.authToken');
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const membersApi = {
  getAll: () => api.get('/members'),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
};

export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  createSub: (categoryId, data) => api.post(`/categories/${categoryId}/subcategories`, data),
  updateSub: (id, data) => api.put(`/categories/subcategories/${id}`, data),
  deleteSub: (id) => api.delete(`/categories/subcategories/${id}`),
};

export const incomeApi = {
  getAll: (params) => api.get('/income', { params }),
  create: (data) => api.post('/income', data),
  update: (id, data) => api.put(`/income/${id}`, data),
  delete: (id) => api.delete(`/income/${id}`),
};

export const expensesApi = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  addRecovery: (id, data) => api.post(`/expenses/${id}/recoveries`, data),
  deleteRecovery: (id, recoveryId) => api.delete(`/expenses/${id}/recoveries/${recoveryId}`),
};

export const reportsApi = {
  get: (params) => api.get('/reports', { params }),
  getTrend: (params) => api.get('/reports/trend', { params }),
  getCustom: (params) => api.get('/reports/custom', { params }),
};

export const insightsApi = {
  generate: () => api.post('/insights'),
};

export const creditCardsApi = {
  getAll: (params) => api.get('/credit-cards', { params }),
  getSummary: () => api.get('/credit-cards/summary'),
  getMonthly: (months) => api.get('/credit-cards/monthly', { params: { months } }),
  getBudgets: (params) => api.get('/credit-cards/budgets', { params }),
  saveBudget: (id, data) => api.put(`/credit-cards/${id}/budget`, data),
  getCycles: (params) => api.get('/credit-cards/cycles', { params }),
  getReconciliation: (params) => api.get('/credit-cards/reconciliation', { params }),
  saveStatement: (data) => api.put('/credit-cards/statements', data),
  create: (data) => api.post('/credit-cards', data),
  update: (id, data) => api.put(`/credit-cards/${id}`, data),
  delete: (id) => api.delete(`/credit-cards/${id}`),
};

export const transfersApi = {
  getAll: (params) => api.get('/transfers', { params }),
  create: (data) => api.post('/transfers', data),
  update: (id, data) => api.put(`/transfers/${id}`, data),
  delete: (id) => api.delete(`/transfers/${id}`),
};

export const subscriptionsApi = {
  getAll: (params) => api.get('/subscriptions', { params }),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  delete: (id) => api.delete(`/subscriptions/${id}`),
  generate: (id, data) => api.post(`/subscriptions/${id}/generate`, data),
};

export const savingsApi = {
  getAll: (params) => api.get('/savings', { params }),
  create: (data) => api.post('/savings', data),
  update: (id, data) => api.put(`/savings/${id}`, data),
  delete: (id) => api.delete(`/savings/${id}`),
};

export const balanceApi = {
  get: (params) => api.get('/balance', { params }),
  update: (memberId, data) => api.put(`/balance/${memberId}`, data),
};

export const categoryGoalsApi = {
  getAll: () => api.get('/category-goals'),
  update: (categoryId, goal) => api.put(`/category-goals/${categoryId}`, { goal }),
};

export const getCurrencyCode = () => localStorage.getItem('dhanam.currency') || 'AED';

export const fmt = (amount) => {
  const currency = getCurrencyCode();
  const locale = currency === 'INR' ? 'en-IN' : 'en-AE';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
};

export default api;
