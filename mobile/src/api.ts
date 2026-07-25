import axios from 'axios';
import { Platform } from 'react-native';
import { getAuthToken } from './storage';

function defaultApiUrl() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000/api';
  return 'http://localhost:5000/api';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});
export default api;

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type User = {
  _id: string;
  name: string;
  email: string;
  color?: string;
  currency?: string;
  isDemo?: boolean;
};

export type Report = {
  summary?: {
    totalIncome?: number;
    totalExpense?: number;
  };
  expenseByCategory?: Array<{
    _id?: string;
    name?: string;
    color?: string;
    total?: number;
  }>;
};

export type CardBudget = {
  _id: string;
  name: string;
  bankName?: string;
  color?: string;
  budgeted?: number;
  spent?: number;
  balance?: number;
  recoveredAmount?: number;
  status?: string;
};

export type CardBudgets = {
  rows?: CardBudget[];
  totals?: {
    budgeted?: number;
    spent?: number;
    recoveredAmount?: number;
    paid?: number;
    balance?: number;
  };
};

export type Balance = {
  memberId: string;
  memberName: string;
  memberColor?: string;
  currentBalance?: number;
  asOf?: string;
};

export type SavingsAccount = {
  _id: string;
  name: string;
  bankName?: string;
  lastFourDigits?: string;
  color?: string;
  balance?: number;
  memberId?: { _id?: string; name?: string };
};

export type Member = { _id: string; name: string; role?: string; color?: string; isActive?: boolean };
export type SubCategory = { _id: string; name: string; description?: string };
export type Category = { _id: string; name: string; color?: string; icon?: string; description?: string; subCategories?: SubCategory[] };
export type CreditCardRecord = {
  _id: string; name: string; bankName: string; memberId?: Member; lastFourDigits?: string;
  cycleStartDay?: number; cycleEndDay?: number; statementDay?: number; paymentDueDay?: number; color?: string;
};
export type Account = { key: string; id: string; type: 'current' | 'savings' | 'credit_card'; name: string; bankName?: string; owner?: string; color?: string; lastFourDigits?: string };
export type PageResult<T> = { records: T[]; total: number; page: number; pages: number; totalAmount?: number; recoveredAmount?: number; netTotalAmount?: number };
export type Entity = Record<string, any> & { _id: string };
export type MessageDraft = {
  classification: 'expense' | 'income' | 'transfer' | 'refund' | 'reminder' | 'unknown';
  status: 'completed' | 'pending' | 'unknown';
  amount: number | null; currency: string; transactionDate: string | null; merchant: string; description: string;
  memberId: string | null; accountType: 'current' | 'savings' | 'credit_card' | null; accountId: string | null;
  categoryId: string | null; subCategoryId: string | null; confidence: number; reasoning: string; warnings: string[];
};
export type MessageAnalysis = {
  draft: MessageDraft;
  duplicates: Array<{ id: string; type: string; amount: number; date: string; description: string }>;
  options: {
    members: Array<{ id: string; name: string }>;
    accounts: Array<{ type: 'current' | 'savings' | 'credit_card'; id: string; name: string; lastFourDigits?: string; memberId?: string }>;
    categories: Array<{ id: string; name: string; subcategories: Array<{ id: string; name: string }> }>;
  };
};

export const mobileApi = {
  list: <T = Entity>(path: string, params?: Record<string, unknown>) => api.get<T>(path, { params }),
  create: <T = Entity>(path: string, data: Record<string, unknown>) => api.post<T>(path, data),
  put: <T = Entity>(path: string, data: Record<string, unknown>) => api.put<T>(path, data),
  update: <T = Entity>(path: string, id: string, data: Record<string, unknown>) => api.put<T>(`${path}/${id}`, data),
  remove: (path: string, id: string) => api.delete(`${path}/${id}`),
  members: () => api.get<Member[]>('/members'),
  categories: () => api.get<Category[]>('/categories'),
  cards: () => api.get<CreditCardRecord[]>('/credit-cards'),
  savings: () => api.get<SavingsAccount[]>('/savings'),
  accounts: () => api.get<Account[]>('/accounts'),
  expenses: (params?: Record<string, unknown>) => api.get<PageResult<Entity>>('/expenses', { params }),
  income: (params?: Record<string, unknown>) => api.get<PageResult<Entity>>('/income', { params }),
  transfers: (params?: Record<string, unknown>) => api.get<PageResult<Entity>>('/transfers', { params }),
  subscriptions: (params?: Record<string, unknown>) => api.get<PageResult<Entity>>('/subscriptions', { params }),
  reports: (params?: Record<string, unknown>) => api.get<Report>('/reports', { params }),
  trend: (params?: Record<string, unknown>) => api.get<Entity[]>('/reports/trend', { params }),
  insights: () => api.post<Entity>('/insights'),
  chat: (message: string, history: Array<{ role: string; content: string }>) => api.post<Entity>('/chat', { message, history }),
  analyzeMessage: (message: string) => api.post<MessageAnalysis>('/message-import/analyze', { message }),
  learnMessageCategory: (data: { merchant?: string; description?: string; categoryId: string; subCategoryId?: string | null }) => api.post('/message-import/feedback', data),
};

export const authApi = {
  login: (email: string, password: string) => api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  me: () => api.get<User>('/auth/me'),
};

export async function getDashboard(month: number, year: number) {
  const params = { month, year };
  const [report, budgets, balances, savings] = await Promise.all([
    api.get<Report>('/reports', { params: { period: 'monthly', ...params } }),
    api.get<CardBudgets>('/credit-cards/budgets', { params }),
    api.get<Balance[]>('/balance', { params }),
    api.get<SavingsAccount[]>('/savings', { params }),
  ]);

  return {
    report: report.data,
    budgets: budgets.data,
    balances: balances.data,
    savings: savings.data,
  };
}

export function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond.';
    if (!error.response) return `Cannot reach the Dhanam API at ${API_URL}.`;
    return error.response.data?.error || `Request failed (${error.response.status}).`;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
