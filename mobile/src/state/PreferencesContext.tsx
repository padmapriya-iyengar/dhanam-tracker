import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultPreferences, loadPreferences, LocalPreferences, savePreferences } from '../storage';

type Value = LocalPreferences & {
  ready: boolean;
  updatePreferences: (patch: Partial<LocalPreferences>) => Promise<void>;
};

const Context = createContext<Value | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPreferences().then(setPreferences).finally(() => setReady(true));
  }, []);

  const value = useMemo<Value>(() => ({
    ...preferences,
    ready,
    async updatePreferences(patch) {
      const next = { ...preferences, ...patch };
      setPreferences(next);
      await savePreferences(next);
    },
  }), [preferences, ready]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
