import { createContext, useContext, useEffect, useState } from 'react';
import { membersApi, categoriesApi } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
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
    Promise.all([refreshMembers(), refreshCategories()]).finally(() => setLoading(false));
  }, []);

  return (
    <AppContext.Provider value={{ members, categories, loading, refreshMembers, refreshCategories }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
