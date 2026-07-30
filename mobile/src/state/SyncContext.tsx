import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { api, errorMessage } from '../api';
import { loadQueue, QueueItem, saveQueue } from '../storage';
import { useNetwork } from './NetworkContext';

type Value = { queue: QueueItem[]; enqueue: (operation: string, payload: Record<string, unknown>) => Promise<void>; sync: () => Promise<void> };
const Context = createContext<Value | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const { online } = useNetwork();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  useEffect(() => { loadQueue().then(setQueue); }, []);
  const sync = useCallback(async () => {
    if (!online) return;
    const current = await loadQueue();
    const remaining: QueueItem[] = [];
    for (const item of current) {
      try { await api.executeQueued(item.operation, item.payload); }
      catch (error) { remaining.push({ ...item, status: 'failed', error: errorMessage(error) }); }
    }
    await saveQueue(remaining); setQueue(remaining);
  }, [online]);
  useEffect(() => { if (online) sync(); }, [online, sync]);
  const value = useMemo<Value>(() => ({ queue, sync, async enqueue(operation, payload) {
    const item: QueueItem = { id: `${Date.now()}-${Math.random()}`, operation, payload, status: 'pending', createdAt: Date.now() };
    const next = [...queue, item]; setQueue(next); await saveQueue(next);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } }), [queue, sync]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSync() { const value = useContext(Context); if (!value) throw new Error('useSync requires SyncProvider'); return value; }
