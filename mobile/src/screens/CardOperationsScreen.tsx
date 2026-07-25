import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage, Entity, mobileApi } from '../api';
import { useAuth } from '../AuthContext';
import { useData } from '../DataContext';
import { Busy, Button, Card, Choice, Empty, ErrorBox, Field, money, Page, PageTitle, today } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

export function CardOperationsScreen() {
  const { user } = useAuth(); const { cards } = useData(); const [cardId, setCardId] = useState(''); const [cycles, setCycles] = useState<Entity[]>([]);
  const { colors: theme } = useTheme();
  const [reconciliation, setReconciliation] = useState<any>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [statement, setStatement] = useState({ cycleStart: today(), cycleEnd: today(), openingBalance: '0', fees: '0', interest: '0', refunds: '0', statementAmount: '0', notes: '' });
  const load = useCallback(async () => {
    if (!cardId) return; setLoading(true); setError('');
    try { const [c, r] = await Promise.all([mobileApi.list<Entity[]>('/credit-cards/cycles', { creditCardId: cardId }), mobileApi.list('/credit-cards/reconciliation', { creditCardId: cardId })]); setCycles(c.data); setReconciliation(r.data); }
    catch (next) { setError(apiErrorMessage(next)); } finally { setLoading(false); }
  }, [cardId]);
  useEffect(() => { load(); }, [load]);
  async function saveStatement() {
    try { await mobileApi.put('/credit-cards/statements', { creditCardId: cardId, ...statement, openingBalance: Number(statement.openingBalance), fees: Number(statement.fees), interest: Number(statement.interest), refunds: Number(statement.refunds), statementAmount: Number(statement.statementAmount) }); await load(); }
    catch (next) { setError(apiErrorMessage(next)); }
  }
  return <Page onRefresh={load}><PageTitle title="Card reconciliation" subtitle="Cycles, statements, purchases and payments" /><Choice label="Credit card" value={cardId} options={cards.map(x => ({ value: x._id, label: `${x.bankName} · ${x.name}`, color: x.color }))} onChange={setCardId} /><ErrorBox message={error} />
    {!cardId ? <Empty text="Select a card to inspect its statement activity." /> : loading ? <Busy /> : <>
      {reconciliation ? <Card><Text style={[styles.heading, { color: theme.text }]}>Reconciliation</Text>{Object.entries(reconciliation.summary || reconciliation).filter(([, value]) => typeof value === 'number').slice(0, 8).map(([key, value]) => <View key={key} style={styles.row}><Text style={[styles.label, { color: theme.textMuted }]}>{key.replaceAll('_', ' ')}</Text><Text style={[styles.value, { color: theme.text }]}>{money(value as number, user?.currency)}</Text></View>)}</Card> : null}
      <Card><Text style={[styles.heading, { color: theme.text }]}>Statement details</Text><Field label="Cycle start" value={statement.cycleStart} onChangeText={(cycleStart: string) => setStatement(x => ({ ...x, cycleStart }))} /><Field label="Cycle end" value={statement.cycleEnd} onChangeText={(cycleEnd: string) => setStatement(x => ({ ...x, cycleEnd }))} />{['openingBalance', 'fees', 'interest', 'refunds', 'statementAmount'].map(key => <Field key={key} label={key.replace(/([A-Z])/g, ' $1')} value={(statement as any)[key]} onChangeText={(value: string) => setStatement(x => ({ ...x, [key]: value }))} keyboardType="decimal-pad" />)}<Field label="Notes" value={statement.notes} onChangeText={(notes: string) => setStatement(x => ({ ...x, notes }))} /><Button label="Save statement" onPress={saveStatement} /></Card>
      <Card><Text style={[styles.heading, { color: theme.text }]}>Statement cycles</Text>{!cycles.length ? <Empty text="No cycles available." /> : cycles.map((cycle, index) => <View key={cycle._id || index} style={[styles.cycle, { borderTopColor: theme.divider }]}><Text style={[styles.label, { color: theme.textMuted }]}>{cycle.label || `${new Date(cycle.cycleStart).toLocaleDateString()} – ${new Date(cycle.cycleEnd).toLocaleDateString()}`}</Text><Text style={[styles.value, { color: theme.text }]}>{money(cycle.outstanding || cycle.purchases || cycle.statementAmount || 0, user?.currency)}</Text></View>)}</Card>
    </>}</Page>;
}
const styles = StyleSheet.create({
  heading: { ...typography, color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 10 }, row: { flexDirection: 'row', minHeight: 37, alignItems: 'center' },
  label: { ...typography, flex: 1, color: colors.textMuted, fontSize: 11, textTransform: 'capitalize' }, value: { ...typography, color: colors.text, fontSize: 12, fontWeight: '800' },
  cycle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F3F6' },
});
