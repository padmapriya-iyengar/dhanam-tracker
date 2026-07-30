import * as Haptics from 'expo-haptics';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, errorMessage, setAuthExpiredHandler } from '../api';
import { clearFinancialCache, tokenStore } from '../storage';
import { User } from '../types';

type Value = {
  user: User | null;
  restoring: boolean;
  authError: string;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<User>;
};

const Context = createContext<Value | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [authError, setAuthError] = useState('');

  const clearSession = useCallback(async () => {
    await Promise.all([tokenStore.clear(), clearFinancialCache()]);
    setUser(null);
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
      } catch {
        await clearSession();
        setAuthError('Your session expired. Please sign in again.');
      } finally {
        setRestoring(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError('');
    try {
      const { data } = await api.login(email.trim().toLowerCase(), password);
      await tokenStore.set(data.token);
      setUser(data.user);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = errorMessage(error);
      setAuthError(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw new Error(message);
    }
  }, []);

  const value = useMemo<Value>(() => ({
    user, restoring, authError, login,
    loginDemo: () => login('demo@example.com', 'demo'),
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
  }), [authError, clearSession, login, restoring, user]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
