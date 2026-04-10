import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AdminSidebar from './components/layout/AdminSidebar';
import CaseManagerSidebar from './components/layout/CaseManagerSidebar';
import CookieConsent from './components/ui/CookieConsent';
import ProtectedRoute from './components/ui/ProtectedRoute';
import ScrollToTop from './components/ui/ScrollToTop';

import Home from './pages/public/Home';
import DonatePage from './pages/public/DonatePage';
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
import EarlyWarning from './pages/admin/EarlyWarning';
import PostingSchedule from './pages/admin/PostingSchedule';
import MyDonations from './pages/donor/MyDonations';

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
    <ProtectedRoute roles={['Admin']}>
      <a href="#admin-main-content" className="skip-to-main">
        Skip to main content
      </a>
      <Navbar />
      <div className="admin-layout">
        <AdminSidebar />
        <main id="admin-main-content" className="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function CaseManagerLayout() {
  return (
    <ProtectedRoute roles={['CaseManager']}>
      <a href="#admin-main-content" className="skip-to-main">
        Skip to main content
      </a>
      <Navbar />
      <div className="admin-layout">
        <CaseManagerSidebar />
        <main id="admin-main-content" className="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/impact" element={<ImpactDashboard />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route
              path="/donor/donations"
              element={
                <ProtectedRoute roles={['Donor']}>
                  <MyDonations />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/case-manager" element={<CaseManagerLayout />}>
            <Route index element={<Navigate to="caseload" replace />} />
            <Route path="caseload" element={<CaseloadInventory />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="donors" element={<Donors />} />
            <Route path="caseload" element={<CaseloadInventory />} />
            <Route path="process-recording" element={<ProcessRecording />} />
            <Route path="visitation" element={<HomeVisitation />} />
            <Route path="case-conferences" element={<Navigate to="/admin/visitation" replace />} />
            <Route path="reports" element={<Reports />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="early-warning" element={<EarlyWarning />} />
            <Route path="posting-schedule" element={<PostingSchedule />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
 
