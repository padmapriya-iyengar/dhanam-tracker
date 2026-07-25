import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, authApi, User } from './api';
import { getAuthToken, setAuthToken } from './storage';

type AuthContextValue = {
  user: User | null;
  restoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        if (!await getAuthToken()) return;
        const response = await authApi.me();
        setUser(response.data);
      } catch {
        await setAuthToken('');
      } finally {
        setRestoring(false);
      }
    }
    restore();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    restoring,
    async login(email, password) {
      try {
        const response = await authApi.login(email, password);
        await setAuthToken(response.data.token);
        setUser(response.data.user);
      } catch (error) {
        throw new Error(apiErrorMessage(error));
      }
    },
    async logout() {
      await setAuthToken('');
      setUser(null);
    },
  }), [restoring, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
