import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AdminSidebar from './components/layout/AdminSidebar';
import CookieConsent from './components/ui/CookieConsent';
import ProtectedRoute from './components/ui/ProtectedRoute';

import Home from './pages/public/Home';
import ImpactDashboard from './pages/public/ImpactDashboard';
import Login from './pages/public/Login';
import PrivacyPolicy from './pages/public/PrivacyPolicy';

import AdminDashboard from './pages/admin/AdminDashboard';
import Donors from './pages/admin/Donors';
import CaseloadInventory from './pages/admin/CaseloadInventory';
import ProcessRecording from './pages/admin/ProcessRecording';
import HomeVisitation from './pages/admin/HomeVisitation';
import Reports from './pages/admin/Reports';
import StaffManagement from './pages/admin/StaffManagement';

function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <CookieConsent />
    </>
  );
}

function AdminLayout() {
  return (
    <ProtectedRoute>
      <Navbar />
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/impact" element={<ImpactDashboard />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Route>

          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="donors" element={<Donors />} />
            <Route path="caseload" element={<CaseloadInventory />} />
            <Route path="process-recording" element={<ProcessRecording />} />
            <Route path="visitation" element={<HomeVisitation />} />
            <Route path="reports" element={<Reports />} />
            <Route path="staff" element={<StaffManagement />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
