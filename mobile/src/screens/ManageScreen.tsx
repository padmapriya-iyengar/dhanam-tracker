import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Edit3, Plus, Trash2 } from 'lucide-react-native';
import { apiErrorMessage, Entity, mobileApi } from '../api';
import { useAuth } from '../AuthContext';
import { useData } from '../DataContext';
import { Busy, Button, Card, Choice, Empty, ErrorBox, Field, Page, PageTitle, Sheet } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

type Resource = 'members' | 'users' | 'savings' | 'credit-cards';
type ResourceConfig = { title: string; subtitle: string; singular: string; path: string };
const config: Record<Resource, ResourceConfig> = {
  members: { title: 'Members', subtitle: 'People included in household finances', singular: 'member', path: '/members' },
  users: { title: 'Users', subtitle: 'Accounts allowed to sign in', singular: 'user', path: '/users' },
  savings: { title: 'Savings', subtitle: 'Savings, deposits and investment accounts', singular: 'account', path: '/savings' },
  'credit-cards': { title: 'Credit cards', subtitle: 'Cards, statement cycles and owners', singular: 'card', path: '/credit-cards' },
};

function id(value: any) { return value?._id || value || ''; }

export function ManageScreen({ route }: any) {
  const routeResources: Record<string, Resource> = {
    Members: 'members',
    Users: 'users',
    Savings: 'savings',
    CreditCards: 'credit-cards',
  };
  const resource = routeResources[route.name] || route.name as Resource;
  const current: ResourceConfig = config[resource];
  const { user } = useAuth();
  const { colors: theme } = useTheme();
  const { members, refresh: refreshData } = useData();
  const [records, setRecords] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true); setError('');
    try { const response = await mobileApi.list<Entity[]>(current.path); setRecords(response.data); }
    catch (next) { setError(apiErrorMessage(next)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [current.path]);
  useEffect(() => { load(); }, [load]);

  function open(item?: Entity) {
    setEditing(item || null);
    if (resource === 'members') setForm({ name: item?.name || '', role: item?.role || 'other', color: item?.color || '#6366f1' });
    if (resource === 'users') setForm({ name: item?.name || '', email: item?.email || '', password: '', currency: item?.currency || 'AED', color: item?.color || '#6366f1' });
    if (resource === 'savings') setForm({ name: item?.name || '', bankName: item?.bankName || '', lastFourDigits: item?.lastFourDigits || '', accountType: item?.accountType || 'savings', openingBalance: String(item?.openingBalance ?? 0), memberId: id(item?.memberId), color: item?.color || '#6366f1', notes: item?.notes || '' });
    if (resource === 'credit-cards') setForm({ name: item?.name || '', bankName: item?.bankName || '', memberId: id(item?.memberId), lastFourDigits: item?.lastFourDigits || '', cycleStartDay: String(item?.cycleStartDay || 1), cycleEndDay: String(item?.cycleEndDay || 30), statementDay: String(item?.statementDay || 14), paymentDueDay: String(item?.paymentDueDay || 5), color: item?.color || '#6366f1' });
    setError(''); setSheet(true);
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      ['openingBalance', 'cycleStartDay', 'cycleEndDay', 'statementDay', 'paymentDueDay'].forEach(key => {
        if (payload[key] !== undefined) payload[key] = Number(payload[key]);
      });
      if (!payload.password) delete payload.password;
      if (editing) await mobileApi.update(current.path, editing._id, payload);
      else await mobileApi.create(current.path, payload);
      setSheet(false); await Promise.all([load(), refreshData()]);
    } catch (next) { setError(apiErrorMessage(next)); }
    finally { setSaving(false); }
  }

  function remove(item: Entity) {
    Alert.alert(`Deactivate ${current.singular}?`, 'Existing financial records will be preserved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        try { await mobileApi.remove(current.path, item._id); await Promise.all([load(), refreshData()]); }
        catch (next) { setError(apiErrorMessage(next)); }
      } },
    ]);
  }

  if (resource === 'users' && user?.isDemo) return <Page><PageTitle title="Users" /><ErrorBox message="User management is unavailable in demo mode." /></Page>;
  const memberOptions = members.map(member => ({ value: member._id, label: member.name, color: member.color }));
  return <Page refreshing={refreshing} onRefresh={() => load(true)}>
    <PageTitle title={current.title} subtitle={current.subtitle} action={<Pressable onPress={() => open()} style={styles.add}><Plus size={19} color="#fff" /></Pressable>} />
    <ErrorBox message={error} />
    {loading ? <Busy /> : records.length === 0 ? <Empty text={`No ${current.title.toLowerCase()} yet.`} /> : records.map(item => <Card key={item._id}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: item.color || colors.primary }]}><Text style={styles.avatarText}>{String(item.name || item.bankName || '?')[0]}</Text></View>
        <View style={{ flex: 1 }}><Text style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{resource === 'users' ? item.email : resource === 'members' ? item.role : `${item.bankName || ''}${item.memberId?.name ? ` · ${item.memberId.name}` : ''}`}</Text></View>
        <Pressable onPress={() => open(item)} style={styles.action}><Edit3 size={16} color={colors.primary} /></Pressable>
        <Pressable onPress={() => remove(item)} style={styles.action}><Trash2 size={16} color={colors.negative} /></Pressable>
      </View>
    </Card>)}

    <Sheet visible={sheet} title={`${editing ? 'Edit' : 'Add'} ${current.singular}`} onClose={() => setSheet(false)}>
      <ErrorBox message={error} />
      <Field label="Name" value={form.name} onChangeText={(v: string) => setForm(x => ({ ...x, name: v }))} />
      {resource === 'members' ? <Choice label="Role" value={form.role} options={[{ value: 'self', label: 'Self' }, { value: 'husband', label: 'Spouse' }, { value: 'other', label: 'Other' }]} onChange={v => setForm(x => ({ ...x, role: v }))} /> : null}
      {resource === 'users' ? <>
        <Field label="Email" value={form.email} onChangeText={(v: string) => setForm(x => ({ ...x, email: v }))} keyboardType="email-address" />
        <Field label={editing ? 'New password (optional)' : 'Password'} value={form.password} onChangeText={(v: string) => setForm(x => ({ ...x, password: v }))} secureTextEntry />
        <Choice label="Currency" value={form.currency} options={[{ value: 'AED', label: 'AED' }, { value: 'INR', label: 'INR' }]} onChange={v => setForm(x => ({ ...x, currency: v }))} />
      </> : null}
      {resource === 'savings' ? <>
        <Field label="Bank name" value={form.bankName} onChangeText={(v: string) => setForm(x => ({ ...x, bankName: v }))} />
        <Field label="Account last four digits" value={form.lastFourDigits} onChangeText={(v: string) => setForm(x => ({ ...x, lastFourDigits: v.replace(/\D/g, '').slice(0, 4) }))} keyboardType="number-pad" />
        <Choice label="Type" value={form.accountType} options={['savings', 'current', 'fixed_deposit', 'investment', 'other'].map(value => ({ value, label: value.replaceAll('_', ' ') }))} onChange={v => setForm(x => ({ ...x, accountType: v }))} />
        <Choice label="Owner" value={form.memberId} options={memberOptions} onChange={v => setForm(x => ({ ...x, memberId: v }))} />
        <Field label="Opening balance" value={form.openingBalance} onChangeText={(v: string) => setForm(x => ({ ...x, openingBalance: v }))} keyboardType="decimal-pad" />
        <Field label="Notes" value={form.notes} onChangeText={(v: string) => setForm(x => ({ ...x, notes: v }))} multiline />
      </> : null}
      {resource === 'credit-cards' ? <>
        <Field label="Bank name" value={form.bankName} onChangeText={(v: string) => setForm(x => ({ ...x, bankName: v }))} />
        <Choice label="Owner" value={form.memberId} options={memberOptions} onChange={v => setForm(x => ({ ...x, memberId: v }))} />
        <Field label="Last four digits" value={form.lastFourDigits} onChangeText={(v: string) => setForm(x => ({ ...x, lastFourDigits: v }))} keyboardType="number-pad" />
        <Field label="Cycle start day" value={form.cycleStartDay} onChangeText={(v: string) => setForm(x => ({ ...x, cycleStartDay: v }))} keyboardType="number-pad" />
        <Field label="Cycle end day" value={form.cycleEndDay} onChangeText={(v: string) => setForm(x => ({ ...x, cycleEndDay: v }))} keyboardType="number-pad" />
        <Field label="Statement day" value={form.statementDay} onChangeText={(v: string) => setForm(x => ({ ...x, statementDay: v }))} keyboardType="number-pad" />
        <Field label="Payment due day" value={form.paymentDueDay} onChangeText={(v: string) => setForm(x => ({ ...x, paymentDueDay: v }))} keyboardType="number-pad" />
      </> : null}
      <Field label="Color" value={form.color} onChangeText={(v: string) => setForm(x => ({ ...x, color: v }))} placeholder="#6366f1" />
      <Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
    </Sheet>
  </Page>;
}

const styles = StyleSheet.create({
  add: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { ...typography, color: '#fff', fontSize: 15, fontWeight: '800' },
  name: { ...typography, color: colors.text, fontSize: 12.5, fontWeight: '800' },
  meta: { ...typography, color: colors.textMuted, fontSize: 10, marginTop: 3, textTransform: 'capitalize' },
  action: { padding: 9 },
});
