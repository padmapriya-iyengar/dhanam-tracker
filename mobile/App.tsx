import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FullAppScreen } from './src/screens/FullAppScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F766E' }} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <FullAppScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
