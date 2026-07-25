import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Edit3, Plus, Trash2 } from 'lucide-react-native';
import { apiErrorMessage, Category, mobileApi, SubCategory } from '../api';
import { useData } from '../DataContext';
import { Button, Card, Empty, ErrorBox, Field, Page, PageTitle, Sheet } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

export function CategoriesScreen() {
  const { categories, refresh } = useData();
  const { colors: theme } = useTheme();
  const [sheet, setSheet] = useState(false);
  const [parent, setParent] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | SubCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', icon: 'tag' });
  const [error, setError] = useState('');

  function open(item?: Category | SubCategory, category?: Category) {
    setEditing(item || null); setParent(category || null);
    setForm({ name: item?.name || '', description: item?.description || '', color: (item as Category)?.color || '#6366f1', icon: (item as Category)?.icon || 'tag' });
    setSheet(true); setError('');
  }
  async function save() {
    try {
      if (parent) {
        if (editing) await mobileApi.update('/categories/subcategories', editing._id, { name: form.name, description: form.description });
        else await mobileApi.create(`/categories/${parent._id}/subcategories`, { name: form.name, description: form.description });
      } else if (editing) await mobileApi.update('/categories', editing._id, form);
      else await mobileApi.create('/categories', form);
      setSheet(false); await refresh();
    } catch (next) { setError(apiErrorMessage(next)); }
  }
  function remove(item: Category | SubCategory, sub = false) {
    Alert.alert('Deactivate?', 'Existing records remain unchanged.', [{ text: 'Cancel' }, { text: 'Deactivate', style: 'destructive', onPress: async () => {
      try { await mobileApi.remove(sub ? '/categories/subcategories' : '/categories', item._id); await refresh(); } catch (next) { setError(apiErrorMessage(next)); }
    } }]);
  }
  return <Page onRefresh={refresh}>
    <PageTitle title="Categories" subtitle="Spending categories and sub-categories" action={<Pressable onPress={() => open()} style={styles.add}><Plus size={19} color="#fff" /></Pressable>} />
    <ErrorBox message={error} />
    {!categories.length ? <Empty text="No categories found." /> : categories.map(category => <Card key={category._id}>
      <View style={styles.head}><View style={[styles.dot, { backgroundColor: category.color || theme.primary }]} /><Text style={[styles.name, { color: theme.text }]}>{category.name}</Text><Pressable onPress={() => open(category)} style={styles.action}><Edit3 size={15} color={theme.primary} /></Pressable><Pressable onPress={() => remove(category)} style={styles.action}><Trash2 size={15} color={theme.negative} /></Pressable></View>
      {(category.subCategories || []).map(sub => <View key={sub._id} style={[styles.sub, { borderTopColor: theme.divider }]}><Text style={[styles.subName, { color: theme.textMuted }]}>{sub.name}</Text><Pressable onPress={() => open(sub, category)} style={styles.action}><Edit3 size={14} color={theme.primary} /></Pressable><Pressable onPress={() => remove(sub, true)} style={styles.action}><Trash2 size={14} color={theme.negative} /></Pressable></View>)}
      <Pressable onPress={() => open(undefined, category)} style={styles.addSub}><Plus size={13} color={colors.primary} /><Text style={styles.addSubText}>Add sub-category</Text></Pressable>
    </Card>)}
    <Sheet visible={sheet} title={`${editing ? 'Edit' : 'Add'} ${parent ? 'sub-category' : 'category'}`} onClose={() => setSheet(false)}>
      <ErrorBox message={error} /><Field label="Name" value={form.name} onChangeText={(name: string) => setForm(x => ({ ...x, name }))} /><Field label="Description" value={form.description} onChangeText={(description: string) => setForm(x => ({ ...x, description }))} />
      {!parent ? <><Field label="Color" value={form.color} onChangeText={(color: string) => setForm(x => ({ ...x, color }))} /><Field label="Icon name" value={form.icon} onChangeText={(icon: string) => setForm(x => ({ ...x, icon }))} /></> : null}
      <Button label="Save" onPress={save} />
    </Sheet>
  </Page>;
}
const styles = StyleSheet.create({
  add: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center' }, dot: { width: 10, height: 10, borderRadius: 5, marginRight: 9 },
  name: { ...typography, flex: 1, color: colors.text, fontSize: 12.5, fontWeight: '800' }, action: { padding: 8 },
  sub: { minHeight: 42, marginLeft: 19, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F3F6' },
  subName: { ...typography, flex: 1, color: colors.textMuted, fontSize: 10.5, fontWeight: '700' },
  addSub: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 10, marginLeft: 19 },
  addSubText: { ...typography, color: colors.primary, fontSize: 11, fontWeight: '800' },
});
