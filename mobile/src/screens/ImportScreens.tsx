import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { Text } from '../components/Typography';
import { Camera, CheckCircle2, Inbox, MessageSquareText, Share2, Trash2, TriangleAlert } from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Button, Card, Field, Screen, StateView, Title } from '../components/ui';
import {
  dismissImportInbox, ImportInboxItem, loadImportInbox, saveImportInboxItem, updateImportInboxItem,
} from '../storage';
import { radius, useAppTheme } from '../theme';

const id = () => `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function draftPreset(draft: any) {
  return {
    amount: draft.amount,
    date: draft.transactionDate,
    description: draft.description,
    source: draft.merchant || draft.description,
    memberId: draft.memberId,
    categoryId: draft.categoryId,
    subCategoryId: draft.subCategoryId,
    paymentMethod: draft.accountType === 'credit_card' ? 'credit_card' : draft.accountType === 'savings' ? 'savings' : 'current_account',
    creditCardId: draft.accountType === 'credit_card' ? draft.accountId : '',
    savingsAccountId: draft.accountType === 'savings' ? draft.accountId : '',
    imported: true,
  };
}

export function MessageImportScreen({ navigation, route }: any) {
  const { colors } = useAppTheme();
  const sharedText = route.params?.text || '';
  const [message, setMessage] = useState(sharedText);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (sharedText) setMessage(sharedText); }, [sharedText]);

  async function analyze() {
    const inboxId = id();
    setBusy(true);
    try {
      const { data } = await api.importMessage(message);
      const status = data.duplicates?.length ? 'duplicate_suspected' : data.draft.classification === 'unknown' ? 'unsupported' : 'needs_review';
      const item: ImportInboxItem = {
        id: inboxId, createdAt: Date.now(), updatedAt: Date.now(), status,
        source: sharedText ? 'share' : 'paste', message, draft: data.draft, duplicates: data.duplicates,
      };
      await saveImportInboxItem(item);
      navigation.replace('ImportReview', { item, options: data.options });
    } catch (cause) {
      const error = errorMessage(cause);
      await saveImportInboxItem({ id: inboxId, createdAt: Date.now(), updatedAt: Date.now(), status: 'failed', source: sharedText ? 'share' : 'paste', message, error });
      Alert.alert('Could not analyze message', error);
    } finally { setBusy(false); }
  }

  return <Screen>
    <Title subtitle="Dhanam analyzes only what you submit. The original text is removed after a successful save.">Import bank message</Title>
    <Card>
      <View style={{ flexDirection: 'row', gap: 12 }}><MessageSquareText color={colors.primary} /><Text style={{ color: colors.text, flex: 1 }}>Paste an SMS or bank notification, or share text using a Dhanam deep link.</Text></View>
      <Button label="Open import inbox" variant="secondary" onPress={() => navigation.navigate('ImportInbox')} icon={<Inbox size={17} color={colors.text} />} />
    </Card>
    <Field label="Bank message" value={message} onChangeText={setMessage} multiline numberOfLines={9} placeholder="Paste the complete notification here…" />
    <Button label={busy ? 'Analyzing…' : 'Analyze securely'} disabled={busy || message.trim().length < 8} onPress={analyze} />
    <Button label="Import notification screenshot" variant="secondary" onPress={() => Alert.alert('OCR is not available in this build', 'Screenshot OCR will require an explicit image picker and on-device OCR dependency. No image has been accessed.')} icon={<Camera size={17} color={colors.text} />} />
    <Text style={{ color: colors.textMuted, lineHeight: 21 }}>Automatic notification access is intentionally disabled. A future Android listener will require explicit opt-in and granular controls.</Text>
  </Screen>;
}

export function ImportReviewScreen({ navigation, route }: any) {
  const { colors } = useAppTheme();
  const item: ImportInboxItem = route.params.item;
  const options = route.params.options || {};
  const [draft, setDraft] = useState<any>(item.draft || {});
  const uncertain = Number(draft.confidence || 0) < .75;
  const categories = options.categories || [];
  const selectedCategory = categories.find((entry: any) => entry.id === draft.categoryId);
  const set = (key: string, value: any) => setDraft((current: any) => ({ ...current, [key]: value }));

  async function continueToRecord() {
    if (!['expense', 'income', 'transfer', 'refund'].includes(draft.classification)) {
      return Alert.alert('Choose a record type', 'This message cannot be saved until its transaction type is confirmed.');
    }
    if (item.duplicates?.length) {
      const proceed = () => openForm();
      return Alert.alert('Possible duplicate', `${item.duplicates.length} similar record${item.duplicates.length === 1 ? '' : 's'} found.`, [
        { text: 'Cancel', style: 'cancel' }, { text: 'Continue review', onPress: proceed },
      ]);
    }
    openForm();
  }
  async function openForm() {
    await updateImportInboxItem(item.id, { draft, status: 'needs_review' });
    if (draft.classification === 'expense' || draft.classification === 'refund') {
      if (draft.categoryId) api.messageFeedback({ merchant: draft.merchant, description: draft.description, categoryId: draft.categoryId, subCategoryId: draft.subCategoryId }).catch(() => {});
      navigation.navigate('ExpenseForm', { preset: draftPreset(draft), importInboxId: item.id });
    } else if (draft.classification === 'income') {
      navigation.navigate('IncomeForm', { preset: draftPreset(draft), importInboxId: item.id });
    } else {
      navigation.navigate('TransferForm', { preset: { ...draftPreset(draft), amount: draft.amount, description: draft.description }, importInboxId: item.id });
    }
  }

  return <Screen>
    <Title subtitle="Confirm every field before anything is saved.">Review analysis</Title>
    {(uncertain || draft.warnings?.length > 0) && <Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><TriangleAlert color={colors.warning} /><Text style={{ color: colors.text, fontWeight: '900', flex: 1 }}>Some fields need confirmation</Text></View>
      {(draft.warnings || []).map((warning: string) => <Text key={warning} style={{ color: colors.warning }}>• {warning}</Text>)}
    </Card>}
    <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Record type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['expense', 'income', 'transfer', 'reminder', 'unknown'].map((type) => <Button key={type} label={label(type)} variant={draft.classification === type ? 'primary' : 'secondary'} onPress={() => set('classification', type)} />)}</View>
    </Card>
    <Field label="Amount" value={draft.amount == null ? '' : String(draft.amount)} onChangeText={(value) => set('amount', Number(value.replace(/[^0-9.]/g, '')) || null)} keyboardType="decimal-pad" />
    <Field label="Currency" value={draft.currency || ''} onChangeText={(value) => set('currency', value.toUpperCase().slice(0, 3))} />
    <Field label="Date" value={draft.transactionDate || ''} onChangeText={(value) => set('transactionDate', value)} placeholder="YYYY-MM-DD" />
    <Field label="Merchant or source" value={draft.merchant || ''} onChangeText={(value) => set('merchant', value)} />
    <Field label="Description" value={draft.description || ''} onChangeText={(value) => set('description', value)} />
    {!!options.members?.length && <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Member</Text>{options.members.map((entry: any) => <Button key={entry.id} label={entry.name} variant={draft.memberId === entry.id ? 'primary' : 'secondary'} onPress={() => set('memberId', entry.id)} />)}</Card>}
    {!!options.accounts?.length && <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Account or card</Text>{options.accounts.map((entry: any) => <Button key={`${entry.type}:${entry.id}`} label={entry.name} variant={draft.accountId === entry.id ? 'primary' : 'secondary'} onPress={() => setDraft((current: any) => ({ ...current, accountId: entry.id, accountType: entry.type, memberId: entry.memberId || current.memberId }))} />)}</Card>}
    {draft.classification === 'expense' && <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Category</Text>{categories.map((entry: any) => <Button key={entry.id} label={entry.name} variant={draft.categoryId === entry.id ? 'primary' : 'secondary'} onPress={() => setDraft((current: any) => ({ ...current, categoryId: entry.id, subCategoryId: null }))} />)}</Card>}
    {!!selectedCategory?.subcategories?.length && <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Subcategory</Text>{selectedCategory.subcategories.map((entry: any) => <Button key={entry.id} label={entry.name} variant={draft.subCategoryId === entry.id ? 'primary' : 'secondary'} onPress={() => set('subCategoryId', entry.id)} />)}</Card>}
    {!!item.duplicates?.length && <Card><Text style={{ color: colors.danger, fontWeight: '900' }}>Duplicate suspected</Text>{item.duplicates.map((entry: any) => <Text key={entry.id} style={{ color: colors.text }}>{entry.description || entry.type} · {entry.amount} · {new Date(entry.date).toLocaleDateString()}</Text>)}</Card>}
    <Button label="Continue to final record" onPress={continueToRecord} icon={<CheckCircle2 size={18} />} />
  </Screen>;
}

export function ImportInboxScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const [items, setItems] = useState<ImportInboxItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const load = useCallback(() => { loadImportInbox().then(setItems); }, []);
  useEffect(load, []);
  async function dismissSelected() { await dismissImportInbox(selected); setSelected([]); load(); }
  return <Screen>
    <Title subtitle="Original text stays on this device and is cleared when saved or dismissed.">Import inbox</Title>
    {!!selected.length && <Button label={`Dismiss ${selected.length} selected`} variant="danger" onPress={dismissSelected} icon={<Trash2 size={17} color={colors.danger} />} />}
    {items.length === 0 && <StateView kind="empty" message="No pending or previous imports." />}
    {items.map((item) => <Pressable key={item.id} onLongPress={() => setSelected((value) => value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id])} onPress={() => item.draft && navigation.navigate('ImportReview', { item })} style={{ borderRadius: radius.lg }}>
      <Card><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{item.draft?.description || item.error || 'Bank message'}</Text><Text style={{ color: colors.textMuted }}>{label(item.status)} · {new Date(item.createdAt).toLocaleString()}</Text></View>{selected.includes(item.id) ? <CheckCircle2 color={colors.primary} /> : <Share2 color={colors.textMuted} />}</View></Card>
    </Pressable>)}
    <Button label="Clear learned merchant mappings" variant="secondary" onPress={() => Alert.alert('Clear learned mappings?', 'Future imports will no longer use your confirmed merchant categories.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: async () => { try { await api.clearMessageLearnings(); Alert.alert('Mappings cleared'); } catch (cause) { Alert.alert('Could not clear mappings', errorMessage(cause)); } } }])} />
  </Screen>;
}
