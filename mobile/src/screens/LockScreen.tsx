import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Text } from '../components/Typography';
import { Fingerprint, LockKeyhole } from 'lucide-react-native';
import { Button, Field, Screen, Title } from '../components/ui';
import { useAppLock } from '../state/AppLockContext';
import { usePreferences } from '../state/PreferencesContext';
import { useAppTheme } from '../theme';

export function LockScreen() {
  const { colors } = useAppTheme();
  const prefs = usePreferences();
  const { biometricAvailable, unlockWithBiometrics, unlockWithPin } = useAppLock();
  const [pin, setPinValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefs.biometricEnabled && biometricAvailable) unlockWithBiometrics();
  }, [biometricAvailable, prefs.biometricEnabled, unlockWithBiometrics]);

  async function submitPin() {
    if (await unlockWithPin(pin)) return;
    setError('That PIN is not correct.');
    setPinValue('');
  }

  return <Screen>
    <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
      <Image source={require('../../assets/icon.png')} style={{ width: 80, height: 80, borderRadius: 20, alignSelf: 'center' }} />
      <View style={{ alignItems: 'center', gap: 10 }}>
        <LockKeyhole size={32} color={colors.primary} />
        <Title subtitle="Authenticate to view your financial information.">Dhanam is locked</Title>
      </View>
      {prefs.pinEnabled && <View style={{ gap: 12 }}>
        <Field label="App PIN" value={pin} onChangeText={setPinValue} keyboardType="number-pad" secureTextEntry maxLength={6} error={error || undefined} />
        <Button label="Unlock with PIN" disabled={pin.length < 4} onPress={submitPin} />
      </View>}
      {prefs.biometricEnabled && biometricAvailable && <Button label="Use biometrics" variant="secondary" onPress={unlockWithBiometrics} icon={<Fingerprint size={19} color={colors.text} />} />}
      <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Your financial data remains hidden while Dhanam is locked.</Text>
    </View>
  </Screen>;
}
