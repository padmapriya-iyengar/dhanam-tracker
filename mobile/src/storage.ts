import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { LockTimeout, ThemeMode } from './types';

const TOKEN = 'dhanam.secure.token';
const PIN_HASH = 'dhanam.secure.pinHash';
const PREFS = 'dhanam.preferences.v2';
const CACHE_PREFIX = 'dhanam.cache.';
const DRAFTS = 'dhanam.drafts.v1';
const QUEUE = 'dhanam.queue.v1';
const IMPORT_INBOX = 'dhanam.importInbox.v1';
const ACTIVITY_PRESETS = 'dhanam.activityPresets.v1';
const ACTIVE_HOUSEHOLD = 'dhanam.activeHousehold.v1';

async function secureGet(key: string) {
  return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}
async function secureSet(key: string, value?: string) {
  if (Platform.OS === 'web') return value ? AsyncStorage.setItem(key, value) : AsyncStorage.removeItem(key);
  return value ? SecureStore.setItemAsync(key, value) : SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  get: () => secureGet(TOKEN),
  set: (token: string) => secureSet(TOKEN, token),
  clear: () => secureSet(TOKEN),
};
export const householdStore = {
  get: () => AsyncStorage.getItem(ACTIVE_HOUSEHOLD),
  set: (id: string) => AsyncStorage.setItem(ACTIVE_HOUSEHOLD, id),
  clear: () => AsyncStorage.removeItem(ACTIVE_HOUSEHOLD),
};

export type LocalPreferences = {
  themeMode: ThemeMode;
  privacyMode: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  lockTimeout: LockTimeout;
  screenshotBlocking: boolean;
  lastBackgroundAt: number | null;
  homeMemberId: string;
  homeSections: string[];
  hiddenHomeSections: string[];
  collapsedHomeSections: string[];
  dismissedAttentionIds: string[];
  snoozedAttention: Record<string, number>;
};

export const defaultPreferences: LocalPreferences = {
  themeMode: 'system', privacyMode: false, biometricEnabled: false, pinEnabled: false,
  lockTimeout: '5m', screenshotBlocking: true, lastBackgroundAt: null,
  homeMemberId: '',
  homeSections: ['spendPulse', 'accounts', 'attention', 'activity'],
  hiddenHomeSections: [],
  collapsedHomeSections: [],
  dismissedAttentionIds: [],
  snoozedAttention: {},
};

export async function loadPreferences(): Promise<LocalPreferences> {
  const raw = await AsyncStorage.getItem(PREFS);
  return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
}
export const savePreferences = (value: LocalPreferences) => AsyncStorage.setItem(PREFS, JSON.stringify(value));

export async function setPin(pin?: string) {
  const hash = pin ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `dhanam:${pin}`) : undefined;
  await secureSet(PIN_HASH, hash);
}
export async function verifyPin(pin: string) {
  const expected = await secureGet(PIN_HASH);
  const actual = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `dhanam:${pin}`);
  return !!expected && expected === actual;
}

export async function clearFinancialCache() {
  const keys = await AsyncStorage.getAllKeys();
  const accountDataKeys = new Set([DRAFTS, QUEUE, IMPORT_INBOX, ACTIVITY_PRESETS, ACTIVE_HOUSEHOLD]);
  const removable = keys.filter((key) => key.startsWith(CACHE_PREFIX) || accountDataKeys.has(key));
  if (removable.length) await AsyncStorage.multiRemove(removable);
}

export async function readCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
  return raw ? JSON.parse(raw) as T : null;
}
export async function writeCache<T>(key: string, value: T) {
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
}

export type LocalDraft = { id: string; kind: string; updatedAt: number; values: Record<string, unknown> };
export type QueueItem = { id: string; operation: string; payload: Record<string, unknown>; status: 'pending' | 'failed'; error?: string; createdAt: number };
export async function loadDrafts(): Promise<LocalDraft[]> { return JSON.parse(await AsyncStorage.getItem(DRAFTS) || '[]'); }
export async function saveDraft(draft: LocalDraft) {
  const drafts = (await loadDrafts()).filter((item) => item.id !== draft.id);
  await AsyncStorage.setItem(DRAFTS, JSON.stringify([draft, ...drafts].slice(0, 20)));
}
export async function deleteDraft(id: string) { await AsyncStorage.setItem(DRAFTS, JSON.stringify((await loadDrafts()).filter((item) => item.id !== id))); }
export async function loadQueue(): Promise<QueueItem[]> { return JSON.parse(await AsyncStorage.getItem(QUEUE) || '[]'); }
export async function saveQueue(items: QueueItem[]) { await AsyncStorage.setItem(QUEUE, JSON.stringify(items)); }

export type ImportInboxItem = {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: 'needs_review' | 'duplicate_suspected' | 'unsupported' | 'saved' | 'dismissed' | 'failed';
  source: 'paste' | 'share' | 'screenshot';
  message?: string;
  draft?: Record<string, any>;
  duplicates?: Array<Record<string, any>>;
  error?: string;
};
export async function loadImportInbox(): Promise<ImportInboxItem[]> {
  return JSON.parse(await AsyncStorage.getItem(IMPORT_INBOX) || '[]');
}
export async function saveImportInboxItem(item: ImportInboxItem) {
  const items = (await loadImportInbox()).filter((entry) => entry.id !== item.id);
  await AsyncStorage.setItem(IMPORT_INBOX, JSON.stringify([item, ...items].slice(0, 50)));
}
export async function updateImportInboxItem(id: string, patch: Partial<ImportInboxItem>) {
  const items = (await loadImportInbox()).map((entry) => entry.id === id ? { ...entry, ...patch, updatedAt: Date.now() } : entry);
  await AsyncStorage.setItem(IMPORT_INBOX, JSON.stringify(items));
}
export async function dismissImportInbox(ids: string[]) {
  const selected = new Set(ids);
  const items = (await loadImportInbox()).map((entry) => selected.has(entry.id) ? { ...entry, status: 'dismissed' as const, message: undefined, updatedAt: Date.now() } : entry);
  await AsyncStorage.setItem(IMPORT_INBOX, JSON.stringify(items));
}

export type ActivityPreset = { id: string; name: string; filters: Record<string, any> };
export async function loadActivityPresets(): Promise<ActivityPreset[]> {
  return JSON.parse(await AsyncStorage.getItem(ACTIVITY_PRESETS) || '[]');
}
export async function saveActivityPreset(preset: ActivityPreset) {
  const presets = (await loadActivityPresets()).filter((entry) => entry.id !== preset.id);
  await AsyncStorage.setItem(ACTIVITY_PRESETS, JSON.stringify([preset, ...presets].slice(0, 12)));
}
