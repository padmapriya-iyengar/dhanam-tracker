import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, categoriesApi, householdsApi, membersApi, setAuthToken, setHouseholdId } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMembers = async () => setMembers((await membersApi.getAll()).data);
  const refreshCategories = async () => setCategories((await categoriesApi.getAll()).data);

  const loadHouseholds = async () => {
    const { data } = await householdsApi.getAll();
    const stored = localStorage.getItem('dhanam.householdId');
    const selected = data.some((item) => item.householdId === stored) ? stored : data[0]?.householdId || '';
    setHouseholdId(selected);
    setActiveHouseholdId(selected);
    setHouseholds(data);
    return selected;
  };

  const establishSession = async ({ token, user }) => {
    setAuthToken(token);
    setCurrentUser(user);
    localStorage.setItem('dhanam.currency', user.currency || 'AED');
    await loadHouseholds();
    await Promise.all([refreshMembers(), refreshCategories()]);
  };

  useEffect(() => {
    const load = async () => {
      if (!localStorage.getItem('dhanam.authToken')) return;
      const { data: current } = await authApi.me();
      setCurrentUser(current);
      localStorage.setItem('dhanam.currency', current.currency || 'AED');
      const params = new URLSearchParams(window.location.search);
      if ((params.get('action') === 'accept-invite' || window.location.pathname.includes('accept-invite')) && params.get('token')) {
        await householdsApi.accept(params.get('token'));
        window.history.replaceState({}, '', import.meta.env.BASE_URL);
      }
      await loadHouseholds();
      await Promise.all([refreshMembers(), refreshCategories()]);
    };
    load().catch(() => {
      setAuthToken(''); setHouseholdId(''); setCurrentUser(null); setHouseholds([]); setMembers([]); setCategories([]);
    }).finally(() => setLoading(false));
  }, []);

  const login = async ({ email, password }) => establishSession((await authApi.login({ email, password, deviceName: 'Web browser', platform: 'web' })).data);
  const selectHousehold = (id) => {
    setHouseholdId(id);
    setActiveHouseholdId(id);
    window.location.reload();
  };
  const logout = () => {
    setAuthToken(''); setHouseholdId(''); localStorage.removeItem('dhanam.currency');
    setCurrentUser(null); setHouseholds([]); setMembers([]); setCategories([]);
    window.location.reload();
  };
  const refreshCurrentUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('dhanam.currency', user.currency || 'AED');
  };

  return <AppContext.Provider value={{
    members, categories, households, activeHouseholdId, currentUser, loading,
    refreshMembers, refreshCategories, loadHouseholds, login, establishSession,
    selectHousehold, logout, refreshCurrentUser,
  }}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
