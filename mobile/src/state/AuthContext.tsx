import * as Haptics from 'expo-haptics';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, errorMessage, setAuthExpiredHandler } from '../api';
import { clearFinancialCache, householdStore, tokenStore } from '../storage';
import { HouseholdMembership, User } from '../types';

type Value = {
  user: User | null;
  restoring: boolean;
  authError: string;
  households: HouseholdMembership[];
  activeHouseholdId: string;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  signup: (name: string, email: string, password: string, inviteToken?: string) => Promise<any>;
  verifyEmail: (token: string) => Promise<void>;
  googleLogin: (idToken: string, inviteToken?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  refreshHouseholds: () => Promise<void>;
  selectHousehold: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<User>;
};

const Context = createContext<Value | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [authError, setAuthError] = useState('');
  const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState('');

  const refreshHouseholds = useCallback(async () => {
    const rows = (await api.households()).data;
    const stored = await householdStore.get();
    const selected = rows.some((row) => row.householdId === stored) ? stored! : rows[0]?.householdId || '';
    if (selected) await householdStore.set(selected);
    setHouseholds(rows); setActiveHouseholdId(selected);
  }, []);

  const establishSession = useCallback(async (data: { token: string; user: User }) => {
    await tokenStore.set(data.token);
    setUser(data.user);
    await refreshHouseholds();
  }, [refreshHouseholds]);

  const clearSession = useCallback(async () => {
    await Promise.all([tokenStore.clear(), clearFinancialCache()]);
    setUser(null);
    setHouseholds([]); setActiveHouseholdId('');
  }, []);

  useEffect(() => {
    setAuthExpiredHandler(async () => {
      setAuthError('Your session expired. Please sign in again.');
      await clearSession();
    });
    return () => setAuthExpiredHandler(null);
  }, [clearSession]);

  useEffect(() => {
    (async () => {
      try {
        if (!await tokenStore.get()) return;
        const { data } = await api.me();
        setUser(data);
        await refreshHouseholds();
      } catch {
        await clearSession();
        setAuthError('Your session expired. Please sign in again.');
      } finally {
        setRestoring(false);
      }
    })();
  }, [clearSession, refreshHouseholds]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError('');
    try {
      const { data } = await api.login(email.trim().toLowerCase(), password);
      await establishSession(data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = errorMessage(error);
      setAuthError(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw new Error(message);
    }
  }, [establishSession]);

  const value = useMemo<Value>(() => ({
    user, restoring, authError, login, households, activeHouseholdId, refreshHouseholds,
    loginDemo: () => login('demo@example.com', 'demo'),
    signup: async (name, email, password, inviteToken) => (await api.signup({ name, email: email.trim().toLowerCase(), password, ...(inviteToken ? { inviteToken } : {}) })).data,
    async verifyEmail(token) { await establishSession((await api.verifyEmail(token.trim())).data); },
    async googleLogin(idToken, inviteToken) { await establishSession((await api.googleLogin(idToken, inviteToken)).data); },
    async forgotPassword(email) { await api.forgotPassword(email.trim().toLowerCase()); },
    async resetPassword(token, password) { await api.resetPassword(token.trim(), password); },
    async selectHousehold(id) { await householdStore.set(id); setActiveHouseholdId(id); await clearFinancialCache(); await householdStore.set(id); },
    async logout() {
      try { await api.logout(); } catch { /* local logout must still succeed */ }
      await clearSession();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    async updateUser(patch) {
      const { data } = await api.updateProfile(patch);
      setUser(data);
      return data;
    },
  }), [activeHouseholdId, authError, clearSession, establishSession, households, login, refreshHouseholds, restoring, user]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
