import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/Typography';
import { apiErrorMessage, mobileApi } from '../api';
import { Button, Card, ErrorBox, Field, Page, PageTitle } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

export function InsightsScreen() {
  const { colors: theme } = useTheme();
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function generate() { setLoading(true); setError(''); try { setData((await mobileApi.insights()).data); } catch (next) { setError(apiErrorMessage(next)); } finally { setLoading(false); } }
  return <Page><PageTitle title="AI Insights" subtitle="Personalized analysis from your recent finances" /><ErrorBox message={error} /><Button label={loading ? 'Analyzing…' : 'Generate insights'} onPress={generate} disabled={loading} />{data ? <Card><Text style={[styles.markdown, { color: theme.text }]}>{data.insights}</Text></Card> : null}</Page>;
}

export function AssistantScreen() {
  const { colors: theme } = useTheme();
  const [message, setMessage] = useState(''); const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function send() { if (!message.trim()) return; const text = message.trim(); const nextHistory = [...messages, { role: 'user', content: text }]; setMessages(nextHistory); setMessage(''); setLoading(true); setError(''); try { const response = await mobileApi.chat(text, messages); setMessages([...nextHistory, { role: 'assistant', content: response.data.answer }]); } catch (next) { setError(apiErrorMessage(next)); } finally { setLoading(false); } }
  return <Page><PageTitle title="Dhanam Assistant" subtitle="Ask questions about your financial data" /><ErrorBox message={error} />{messages.map((item, i) => <View key={i} style={[styles.bubble, item.role === 'user' ? [styles.userBubble, { backgroundColor: theme.primary }] : [styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.border }]]}><Text style={[styles.message, { color: theme.text }, item.role === 'user' && { color: '#fff' }]}>{item.content}</Text></View>)}<Card><Field label="Your question" value={message} onChangeText={setMessage} multiline placeholder="How much did I spend on food last month?" /><Button label={loading ? 'Thinking…' : 'Ask assistant'} onPress={send} disabled={loading} /></Card></Page>;
}
const styles = StyleSheet.create({
  markdown: { ...typography, color: colors.text, fontSize: 13, lineHeight: 21 }, bubble: { maxWidth: '88%', borderRadius: 15, padding: 12, marginBottom: 9 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary }, assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  message: { ...typography, color: colors.text, fontSize: 12, lineHeight: 18 },
});
