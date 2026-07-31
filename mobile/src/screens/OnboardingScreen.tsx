import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Typography';
import * as Haptics from 'expo-haptics';
import { BellRing, CreditCard, Landmark, MessageSquareText, ShieldCheck, Sparkles, Users } from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Button, Card, Field, Screen, Title } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { useAppTheme } from '../theme';

const steps = ['Welcome', 'Preferences', 'Household', 'Account', 'Card', 'Alerts', 'First step'];
const currencies = ['AED', 'INR'] as const;
const locales = [{ value: 'en-AE', label: 'English · UAE' }, { value: 'en-IN', label: 'English · India' }];

export function OnboardingScreen() {
  const { colors } = useAppTheme();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState<'AED' | 'INR'>(user?.currency || 'AED');
  const [locale, setLocale] = useState(user?.locale || 'en-AE');
  const [memberName, setMemberName] = useState(user?.name || '');
  const [memberId, setMemberId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [alerts, setAlerts] = useState({ enabled: true, recurring: true, cardDue: true, budgets: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function next() {
    setError(''); setBusy(true);
    try {
      if (step === 1) await updateUser({ currency, locale });
      if (step === 2 && memberName.trim() && !memberId) {
        const existing = (await api.members()).data;
        if (existing[0]) setMemberId(existing[0]._id);
        else {
          const { data } = await api.createMember({ name: memberName.trim(), role: 'self', color: '#0F8B7F' });
          setMemberId(data._id);
        }
      }
      if (step === 3 && accountName.trim() && memberId) await api.createAccount({
        name: accountName.trim(), bankName: bankName.trim(), accountType: 'current',
        openingBalance: Number(openingBalance) || 0, memberId, color: '#0F8B7F',
      });
      if (step === 4 && cardName.trim() && memberId) await api.createCard({
        name: cardName.trim(), bankName: cardBank.trim() || 'Bank', memberId,
        statementDay: 14, paymentDueDay: 5, color: '#F59E0B', isActive: true,
      });
      if (step === 5) await updateUser({ notificationPreferences: alerts });
      if (step === steps.length - 1) {
        await updateUser({ onboardingCompleted: true });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      setStep((value) => value + 1);
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }

  const Choice = ({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) =>
    <Button label={`${selected ? '✓ ' : ''}${label}`} variant={selected ? 'primary' : 'secondary'} onPress={onPress} />;

  return <Screen>
    <View style={{ gap: 8 }}>
      <Text accessibilityLabel={`Onboarding step ${step + 1} of ${steps.length}`} style={{ color: colors.primary, fontWeight: '800' }}>STEP {step + 1} OF {steps.length}</Text>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border }}><View style={{ width: `${((step + 1) / steps.length) * 100}%`, height: 5, borderRadius: 3, backgroundColor: colors.primary }} /></View>
    </View>
    {step === 0 && <><Sparkles size={42} color={colors.accent} /><Title subtitle="Capture money quickly, plan with confidence, and receive only the alerts that matter.">Money clarity without the noise</Title><Card><Text style={{ color: colors.textMuted, lineHeight: 23 }}>We’ll set up your preferences, first household member, and optional accounts. You can skip optional steps and finish them later.</Text></Card></>}
    {step === 1 && <><Title subtitle="These control how amounts and dates appear.">Your region</Title><Text style={{ color: colors.text, fontWeight: '800' }}>Base currency</Text>{currencies.map((item) => <Choice key={item} selected={currency === item} label={item} onPress={() => setCurrency(item)} />)}<Text style={{ color: colors.text, fontWeight: '800' }}>Locale</Text>{locales.map((item) => <Choice key={item.value} selected={locale === item.value} label={item.label} onPress={() => setLocale(item.value)} />)}</>}
    {step === 2 && <><Users size={38} color={colors.primary} /><Title subtitle="Transactions and accounts can be organized by household member.">Create your profile</Title><Field label="Member name" value={memberName} onChangeText={setMemberName} placeholder="Your name" /></>}
    {step === 3 && <><Landmark size={38} color={colors.primary} /><Title subtitle="Add a current or savings account now, or do it later from Profile.">Your first account</Title><Field label="Account name" value={accountName} onChangeText={setAccountName} placeholder="Everyday account" /><Field label="Bank name" value={bankName} onChangeText={setBankName} placeholder="Optional" /><Field label="Opening balance" value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad" /></>}
    {step === 4 && <><CreditCard size={38} color={colors.accent} /><Title subtitle="Optional. Card cycle details can be refined later.">Add a credit card</Title><Field label="Card name" value={cardName} onChangeText={setCardName} placeholder="Cashback card" /><Field label="Bank name" value={cardBank} onChangeText={setCardBank} placeholder="Bank" /></>}
    {step === 5 && <><BellRing size={38} color={colors.primary} /><Title subtitle="Choose what Dhanam may remind you about. Device permission will be requested only when notifications are implemented.">Notification preferences</Title>{(['recurring', 'cardDue', 'budgets'] as const).map((key) => <Choice key={key} selected={alerts[key]} label={key === 'recurring' ? 'Recurring payments' : key === 'cardDue' ? 'Card due dates' : 'Budget thresholds'} onPress={() => setAlerts((value) => ({ ...value, [key]: !value[key] }))} />)}</>}
    {step === 6 && <><ShieldCheck size={38} color={colors.success} /><Title subtitle="Your setup is ready. Choose how you’d like to record the first transaction later.">Ready for clearer finances</Title><Card><View style={{ flexDirection: 'row', gap: 12 }}><MessageSquareText size={22} color={colors.primary} /><Text style={{ color: colors.text, flex: 1 }}>Import a bank message from the Add flow.</Text></View></Card><Card><View style={{ flexDirection: 'row', gap: 12 }}><Landmark size={22} color={colors.primary} /><Text style={{ color: colors.text, flex: 1 }}>Enter an expense, income, or transfer manually.</Text></View></Card></>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <View style={{ marginTop: 'auto', gap: 10 }}>
      <Button label={busy ? 'Saving…' : step === steps.length - 1 ? 'Finish setup' : 'Continue'} disabled={busy || (step === 2 && !memberName.trim())} onPress={next} />
      {step > 0 && step < steps.length - 1 && <Button label="Skip for now" variant="secondary" disabled={busy || step === 1 || step === 2} onPress={() => setStep((value) => value + 1)} />}
    </View>
  </Screen>;
}
