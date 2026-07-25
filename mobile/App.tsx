import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/AuthContext';
import { LoadingScreen } from './src/components/LoadingScreen';
import { DataProvider } from './src/DataContext';
import { Navigation } from './src/Navigation';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';
import { ThemeProvider, useTheme } from './src/ThemeContext';

function AppContent() {
  const { user, restoring } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  if (restoring) return <LoadingScreen label="Restoring your session…" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: user ? themeColors.background : themeColors.backdrop }} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? <DataProvider><Navigation /></DataProvider> : <LoginScreen />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider><AuthProvider><AppContent /></AuthProvider></ThemeProvider>
    </SafeAreaProvider>
  );
}
