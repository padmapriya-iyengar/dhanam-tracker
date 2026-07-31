import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '../components/Typography';
import * as Haptics from 'expo-haptics';
import * as Google from 'expo-auth-session/providers/google';
import { Fingerprint, KeyRound, MonitorSmartphone, ShieldCheck, Trash2 } from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Button, Card, Field, Screen, StateView, Title } from '../components/ui';
import { useAppLock } from '../state/AppLockContext';
import { usePreferences } from '../state/PreferencesContext';
import { setPin } from '../storage';
import { Session } from '../types';
import { useAppTheme } from '../theme';
const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

function GoogleLinkButton({ linked, refresh }: { linked: boolean; refresh: () => void }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({ androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, selectAccount: true });
  useEffect(() => { if (response?.type === 'success' && response.params.id_token) api.linkGoogle(response.params.id_token).then(() => { Alert.alert('Google linked', 'You can now use Google to sign in.'); refresh(); }).catch((cause) => Alert.alert('Could not link Google', errorMessage(cause))); }, [response]);
  return <Button label={linked ? 'Google sign-in linked ✓' : 'Link Google sign-in'} variant="secondary" disabled={linked || !request} onPress={() => promptAsync()} />;
}

export function SecurityScreen() {
  const { colors } = useAppTheme();
  const prefs = usePreferences();
  const { biometricAvailable } = useAppLock();
  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [methods, setMethods] = useState<string[]>([]);

  async function loadSessions() {
    setLoading(true); setSessionError('');
    try { setSessions((await api.sessions()).data); } catch (error) { setSessionError(errorMessage(error)); } finally { setLoading(false); }
  }
  const loadMethods = () => api.authMethods().then(({ data }) => setMethods(data)).catch(() => {});
  useEffect(() => { loadSessions(); loadMethods(); }, []);

  async function savePin() {
    if (pin.length < 4 || pin !== confirmPin) return;
    await setPin(pin);
    await prefs.updatePreferences({ pinEnabled: true });
    setPinValue(''); setConfirmPin('');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function revoke(session: Session) {
    try { await api.revokeSession(session.id); await loadSessions(); } catch (error) { Alert.alert('Could not revoke device', errorMessage(error)); }
  }

  return <Screen>
    <Title subtitle="Control when Dhanam locks and which devices can access your account.">Security</Title>
    <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><KeyRound size={21} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Sign-in methods</Text></View>
      <Text style={{ color: colors.textMuted }}>Password {methods.includes('password') ? 'linked' : 'not configured'}</Text>
      {googleConfigured ? <GoogleLinkButton linked={methods.includes('google')} refresh={loadMethods} /> : <Text style={{ color: colors.textMuted }}>Google sign-in will appear after OAuth client IDs are configured.</Text>}
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><Fingerprint size={21} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Biometric lock</Text></View>
      <Text style={{ color: colors.textMuted, lineHeight: 21 }}>{biometricAvailable ? 'Use biometrics enrolled on this device.' : 'No enrolled biometric method is available on this device.'}</Text>
      <Button label={prefs.biometricEnabled ? 'Disable biometrics' : 'Enable biometrics'} disabled={!biometricAvailable} variant="secondary" onPress={() => prefs.updatePreferences({ biometricEnabled: !prefs.biometricEnabled })} />
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><KeyRound size={21} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>App PIN</Text></View>
      {!prefs.pinEnabled && <><Field label="New PIN" value={pin} onChangeText={setPinValue} keyboardType="number-pad" secureTextEntry maxLength={6} /><Field label="Confirm PIN" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={6} error={confirmPin && pin !== confirmPin ? 'PINs do not match.' : undefined} /><Button label="Enable PIN" disabled={pin.length < 4 || pin !== confirmPin} onPress={savePin} /></>}
      {prefs.pinEnabled && <Button label="Disable PIN" variant="danger" onPress={() => Alert.alert('Disable PIN?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Disable', style: 'destructive', onPress: async () => { await setPin(); await prefs.updatePreferences({ pinEnabled: false }); } }])} />}
    </Card>
    <Card>
      <Text style={{ color: colors.text, fontWeight: '900' }}>Lock timeout</Text>
      {([['immediately', 'Immediately'], ['1m', 'After 1 minute'], ['5m', 'After 5 minutes'], ['never', 'Never automatically']] as const).map(([value, label]) => <Button key={value} label={`${prefs.lockTimeout === value ? '✓ ' : ''}${label}`} variant={prefs.lockTimeout === value ? 'primary' : 'secondary'} onPress={() => prefs.updatePreferences({ lockTimeout: value })} />)}
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><MonitorSmartphone size={21} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Signed-in devices</Text></View>
      {loading && <StateView kind="loading" title="Loading devices…" />}
      {!!sessionError && <StateView kind="error" message={sessionError} onAction={loadSessions} />}
      {!loading && !sessionError && sessions.length === 0 && <StateView kind="empty" message="This server has no session records yet." />}
      {sessions.map((session) => <View key={session.id} style={{ gap: 5, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><ShieldCheck size={18} color={session.current ? colors.success : colors.textMuted} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '800' }}>{session.deviceName}{session.current ? ' · This device' : ''}</Text><Text style={{ color: colors.textMuted }}>{session.platform} · Last active {new Date(session.lastSeenAt).toLocaleString()}</Text></View></View>
        {!session.current && <Button label="Revoke device" variant="danger" icon={<Trash2 size={17} color={colors.danger} />} onPress={() => revoke(session)} />}
      </View>)}
    </Card>
  </Screen>;
}
