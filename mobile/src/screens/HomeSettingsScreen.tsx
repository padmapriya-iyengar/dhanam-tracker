import { View } from 'react-native';
import { Text } from '../components/Typography';
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from 'lucide-react-native';
import { Button, Card, Screen, Title } from '../components/ui';
import { usePreferences } from '../state/PreferencesContext';
import { useAppTheme } from '../theme';
import { Member } from '../types';

const labels: Record<string, string> = {
  spendPulse: 'Spend pulse', accounts: 'Account snapshot', attention: 'Attention feed', activity: 'Recent activity',
};

export function HomeSettingsScreen({ route }: any) {
  const { colors } = useAppTheme();
  const prefs = usePreferences();
  const members: Member[] = route.params?.members || [];

  function move(index: number, delta: number) {
    const next = [...prefs.homeSections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    prefs.updatePreferences({ homeSections: next });
  }
  function toggleHidden(id: string) {
    prefs.updatePreferences({
      hiddenHomeSections: prefs.hiddenHomeSections.includes(id)
        ? prefs.hiddenHomeSections.filter((item) => item !== id)
        : [...prefs.hiddenHomeSections, id],
    });
  }

  return <Screen>
    <Title subtitle="Choose whose totals appear and arrange the cards that matter to you.">Customize Home</Title>
    <Card>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Financial scope</Text>
      <Button label={`${!prefs.homeMemberId ? '✓ ' : ''}Household totals`} variant={!prefs.homeMemberId ? 'primary' : 'secondary'} onPress={() => prefs.updatePreferences({ homeMemberId: '' })} />
      {members.map((member) => <Button key={member._id} label={`${prefs.homeMemberId === member._id ? '✓ ' : ''}${member.name}`} variant={prefs.homeMemberId === member._id ? 'primary' : 'secondary'} onPress={() => prefs.updatePreferences({ homeMemberId: member._id })} />)}
    </Card>
    <Card>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Sections</Text>
      <Text style={{ color: colors.textMuted, lineHeight: 20 }}>Monthly snapshot always remains visible. Reorder or hide the secondary sections below.</Text>
      {prefs.homeSections.map((id, index) => {
        const hidden = prefs.hiddenHomeSections.includes(id);
        return <View key={id} style={{ borderTopWidth: index ? 1 : 0, borderTopColor: colors.border, paddingTop: index ? 12 : 0, gap: 9 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{labels[id] || id}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button label="Up" variant="secondary" disabled={index === 0} onPress={() => move(index, -1)} icon={<ArrowUp size={16} color={colors.text} />} /></View>
            <View style={{ flex: 1 }}><Button label="Down" variant="secondary" disabled={index === prefs.homeSections.length - 1} onPress={() => move(index, 1)} icon={<ArrowDown size={16} color={colors.text} />} /></View>
          </View>
          <Button label={hidden ? 'Show section' : 'Hide section'} variant="secondary" onPress={() => toggleHidden(id)} icon={hidden ? <Eye size={17} color={colors.text} /> : <EyeOff size={17} color={colors.text} />} />
        </View>;
      })}
      <Button label="Restore defaults" variant="secondary" icon={<RotateCcw size={17} color={colors.text} />} onPress={() => prefs.updatePreferences({ homeSections: ['spendPulse', 'accounts', 'attention', 'activity'], hiddenHomeSections: [], collapsedHomeSections: [] })} />
    </Card>
  </Screen>;
}
