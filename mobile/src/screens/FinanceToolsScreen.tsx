import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Typography';
import { Edit3 } from 'lucide-react-native';
import { apiErrorMessage, Entity, mobileApi } from '../api';
import { useAuth } from '../AuthContext';
import { useData } from '../DataContext';
import { Busy, Button, Card, ErrorBox, Field, money, Page, PageTitle, Sheet } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

type Tool = 'CardBudgets' | 'OpeningBalances' | 'CategoryGoals';

export function FinanceToolsScreen({ route }: any) {
  const tool = route.name as Tool; const { user } = useAuth(); const { categories } = useData();
  const { colors: theme } = useTheme();
  const now = new Date(); const [records, setRecords] = useState<Entity[]>([]); const [goals, setGoals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [editing, setEditing] = useState<Entity | null>(null); const [value, setValue] = useState('');
  const title = tool === 'CardBudgets' ? 'Card budgets' : tool === 'OpeningBalances' ? 'Opening balances' : 'Category goals';
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tool === 'CardBudgets') setRecords(((await mobileApi.list<any>('/credit-cards/budgets', { month: now.getMonth() + 1, year: now.getFullYear() })).data.rows || []));
      else if (tool === 'OpeningBalances') setRecords((await mobileApi.list<Entity[]>('/balance', { month: now.getMonth() + 1, year: now.getFullYear() })).data);
      else setGoals((await mobileApi.list<Record<string, number>>('/category-goals')).data);
    } catch (next) { setError(apiErrorMessage(next)); } finally { setLoading(false); }
  }, [tool]);
  useEffect(() => { load(); }, [load]);
  function open(item: Entity) {
    setEditing(item);
    setValue(String(tool === 'CardBudgets' ? item.budgeted || 0 : tool === 'OpeningBalances' ? item.openingBalance || 0 : goals[item._id] || 0));
  }
  async function save() {
    if (!editing) return;
    try {
      if (tool === 'CardBudgets') await mobileApi.put(`/credit-cards/${editing._id}/budget`, { month: now.getMonth() + 1, year: now.getFullYear(), budgetAmount: Number(value) });
      else if (tool === 'OpeningBalances') await mobileApi.put(`/balance/${editing.memberId}`, { openingBalance: Number(value), notes: editing.notes || '' });
      else await mobileApi.put(`/category-goals/${editing._id}`, { goal: Number(value) });
      setEditing(null); await load();
    } catch (next) { setError(apiErrorMessage(next)); }
  }
  const rows = tool === 'CategoryGoals' ? categories : records;
  return <Page onRefresh={load}><PageTitle title={title} subtitle={`Manage ${title.toLowerCase()} for your household`} /><ErrorBox message={error} />{loading ? <Busy /> : rows.map((item: any) => {
    const amount = tool === 'CardBudgets' ? item.budgeted : tool === 'OpeningBalances' ? item.openingBalance : goals[item._id];
    return <Card key={item._id || item.memberId}><View style={styles.row}><View style={[styles.dot, { backgroundColor: item.color || item.memberColor || theme.primary }]} /><View style={{ flex: 1 }}><Text style={[styles.name, { color: theme.text }]}>{item.name || item.memberName || item.bankName}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{tool === 'CardBudgets' ? `${item.spent || 0} spent · ${item.balance || 0} left` : tool === 'CategoryGoals' ? 'Monthly spending target' : 'Current account baseline'}</Text></View><Text style={[styles.amount, { color: theme.text }]}>{money(amount || 0, user?.currency)}</Text><Pressable onPress={() => open(item)} style={styles.edit}><Edit3 size={16} color={theme.primary} /></Pressable></View></Card>;
  })}
  <Sheet visible={!!editing} title={`Edit ${title.toLowerCase()}`} onClose={() => setEditing(null)}><ErrorBox message={error} /><Field label="Amount" value={value} onChangeText={setValue} keyboardType="decimal-pad" /><Button label="Save" onPress={save} /></Sheet>
  </Page>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' }, dot: { width: 9, height: 9, borderRadius: 5, marginRight: 9 },
  name: { ...typography, color: colors.text, fontSize: 13, fontWeight: '800' }, meta: { ...typography, color: colors.textMuted, fontSize: 10, marginTop: 3 },
  amount: { ...typography, color: colors.text, fontSize: 12, fontWeight: '800', marginLeft: 8 }, edit: { padding: 9, marginRight: -7 },
});
