import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, categoriesApi, membersApi, setAuthToken, usersApi } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMembers = async () => {
    const { data } = await membersApi.getAll();
    setMembers(data);
  };

  const refreshCategories = async () => {
    const { data } = await categoriesApi.getAll();
    setCategories(data);
  };

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('dhanam.authToken');
      if (!token) return;

      const { data: current } = await authApi.me();
      setCurrentUser(current);
      if (!current.isDemo) {
        const { data: userList } = await usersApi.getAll();
        setUsers(userList);
      } else {
        setUsers([]);
      }
      await Promise.all([refreshMembers(), refreshCategories()]);
    };

    load()
      .catch(() => {
        setAuthToken('');
        setCurrentUser(null);
        setUsers([]);
        setMembers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const refreshUsers = async () => {
    if (currentUser?.isDemo) return;
    const { data } = await usersApi.getAll();
    setUsers(data);
  };

  const login = async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });
    setAuthToken(data.token);
    setCurrentUser(data.user);
    if (!data.user.isDemo) {
      const { data: userList } = await usersApi.getAll();
      setUsers(userList);
    } else {
      setUsers([]);
    }
    await Promise.all([refreshMembers(), refreshCategories()]);
  };

  const logout = () => {
    setAuthToken('');
    setCurrentUser(null);
    setUsers([]);
    setMembers([]);
    window.location.reload();
  };

  const refreshCurrentUser = (user) => {
    setCurrentUser(user);
  };

  return (
    <AppContext.Provider
      value={{
        members,
        categories,
        users,
        currentUser,
        loading,
        refreshMembers,
        refreshCategories,
        refreshUsers,
        login,
        logout,
        refreshCurrentUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
