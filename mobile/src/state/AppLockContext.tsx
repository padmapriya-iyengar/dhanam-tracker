import * as LocalAuthentication from 'expo-local-authentication';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { usePreferences } from './PreferencesContext';
import { verifyPin } from '../storage';

type Value = {
  locked: boolean;
  biometricAvailable: boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockNow: () => void;
};
const Context = createContext<Value | null>(null);
const timeoutMs = { immediately: 0, '1m': 60000, '5m': 300000, never: Infinity } as const;

export function AppLockProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const prefs = usePreferences();
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync()
      .then(async (hardware) => setBiometricAvailable(hardware && await LocalAuthentication.isEnrolledAsync()));
  }, []);

  useEffect(() => {
    if (!user) setLocked(false);
    else if (prefs.biometricEnabled || prefs.pinEnabled) setLocked(true);
  }, [prefs.biometricEnabled, prefs.pinEnabled, user]);

  const onAppState = useCallback((state: AppStateStatus) => {
    if (state === 'background' || state === 'inactive') backgroundAt.current = Date.now();
    if (state === 'active' && user && (prefs.biometricEnabled || prefs.pinEnabled) && backgroundAt.current !== null) {
      if (Date.now() - backgroundAt.current >= timeoutMs[prefs.lockTimeout]) setLocked(true);
      backgroundAt.current = null;
    }
  }, [prefs.biometricEnabled, prefs.lockTimeout, prefs.pinEnabled, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppState);
    return () => subscription.remove();
  }, [onAppState]);

  const value = useMemo<Value>(() => ({
    locked, biometricAvailable,
    lockNow: () => setLocked(true),
    async unlockWithBiometrics() {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Dhanam', cancelLabel: 'Use PIN', disableDeviceFallback: true,
      });
      if (result.success) setLocked(false);
      return result.success;
    },
    async unlockWithPin(pin) {
      const valid = await verifyPin(pin);
      if (valid) setLocked(false);
      return valid;
    },
  }), [biometricAvailable, locked]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppLock() {
  const value = useContext(Context);
  if (!value) throw new Error('useAppLock must be used inside AppLockProvider');
  return value;
}
