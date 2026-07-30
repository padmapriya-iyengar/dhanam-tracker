import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { HomeSettingsScreen } from '../screens/HomeSettingsScreen';
import {
  AttentionScreen,
} from '../screens/HomeDestinations';
import { ActivityDetailScreen, ActivityScreen } from '../screens/ActivityScreens';
import {
  AccountDetailScreen, AccountFormScreen, AccountsScreen, CardBudgetScreen, CardDetailScreen,
  CardFormScreen, CardReconciliationScreen, CardsScreen, CardTrendsScreen, CategoryComparisonScreen,
  OpeningBalancesScreen,
} from '../screens/AccountsCardsScreens';
import {
  AssistantScreen, CategoryGoalsScreen, CustomReportScreen, InsightsScreen, MonthlyPlanScreen,
  MonthlyReportScreen, PlanScreen, RecurringFormScreen, RecurringScreen, ReportsScreen,
} from '../screens/PlanningReportsScreens';
import {
  CategoriesScreen, CategoryFormScreen, DiagnosticsScreen, HouseholdScreen, MemberFormScreen,
  MembersScreen, NotificationSettingsScreen, NotificationsScreen, PreferencesScreen,
  SubcategoriesScreen, UserFormScreen, UsersScreen,
} from '../screens/ConfigurationScreens';
import { typography, useAppTheme } from '../theme';
import {
  AddMenuScreen, ExpenseFormScreen, IncomeFormScreen,
  RecoveryFormScreen, RecoveryPickerScreen, TransferFormScreen,
} from '../screens/CaptureScreens';
import { ImportInboxScreen, ImportReviewScreen, MessageImportScreen } from '../screens/ImportScreens';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { colors, dark } = useAppTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  const linking = { prefixes: ['dhanam://'], config: { screens: { Add: 'add', ExpenseForm: 'add/expense', IncomeForm: 'add/income', TransferForm: 'add/transfer', MessageImport: 'add/import', ImportInbox: 'imports' } } };
  return <NavigationContainer linking={linking} theme={{ ...base, colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } }}>
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { fontFamily: typography.family, fontWeight: '700' }, headerTintColor: colors.text, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'App lock & devices' }} />
      <Stack.Screen name="HomeSettings" component={HomeSettingsScreen} options={{ title: 'Customize Home' }} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Transaction' }} />
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ title: 'Account ledger' }} />
      <Stack.Screen name="Attention" component={AttentionScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="PlanDetail" component={PlanScreen} options={{ title: 'Planning' }} />
      <Stack.Screen name="Plan" component={PlanScreen} />
      <Stack.Screen name="AccountForm" component={AccountFormScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="OpeningBalances" component={OpeningBalancesScreen} options={{ title: 'Opening balances' }} />
      <Stack.Screen name="CategoryComparison" component={CategoryComparisonScreen} options={{ title: 'Category comparison' }} />
      <Stack.Screen name="Cards" component={CardsScreen} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: 'Card' }} />
      <Stack.Screen name="CardForm" component={CardFormScreen} options={{ title: 'Card details' }} />
      <Stack.Screen name="CardBudget" component={CardBudgetScreen} options={{ title: 'Card budget' }} />
      <Stack.Screen name="CardReconciliation" component={CardReconciliationScreen} options={{ title: 'Reconciliation' }} />
      <Stack.Screen name="CardTrends" component={CardTrendsScreen} options={{ title: 'Card trends' }} />
      <Stack.Screen name="CategoryGoals" component={CategoryGoalsScreen} options={{ title: 'Category goals' }} />
      <Stack.Screen name="Recurring" component={RecurringScreen} />
      <Stack.Screen name="RecurringForm" component={RecurringFormScreen} options={{ title: 'Recurring expense' }} />
      <Stack.Screen name="MonthlyPlan" component={MonthlyPlanScreen} options={{ title: 'Monthly plan' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ title: 'Monthly report' }} />
      <Stack.Screen name="CustomReport" component={CustomReportScreen} options={{ title: 'Custom report' }} />
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: 'AI insights' }} />
      <Stack.Screen name="Assistant" component={AssistantScreen} options={{ title: 'Finance assistant' }} />
      <Stack.Screen name="Household" component={HouseholdScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="MemberForm" component={MemberFormScreen} options={{ title: 'Member' }} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="CategoryForm" component={CategoryFormScreen} options={{ title: 'Category' }} />
      <Stack.Screen name="Subcategories" component={SubcategoriesScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="UserForm" component={UserFormScreen} options={{ title: 'User' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notification controls' }} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
      <Stack.Screen name="Add" component={AddMenuScreen} options={{ title: 'Add' }} />
      <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: 'Expense' }} />
      <Stack.Screen name="IncomeForm" component={IncomeFormScreen} options={{ title: 'Income' }} />
      <Stack.Screen name="TransferForm" component={TransferFormScreen} options={{ title: 'Transfer' }} />
      <Stack.Screen name="RecoveryPicker" component={RecoveryPickerScreen} options={{ title: 'Recovery' }} />
      <Stack.Screen name="RecoveryForm" component={RecoveryFormScreen} options={{ title: 'Recovery' }} />
      <Stack.Screen name="MessageImport" component={MessageImportScreen} options={{ title: 'Import message' }} />
      <Stack.Screen name="ImportReview" component={ImportReviewScreen} options={{ title: 'Review import' }} />
      <Stack.Screen name="ImportInbox" component={ImportInboxScreen} options={{ title: 'Import inbox' }} />
    </Stack.Navigator>
  </NavigationContainer>;
}
