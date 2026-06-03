import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

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
};

export const reportsApi = {
  get: (params) => api.get('/reports', { params }),
  getTrend: (params) => api.get('/reports/trend', { params }),
};

export const insightsApi = {
  generate: () => api.post('/insights'),
};

export const creditCardsApi = {
  getAll: (params) => api.get('/credit-cards', { params }),
  getSummary: () => api.get('/credit-cards/summary'),
  getMonthly: (months) => api.get('/credit-cards/monthly', { params: { months } }),
  create: (data) => api.post('/credit-cards', data),
  update: (id, data) => api.put(`/credit-cards/${id}`, data),
  delete: (id) => api.delete(`/credit-cards/${id}`),
};

export const savingsApi = {
  getAll: () => api.get('/savings'),
  create: (data) => api.post('/savings', data),
  update: (id, data) => api.put(`/savings/${id}`, data),
  delete: (id) => api.delete(`/savings/${id}`),
};

export const balanceApi = {
  get: () => api.get('/balance'),
  update: (memberId, data) => api.put(`/balance/${memberId}`, data),
};

export const fmt = (amount) =>
  new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(amount);

export default api;
