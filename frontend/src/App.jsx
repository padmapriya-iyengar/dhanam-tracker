import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import { AppProvider } from './context/AppContext';

const Categories = lazy(() => import('./pages/Categories'));
const CreditCards = lazy(() => import('./pages/CreditCards'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Income = lazy(() => import('./pages/Income'));
const Insights = lazy(() => import('./pages/Insights'));
const Members = lazy(() => import('./pages/Members'));
const Reports = lazy(() => import('./pages/Reports'));
const Savings = lazy(() => import('./pages/Savings'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Transfers = lazy(() => import('./pages/Transfers'));
const Users = lazy(() => import('./pages/Users'));
const AccountOverview = lazy(() => import('./pages/AccountOverview'));

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="income" element={<Income />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="categories" element={<Categories />} />
              <Route path="reports" element={<Reports />} />
              <Route path="insights" element={<Insights />} />
              <Route path="savings" element={<Savings />} />
              <Route path="credit-cards" element={<CreditCards />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="accounts" element={<AccountOverview />} />
              <Route path="members" element={<Members />} />
              <Route path="users" element={<Users />} />
            </Route>
          </Routes>
        </Suspense>
      </AppProvider>
    </BrowserRouter>
  );
}
