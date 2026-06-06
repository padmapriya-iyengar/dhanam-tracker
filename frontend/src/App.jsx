import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import Categories from './pages/Categories';
import CreditCards from './pages/CreditCards';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Insights from './pages/Insights';
import Members from './pages/Members';
import Reports from './pages/Reports';
import Savings from './pages/Savings';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="income" element={<Income />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="categories" element={<Categories />} />
            <Route path="reports" element={<Reports />} />
            <Route path="insights" element={<Insights />} />
            <Route path="savings" element={<Savings />} />
            <Route path="credit-cards" element={<CreditCards />} />
            <Route path="members" element={<Members />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
