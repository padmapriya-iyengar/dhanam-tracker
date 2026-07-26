import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { BarChart3, CircleDollarSign, LayoutDashboard, ReceiptText } from 'lucide-react-native';
import { DashboardScreen } from './screens/DashboardScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { AddRecordScreen } from './screens/AddRecordScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { ManageScreen } from './screens/ManageScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { AssistantScreen, InsightsScreen } from './screens/IntelligenceScreen';
import { FinanceToolsScreen } from './screens/FinanceToolsScreen';
import { CardOperationsScreen } from './screens/CardOperationsScreen';
import { MessageImportScreen } from './screens/MessageImportScreen';
import { colors, typography } from './theme';
import { useTheme } from './ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const { colors } = useTheme();
  return <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSoft,
    tabBarLabelStyle: { ...typography, fontSize: 9, fontWeight: '700' },
    tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 8, borderTopColor: 'rgba(255,255,255,.9)', backgroundColor: 'rgba(252,252,255,.98)', elevation: 12, shadowColor: '#30356B', shadowOpacity: .12, shadowRadius: 16 },
    tabBarIcon: ({ color, size }) => {
      const Icon = route.name === 'Dashboard' ? LayoutDashboard : route.name === 'Expenses' ? ReceiptText : route.name === 'Income' ? CircleDollarSign : BarChart3;
      return <Icon size={size} color={color} />;
    },
  })}>
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Expenses">{props => <ActivityScreen {...props} fixedKind="expenses" />}</Tab.Screen>
    <Tab.Screen name="Income">{props => <ActivityScreen {...props} fixedKind="income" />}</Tab.Screen>
    <Tab.Screen name="Reports" component={ReportsScreen} />
  </Tab.Navigator>;
}

export function Navigation() {
  const { colors, isDark } = useTheme();
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors), primary: colors.primary, background: colors.background, card: colors.nav, text: colors.text, border: colors.border, notification: colors.negative },
  };
  return <NavigationContainer theme={navigationTheme}><Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.nav }, contentStyle: { backgroundColor: colors.background }, headerTitleStyle: { ...typography, fontWeight: '800', color: colors.text }, headerTintColor: colors.primary, headerBackTitle: 'Back' }}>
    <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
    <Stack.Screen name="AddRecord" component={AddRecordScreen} options={({ route }: any) => ({ title: route.params?.kind === 'income' ? 'Add income' : 'Add expense' })} />
    <Stack.Screen name="Accounts" component={AccountsScreen} />
    <Stack.Screen name="Savings" component={ManageScreen} />
    <Stack.Screen name="CreditCards" component={ManageScreen} options={{ title: 'Credit cards' }} />
    <Stack.Screen name="CardBudgets" component={FinanceToolsScreen} options={{ title: 'Card budgets' }} />
    <Stack.Screen name="CardOperations" component={CardOperationsScreen} options={{ title: 'Card reconciliation' }} />
    <Stack.Screen name="OpeningBalances" component={FinanceToolsScreen} options={{ title: 'Opening balances' }} />
    <Stack.Screen name="CategoryGoals" component={FinanceToolsScreen} options={{ title: 'Category goals' }} />
    <Stack.Screen name="Categories" component={CategoriesScreen} />
    <Stack.Screen name="Members" component={ManageScreen} />
    <Stack.Screen name="Users" component={ManageScreen} />
    <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: 'AI insights' }} />
    <Stack.Screen name="Assistant" component={AssistantScreen} />
    <Stack.Screen name="MessageImport" component={MessageImportScreen} options={{ title: 'Import message' }} />
  </Stack.Navigator></NavigationContainer>;
}
