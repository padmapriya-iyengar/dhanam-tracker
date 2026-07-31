import axios from 'axios';
import { Platform } from 'react-native';
import { tokenStore } from './storage';
import { HomeData, Member, Session, User } from './types';

const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || defaultUrl;
if (!__DEV__ && !API_URL.startsWith('https://')) {
  throw new Error('Dhanam production builds require an HTTPS EXPO_PUBLIC_API_URL.');
}

const client = axios.create({ baseURL: API_URL, timeout: 15000, maxContentLength: 2_000_000 });
let authExpiredHandler: (() => void | Promise<void>) | null = null;
export function setAuthExpiredHandler(handler: (() => void | Promise<void>) | null) {
  authExpiredHandler = handler;
}
client.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && authExpiredHandler) {
      await authExpiredHandler();
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Unable to reach Dhanam. Check your connection and try again.';
    if (error.response.status === 401) return 'Your session expired. Please sign in again.';
    if (error.response.status === 503) return 'Dhanam is temporarily unavailable for maintenance. Your form is still on this device.';
    return String(error.response.data?.error || 'Something went wrong. Please try again.');
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export const api = {
  login: (email: string, password: string) => client.post<{ token: string; user: User }>('/auth/login', {
    email, password, deviceName: `${Platform.OS} device`, platform: Platform.OS,
  }),
  me: () => client.get<User>('/auth/me'),
  updateProfile: (data: Partial<User>) => client.patch<User>('/auth/me', data),
  deleteAccount: (password: string) => client.delete('/auth/me', { data: { password } }),
  logout: () => client.post('/auth/logout'),
  sessions: () => client.get<Session[]>('/auth/sessions'),
  revokeSession: (id: string) => client.delete(`/auth/sessions/${id}`),
  members: () => client.get<Member[]>('/members'),
  createMember: (data: { name: string; role: string; color: string }) => client.post<Member>('/members', data),
  createAccount: (data: Record<string, unknown>) => client.post('/savings', data),
  createCard: (data: Record<string, unknown>) => client.post('/credit-cards', data),
  home: (month: number, year: number, memberId = '') => client.get<HomeData>('/mobile/home', { params: { month, year, ...(memberId ? { memberId } : {}) } }),
  accountTransactions: (params: Record<string, unknown>) => client.get('/accounts/transactions', { params }),
  accounts: () => client.get('/accounts'),
  accountCategoryComparison: (params: Record<string, unknown>) => client.get('/accounts/category-comparison', { params }),
  savingsAccounts: (params: Record<string, unknown> = {}) => client.get('/savings', { params }),
  updateAccount: (id: string, payload: Record<string, unknown>) => client.put(`/savings/${id}`, payload),
  archiveAccount: (id: string) => client.delete(`/savings/${id}`),
  balances: () => client.get('/balance'),
  updateOpeningBalance: (memberId: string, payload: Record<string, unknown>) => client.put(`/balance/${memberId}`, payload),
  creditCards: () => client.get('/credit-cards'),
  createCreditCard: (payload: Record<string, unknown>) => client.post('/credit-cards', payload),
  updateCreditCard: (id: string, payload: Record<string, unknown>) => client.put(`/credit-cards/${id}`, payload),
  archiveCreditCard: (id: string) => client.delete(`/credit-cards/${id}`),
  cardSummary: (params: Record<string, unknown>) => client.get('/credit-cards/summary', { params }),
  cardBudgets: (params: Record<string, unknown>) => client.get('/credit-cards/budgets', { params }),
  updateCardBudget: (id: string, payload: Record<string, unknown>) => client.put(`/credit-cards/${id}/budget`, payload),
  cardCycles: (params: Record<string, unknown>) => client.get('/credit-cards/cycles', { params }),
  cardReconciliation: (params: Record<string, unknown>) => client.get('/credit-cards/reconciliation', { params }),
  saveCardStatement: (payload: Record<string, unknown>) => client.put('/credit-cards/statements', payload),
  cardTrends: (params: Record<string, unknown>) => client.get('/credit-cards/monthly', { params }),
  categoryGoals: () => client.get('/category-goals'),
  updateCategoryGoal: (categoryId: string, goal: number) => client.put(`/category-goals/${categoryId}`, { goal }),
  subscriptions: (params: Record<string, unknown>) => client.get('/subscriptions', { params }),
  createSubscription: (payload: Record<string, unknown>) => client.post('/subscriptions', payload),
  updateSubscription: (id: string, payload: Record<string, unknown>) => client.put(`/subscriptions/${id}`, payload),
  archiveSubscription: (id: string) => client.delete(`/subscriptions/${id}`),
  generateSubscription: (id: string, month: number, year: number) => client.post(`/subscriptions/${id}/generate`, { month, year }),
  report: (params: Record<string, unknown>) => client.get('/reports', { params }),
  customReport: (params: Record<string, unknown>) => client.get('/reports/custom', { params }),
  reportTrend: (params: Record<string, unknown>) => client.get('/reports/trend', { params }),
  insights: (payload: Record<string, unknown>) => client.post('/insights', payload),
  chat: (payload: Record<string, unknown>) => client.post('/chat', payload),
  categories: () => client.get('/categories'),
  createCategory: (payload: Record<string, unknown>) => client.post('/categories', payload),
  updateCategory: (id: string, payload: Record<string, unknown>) => client.put(`/categories/${id}`, payload),
  archiveCategory: (id: string) => client.delete(`/categories/${id}`),
  subcategories: (categoryId: string) => client.get(`/categories/${categoryId}/subcategories`),
  createSubcategory: (categoryId: string, payload: Record<string, unknown>) => client.post(`/categories/${categoryId}/subcategories`, payload),
  updateSubcategory: (id: string, payload: Record<string, unknown>) => client.put(`/categories/subcategories/${id}`, payload),
  archiveSubcategory: (id: string) => client.delete(`/categories/subcategories/${id}`),
  updateMember: (id: string, payload: Record<string, unknown>) => client.put(`/members/${id}`, payload),
  archiveMember: (id: string) => client.delete(`/members/${id}`),
  users: () => client.get('/users'),
  createUser: (payload: Record<string, unknown>) => client.post('/users', payload),
  updateUser: (id: string, payload: Record<string, unknown>) => client.put(`/users/${id}`, payload),
  captureOptions: () => client.get('/mobile/capture/options'),
  captureSuggest: (description: string) => client.get('/mobile/capture/suggest', { params: { description } }),
  duplicateCheck: (payload: Record<string, unknown>) => client.post('/mobile/capture/duplicate-check', payload),
  createExpense: (payload: Record<string, unknown>) => client.post('/expenses', payload),
  updateExpense: (id: string, payload: Record<string, unknown>) => client.put(`/expenses/${id}`, payload),
  deleteExpense: (id: string) => client.delete(`/expenses/${id}`),
  expenses: (params: Record<string, unknown>) => client.get('/expenses', { params }),
  addRecovery: (id: string, payload: Record<string, unknown>) => client.post(`/expenses/${id}/recoveries`, payload),
  deleteRecovery: (expenseId: string, recoveryId: string) => client.delete(`/expenses/${expenseId}/recoveries/${recoveryId}`),
  createIncome: (payload: Record<string, unknown>) => client.post('/income', payload),
  updateIncome: (id: string, payload: Record<string, unknown>) => client.put(`/income/${id}`, payload),
  deleteIncome: (id: string) => client.delete(`/income/${id}`),
  createTransfer: (payload: Record<string, unknown>) => client.post('/transfers', payload),
  updateTransfer: (id: string, payload: Record<string, unknown>) => client.put(`/transfers/${id}`, payload),
  deleteTransfer: (id: string) => client.delete(`/transfers/${id}`),
  transactionDetail: (type: string, id: string) => client.get(`/${type === 'transfer' ? 'transfers' : type === 'income' ? 'income' : 'expenses'}/${id}`),
  importMessage: (message: string) => client.post('/message-import/analyze', { message }),
  messageFeedback: (payload: Record<string, unknown>) => client.post('/message-import/feedback', payload),
  messageLearnings: () => client.get('/message-import/learnings'),
  clearMessageLearnings: () => client.delete('/message-import/learnings'),
  executeQueued: (operation: string, payload: Record<string, unknown>) => {
    if (operation === 'expense.create') return client.post('/expenses', payload);
    if (operation === 'income.create') return client.post('/income', payload);
    if (operation === 'transfer.create') return client.post('/transfers', payload);
    if (operation.startsWith('recovery.create:')) return client.post(`/expenses/${operation.split(':')[1]}/recoveries`, payload);
    throw new Error('Unsupported queued operation');
  },
};
