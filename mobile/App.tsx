import { useEffect, useState } from 'react';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  Roboto_900Black,
  useFonts,
} from '@expo-google-fonts/roboto';
import { AppState, Image, StyleSheet, View } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { LockScreen } from './src/screens/LockScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppLockProvider, useAppLock } from './src/state/AppLockContext';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { NetworkProvider } from './src/state/NetworkContext';
import { PreferencesProvider, usePreferences } from './src/state/PreferencesContext';
import { SyncProvider } from './src/state/SyncContext';
import { StateView } from './src/components/ui';
import { useAppTheme } from './src/theme';

SplashScreen.preventAutoHideAsync();

function Root() {
  const { user, restoring } = useAuth();
  const prefs = usePreferences();
  const { locked } = useAppLock();
  const { colors, dark } = useAppTheme();
  const [obscured, setObscured] = useState(false);
  const [fontsLoaded] = useFonts({
    Roboto: Roboto_400Regular,
    RobotoMedium: Roboto_500Medium,
    RobotoBold: Roboto_700Bold,
    RobotoBlack: Roboto_900Black,
  });

  useEffect(() => {
    if (!restoring && prefs.ready && fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, prefs.ready, restoring]);

  useEffect(() => {
    if (user && prefs.screenshotBlocking) ScreenCapture.preventScreenCaptureAsync();
    else ScreenCapture.allowScreenCaptureAsync();
    return () => { ScreenCapture.allowScreenCaptureAsync(); };
  }, [prefs.screenshotBlocking, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setObscured(state !== 'active'));
    return () => subscription.remove();
  }, []);

  if (restoring || !prefs.ready || !fontsLoaded) return <View style={[styles.fill, { backgroundColor: colors.background }]}><StateView kind="loading" title="Opening Dhanam…" message="Restoring your secure session." /></View>;
  const content = !user ? <LoginScreen /> : locked ? <LockScreen /> : !user.onboardingCompleted && !user.isDemo ? <OnboardingScreen /> : <AppNavigator />;
  return <View style={styles.fill}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    {content}
    {obscured && user && <View style={[StyleSheet.absoluteFill, styles.privacyShield, { backgroundColor: colors.background }]}><Image source={require('./assets/icon.png')} style={{ width: 76, height: 76, borderRadius: 20 }} /></View>}
  </View>;
}

export default function App() {
  return <SafeAreaProvider><PreferencesProvider><NetworkProvider><SyncProvider><AuthProvider><AppLockProvider><Root /></AppLockProvider></AuthProvider></SyncProvider></NetworkProvider></PreferencesProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  privacyShield: { zIndex: 999, alignItems: 'center', justifyContent: 'center' },
});
