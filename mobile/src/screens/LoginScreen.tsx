import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, View } from 'react-native';
import { Text } from '../components/Typography';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { LogIn, ShieldCheck, UserPlus } from 'lucide-react-native';
import { Button, Card, Field, Screen, Title } from '../components/ui';
import { errorMessage } from '../api';
import { useAuth } from '../state/AuthContext';
import { spacing, useAppTheme } from '../theme';

WebBrowser.maybeCompleteAuthSession();
type Mode = 'login' | 'signup' | 'verify' | 'forgot' | 'reset';
const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

function GoogleButton({ inviteToken }: { inviteToken?: string }) {
  const { googleLogin } = useAuth();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    selectAccount: true,
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (response?.type !== 'success' || !response.params.id_token) return;
    setBusy(true);
    googleLogin(response.params.id_token, inviteToken).catch((cause) => Alert.alert('Google sign-in failed', errorMessage(cause))).finally(() => setBusy(false));
  }, [googleLogin, inviteToken, response]);
  return <Button label={busy ? 'Connecting Google…' : 'Continue with Google'} variant="secondary" disabled={!request || busy} onPress={() => promptAsync()} />;
}

export function LoginScreen() {
  const { colors } = useAppTheme();
  const { login, loginDemo, signup, verifyEmail, forgotPassword, resetPassword, authError } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [token, setToken] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  useEffect(() => {
    const handle = (url?: string | null) => {
      if (!url) return; const parsed = new URL(url); const incoming = parsed.searchParams.get('token') || '';
      if (parsed.hostname === 'verify-email') { setToken(incoming); setMode('verify'); }
      if (parsed.hostname === 'reset-password') { setToken(incoming); setMode('reset'); }
      if (parsed.hostname === 'accept-invite') { setInviteToken(incoming); setMode('signup'); }
    };
    Linking.getInitialURL().then(handle); const subscription = Linking.addEventListener('url', ({ url }) => handle(url)); return () => subscription.remove();
  }, []);

  async function submit() {
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      if (mode === 'signup') {
        const result = await signup(name, email, password, inviteToken);
        if (result.verificationToken) setToken(result.verificationToken);
        setMode(result.verified ? 'login' : 'verify');
        Alert.alert('Account created', result.message);
      }
      if (mode === 'verify') await verifyEmail(token);
      if (mode === 'forgot') { await forgotPassword(email); Alert.alert('Check your email', 'If the address exists, a reset link has been sent.'); setMode('reset'); }
      if (mode === 'reset') { await resetPassword(token, password); Alert.alert('Password reset', 'Sign in with your new password.'); setMode('login'); }
    } catch (cause) { Alert.alert('Could not continue', errorMessage(cause)); } finally { setBusy(false); }
  }

  const needsEmail = ['login', 'signup', 'forgot'].includes(mode);
  const needsPassword = ['login', 'signup', 'reset'].includes(mode);
  return <Screen>
    <View style={{ alignItems: 'center', gap: 12, marginTop: spacing.lg }}>
      <Image source={require('../../assets/icon.png')} style={{ width: 78, height: 78, borderRadius: 20 }} accessibilityIgnoresInvertColors />
      <Title subtitle="A private, shared home for your family finances.">{mode === 'signup' ? 'Create your account' : mode === 'verify' ? 'Verify your email' : mode === 'forgot' || mode === 'reset' ? 'Recover access' : 'Welcome to Dhanam'}</Title>
    </View>
    <Card>
      {mode === 'signup' && <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" />}
      {mode === 'signup' && <Field label="Household invitation token (optional)" value={inviteToken} onChangeText={setInviteToken} autoCapitalize="none" />}
      {needsEmail && <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />}
      {(mode === 'verify' || mode === 'reset') && <Field label={mode === 'verify' ? 'Verification token' : 'Reset token'} value={token} onChangeText={setToken} autoCapitalize="none" />}
      {needsPassword && <View><Field label={mode === 'signup' ? 'Password (10+ characters, letters and numbers)' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} error={mode === 'login' ? authError || undefined : undefined} /><Pressable accessibilityRole="button" onPress={() => setShowPassword((value) => !value)} style={{ alignSelf: 'flex-end', paddingVertical: 10 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>{showPassword ? 'Hide password' : 'Show password'}</Text></Pressable></View>}
      <Button label={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'verify' ? 'Verify and continue' : mode === 'forgot' ? 'Send reset link' : 'Reset password'} disabled={busy || (needsEmail && !email) || (needsPassword && !password) || (mode === 'signup' && !name) || ((mode === 'verify' || mode === 'reset') && !token)} onPress={submit} />
      {mode === 'login' && <Button label="Forgot password?" variant="secondary" onPress={() => setMode('forgot')} />}
      {mode !== 'login' && <Button label="Back to sign in" variant="secondary" onPress={() => setMode('login')} />}
    </Card>
    {mode === 'login' && <Card>
      {googleConfigured && <GoogleButton inviteToken={inviteToken || undefined} />}
      <Button label="Create account with email" variant="secondary" onPress={() => setMode('signup')} icon={<UserPlus size={18} color={colors.text} />} />
      <View style={{ flexDirection: 'row', gap: 10 }}><ShieldCheck size={20} color={colors.warning} /><Text style={{ color: colors.textMuted, flex: 1 }}>Invited family members should sign up with the exact email address used in their invitation.</Text></View>
    </Card>}
    {mode === 'signup' && googleConfigured && inviteToken && <Card><Text style={{ color: colors.textMuted }}>Use the invited Google account to join the shared household directly.</Text><GoogleButton inviteToken={inviteToken} /></Card>}
    {mode === 'login' && <Button label={busy ? 'Opening demo…' : 'Open demo'} disabled={busy} variant="secondary" onPress={async () => { setBusy(true); try { await loginDemo(); } finally { setBusy(false); } }} icon={<LogIn size={18} color={colors.text} />} />}
  </Screen>;
}
