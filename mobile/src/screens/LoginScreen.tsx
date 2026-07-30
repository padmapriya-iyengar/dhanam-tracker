import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Button, Card, Field, Screen, Title } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { spacing, useAppTheme } from '../theme';

export function LoginScreen() {
  const { colors } = useAppTheme();
  const { login, loginDemo, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(demo = false) {
    setBusy(true);
    try { await (demo ? loginDemo() : login(email, password)); } catch { /* rendered from context */ } finally { setBusy(false); }
  }

  return <Screen>
    <View style={{ alignItems: 'center', gap: 12, marginTop: spacing.lg }}>
      <Image source={require('../../assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 22 }} accessibilityIgnoresInvertColors />
      <Title subtitle="A calm, private home for your family finances.">Welcome to Dhanam</Title>
    </View>
    <Card>
      <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <View>
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="current-password" error={authError || undefined} />
        <Pressable accessibilityRole="button" onPress={() => setShowPassword((value) => !value)} style={{ alignSelf: 'flex-end', paddingVertical: 10 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{showPassword ? 'Hide password' : 'Show password'}</Text>
        </Pressable>
      </View>
      <Button label={busy ? 'Signing in…' : 'Sign in'} disabled={busy || !email || !password} onPress={() => submit()} />
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <ShieldCheck size={22} color={colors.warning} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Explore with demo data</Text>
          <Text style={{ color: colors.textMuted, lineHeight: 21 }}>Demo mode contains shared sample information. Do not enter private or real financial details.</Text>
        </View>
      </View>
      <Button label={busy ? 'Opening demo…' : 'Open demo'} disabled={busy} variant="secondary" onPress={() => submit(true)} />
    </Card>
    <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13 }}>Your sign-in token is stored in this device’s secure Keychain or Keystore.</Text>
  </Screen>;
}
