import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Typography';
import { LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';
import { colors, shadow, typography } from '../theme';

const demo = { email: 'demo@example.com', password: 'demo' };

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(credentials = { email, password }) {
    if (!credentials.email.trim() || !credentials.password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(credentials.email.trim(), credentials.password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#11162A', '#25265B', '#123E43']} locations={[0, .58, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.loginGlow} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logo}><WalletCards size={28} color="#FFFFFF" /></View>
          <Text style={styles.brand}>Dhanam</Text>
          <Text style={styles.tagline}>Your money, clearly organised.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to view your monthly financial snapshot.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="current-password"
            onChangeText={setPassword}
            onSubmitEditing={() => submit()}
            placeholder="Your password"
            placeholderTextColor={colors.textSoft}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => submit()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, submitting && styles.disabled]}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <><LockKeyhole size={17} color="#FFFFFF" /><Text style={styles.primaryText}>Sign in</Text></>}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR TRY IT SAFELY</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => submit(demo)}
            style={({ pressed }) => [styles.demoButton, pressed && styles.pressed]}
          >
            <Text style={styles.demoText}>Open demo account</Text>
          </Pressable>

          <View style={styles.privacy}>
            <ShieldCheck size={16} color={colors.positive} />
            <Text style={styles.privacyText}>Credentials are stored securely on this device.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827', overflow: 'hidden' },
  loginGlow: { position: 'absolute', width: 310, height: 310, borderRadius: 155, top: -140, right: -130, backgroundColor: 'rgba(129,140,248,0.22)' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 42 },
  hero: { alignItems: 'center', marginBottom: 26 },
  logo: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginBottom: 14 },
  brand: { ...typography, color: '#FFFFFF', fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  tagline: { ...typography, color: '#BAC1D2', fontSize: 11.5, marginTop: 4 },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', padding: 19, borderRadius: 21, backgroundColor: 'rgba(252,252,255,0.96)', ...shadow },
  title: { ...typography, color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.35 },
  subtitle: { ...typography, color: colors.textMuted, fontSize: 11.5, lineHeight: 17, marginTop: 5, marginBottom: 18 },
  error: { ...typography, color: colors.negative, backgroundColor: colors.negativeSoft, borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 16 },
  label: { ...typography, color: '#444B60', fontSize: 10.5, fontWeight: '700', marginBottom: 6 },
  input: { ...typography, height: 45, borderRadius: 11, borderWidth: 1, borderColor: '#D4D7E2', paddingHorizontal: 12, color: colors.text, backgroundColor: '#FFFFFF', fontSize: 12.5, marginBottom: 14 },
  primaryButton: { height: 45, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 3 },
  primaryText: { ...typography, color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.65 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography, color: colors.textSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  demoButton: { height: 49, borderRadius: 13, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  demoText: { ...typography, color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  privacyText: { ...typography, color: colors.textMuted, fontSize: 11 },
});
