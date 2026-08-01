import { Alert, Linking, Switch, View } from 'react-native';
import { useState } from 'react';
import { Text } from '../components/Typography';
import { Bell, ChevronRight, CreditCard, Landmark, LogOut, Palette, Shield, SlidersHorizontal, UserRound, UsersRound } from 'lucide-react-native';
import { Button, Card, Field, Screen, Title } from '../components/ui';
import { api, errorMessage } from '../api';
import { useAuth } from '../state/AuthContext';
import { usePreferences } from '../state/PreferencesContext';
import { useAppTheme } from '../theme';

function SettingRow({ label, description, value, onValueChange }: { label: string; description: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.text, fontWeight: '800' }}>{label}</Text><Text style={{ color: colors.textMuted, lineHeight: 19 }}>{description}</Text></View>
    <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.textMuted} />
  </View>;
}

export function ProfileScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const { user, logout } = useAuth();
  const prefs = usePreferences();
  const [deletionConfirmation, setDeletionConfirmation] = useState('');
  return <Screen>
    <Title subtitle="Identity, appearance, privacy, and device security.">Profile</Title>
    <Card>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: user?.color || colors.primary, alignItems: 'center', justifyContent: 'center' }}><UserRound color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{user?.name}</Text><Text style={{ color: colors.textMuted }}>{user?.email}</Text><Text style={{ color: colors.textMuted }}>{user?.currency} · {user?.isDemo ? 'Demo data' : 'Private data'}</Text></View>
      </View>
    </Card>
    <Card>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Money configuration</Text>
      <Button label="Accounts & balances" variant="secondary" align="left" onPress={() => navigation.navigate('Accounts')} icon={<Landmark size={18} color={colors.text} />} />
      <Button label="Credit cards" variant="secondary" align="left" onPress={() => navigation.navigate('Cards')} icon={<CreditCard size={18} color={colors.text} />} />
      <Button label="Household & categories" variant="secondary" align="left" onPress={() => navigation.navigate('Household')} icon={<UsersRound size={18} color={colors.text} />} />
      <Button label="All preferences & diagnostics" variant="secondary" align="left" onPress={() => navigation.navigate('Preferences')} icon={<SlidersHorizontal size={18} color={colors.text} />} />
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><Palette size={20} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Appearance</Text></View>
      {(['light', 'dark', 'system'] as const).map((mode) => <Button key={mode} label={`${prefs.themeMode === mode ? '✓ ' : ''}${mode === 'system' ? 'Use device setting' : `${mode[0]?.toUpperCase()}${mode.slice(1)}`}`} variant={prefs.themeMode === mode ? 'primary' : 'secondary'} onPress={() => prefs.updatePreferences({ themeMode: mode })} />)}
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><Shield size={20} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Privacy</Text></View>
      <SettingRow label="Hide monetary values" description="Masks amounts throughout Dhanam." value={prefs.privacyMode} onValueChange={(privacyMode) => prefs.updatePreferences({ privacyMode })} />
      <SettingRow label="Block screenshots" description="Protect sensitive screens and app-switcher previews where supported." value={prefs.screenshotBlocking} onValueChange={(screenshotBlocking) => prefs.updatePreferences({ screenshotBlocking })} />
      <Button label="App lock and devices" variant="secondary" onPress={() => navigation.navigate('Security')} icon={<ChevronRight size={18} color={colors.text} />} />
      <Button label="Privacy policy" variant="secondary" align="left" onPress={() => Linking.openURL('https://joshikiran.com/dhanam-tracker/privacy/')} />
      <Button label="Account deletion help" variant="secondary" align="left" onPress={() => Linking.openURL('https://joshikiran.com/dhanam-tracker/delete-account/')} />
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><Bell size={20} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Notifications</Text></View>
      <Text style={{ color: colors.textMuted }}>In-app alerts, quiet hours, due-date intervals, and privacy controls.</Text>
      <Button label="Notification inbox" variant="secondary" onPress={() => navigation.navigate('Notifications')} />
      <Button label="Notification controls" variant="secondary" onPress={() => navigation.navigate('NotificationSettings')} />
    </Card>
    {!user?.isDemo && <Card>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Delete account</Text>
      <Text style={{ color: colors.textMuted }}>Permanently deletes your account and associated financial records. This cannot be undone.</Text>
      <Field label={user?.hasPassword ? 'Current password' : 'Type your email to confirm'} value={deletionConfirmation} onChangeText={setDeletionConfirmation} secureTextEntry={Boolean(user?.hasPassword)} autoCapitalize="none" />
      <Button label="Permanently delete account" variant="danger" disabled={!deletionConfirmation} onPress={() => Alert.alert('Delete account permanently?', 'All financial data associated with this account will be deleted. This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: async () => {
          try {
            await api.deleteAccount(user?.hasPassword ? { password: deletionConfirmation } : { confirmEmail: deletionConfirmation });
            await logout();
          } catch (cause) {
            Alert.alert('Account not deleted', errorMessage(cause));
          }
        } },
      ])} />
    </Card>}
    <Button label="Sign out" variant="danger" icon={<LogOut size={18} color={colors.danger} />} onPress={() => Alert.alert('Sign out?', 'Cached financial data will be cleared from this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: logout }])} />
  </Screen>;
}
