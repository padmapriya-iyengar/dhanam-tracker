import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Account, Category, CreditCardRecord, Member, mobileApi, SavingsAccount } from './api';

type DataValue = {
  members: Member[];
  categories: Category[];
  cards: CreditCardRecord[];
  savings: SavingsAccount[];
  accounts: Account[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: PropsWithChildren) {
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCardRecord[]>([]);
  const [savings, setSavings] = useState<SavingsAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [memberResult, categoryResult, cardResult, savingsResult, accountResult] = await Promise.all([
        mobileApi.members(), mobileApi.categories(), mobileApi.cards(), mobileApi.savings(), mobileApi.accounts(),
      ]);
      setMembers(memberResult.data);
      setCategories(categoryResult.data);
      setCards(cardResult.data);
      setSavings(savingsResult.data);
      setAccounts(accountResult.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh().catch(() => setLoading(false)); }, [refresh]);
  const value = useMemo(() => ({ members, categories, cards, savings, accounts, loading, refresh }), [members, categories, cards, savings, accounts, loading, refresh]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData must be used inside DataProvider');
  return value;
}
