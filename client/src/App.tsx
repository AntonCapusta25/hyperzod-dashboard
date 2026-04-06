import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import { AuthProvider } from './modules/auth/contexts/AuthContext';
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import LoginPage from './modules/auth/pages/LoginPage';

// Pages
import OverviewPage from './modules/marketing/pages/OverviewPage';
import ChefsPage from './modules/marketing/pages/ChefsPage';
import ClientsPage from './modules/marketing/pages/ClientsPage';
import OrdersPage from './modules/marketing/pages/OrdersPage';
import EmailCampaignsPage from './modules/marketing/pages/EmailCampaignsPage';
import KPIsPage from './modules/marketing/pages/KPIsPage';
import BegeleidersDashboard from './modules/marketing/pages/BegeleidersDashboard';
import PublicAnalyticsPage from './modules/marketing/pages/PublicAnalyticsPage';
import PublicChefsPage from './modules/marketing/pages/PublicChefsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/public/analytics" element={<PublicAnalyticsPage />} />
          <Route path="/public/chefs" element={<PublicChefsPage />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Navigate to="/dashboard/overview" replace />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="overview" element={<OverviewPage />} />
                  <Route path="chefs/*" element={<ChefsPage />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="campaigns/*" element={<EmailCampaignsPage />} />
                  <Route path="kpis/*" element={<KPIsPage />} />
                  <Route path="begeleiders" element={<BegeleidersDashboard />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
