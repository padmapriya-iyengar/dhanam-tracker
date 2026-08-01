export type ThemeMode = 'light' | 'dark' | 'system';
export type LockTimeout = 'immediately' | '1m' | '5m' | 'never';

export type User = {
  _id: string;
  name: string;
  email: string;
  color: string;
  currency: 'AED' | 'INR';
  locale?: string;
  isDemo: boolean;
  onboardingCompleted?: boolean;
  hasPassword?: boolean;
  notificationPreferences?: {
    enabled: boolean;
    recurring: boolean;
    cardDue: boolean;
    budgets: boolean;
    quietStart?: string;
    quietEnd?: string;
    recurringAdvanceDays?: number;
    cardAdvanceDays?: number;
    showAmounts?: boolean;
  };
};

export type HouseholdMembership = {
  id: string; householdId: string; householdName: string; email: string;
  role: 'owner' | 'admin' | 'contributor'; status: 'invited' | 'active' | 'removed';
  userId?: string; joinedAt?: string;
};

export type Member = { _id: string; name: string; role: 'self' | 'husband' | 'other'; color: string };
export type Session = { id: string; deviceName: string; platform: string; createdAt: string; lastSeenAt: string; current: boolean };

export type HomeAccount = {
  key: string; type: string; name: string; owner: string; color: string;
  balance: number; recentMovement: number; periodSpend?: number; updatedAt: string;
};
export type HomeAttention = {
  id: string; type: string; severity: 'info' | 'warning' | 'urgent'; title: string;
  message: string; action: 'review' | 'record' | 'reconcile'; target?: string;
};
export type HomeActivity = {
  id: string; type: 'expense' | 'income' | 'transfer' | 'recovery'; title: string;
  subtitle: string; account: string; member: string; date: string; amount: number;
  transferAmount?: number; color?: string; editable: boolean; recurring?: boolean;
};
export type HomeData = {
  month: number; year: number; isCurrentMonth: boolean; generatedAt: string;
  summary: {
    totalIncome: number; netExpense: number; netSavings: number; savingsRate: number;
    savingsChange: number | null; previous: { income: number; expense: number; savings: number };
  };
  spendPulse: {
    actual: number; expectedPace: number; safeToSpend: number; recurringCommitments: number;
    goalCommitments: number; categories: Array<{ categoryId: string; name: string; color: string; total: number; count: number; goal: number | null; goalPercent: number | null }>;
  };
  funding: {
    incomeAvailable: number; accountExpenses: number; transferExpenses: number; pendingRecurring: number; cardsDue: number;
    plannedOutflow: number; salaryRemaining: number; savingsRequired: number;
    cardDues: Array<{ creditCardId: string; name: string; dueDate: string; amount: number; paid: number; remaining: number; estimated: boolean }>;
  };
  accounts: { combinedCash: number; savingsInvestments: number; cardOutstanding: number; accounts: HomeAccount[] };
  attention: HomeAttention[];
  recentActivity: HomeActivity[];
};
