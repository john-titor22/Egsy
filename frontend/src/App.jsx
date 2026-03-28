import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Troupeaux from './pages/Troupeaux';
import Production from './pages/Production';
import Stock from './pages/Stock';
import Ventes from './pages/Ventes';
import Depenses from './pages/Depenses';
import Utilisateurs from './pages/Utilisateurs';
import Equipe from './pages/Equipe';
import ChangePassword from './pages/ChangePassword';

// Redirect authenticated users to appropriate home
function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

// Require authentication; redirect to /change-password if mustChangePassword
function ProtectedRoute({ children, allowMustChange = false }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && !allowMustChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

// Admin-only route (platform owner)
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

// Owner-only route (farm owner managing their team)
function OwnerRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'OWNER') return <Navigate to="/" replace />;
  return children;
}

// Redirect ADMIN to their panel on root visit
function AdminIndexRedirect({ children }) {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/utilisateurs" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Force password change — accessible while logged in */}
      <Route
        path="/change-password"
        element={<ProtectedRoute allowMustChange><ChangePassword /></ProtectedRoute>}
      />

      <Route
        path="/"
        element={<ProtectedRoute><Layout /></ProtectedRoute>}
      >
        <Route index element={<AdminIndexRedirect><Dashboard /></AdminIndexRedirect>} />
        <Route path="troupeaux" element={<Troupeaux />} />
        <Route path="production" element={<Production />} />
        <Route path="stock" element={<Stock />} />
        <Route path="ventes" element={<Ventes />} />
        <Route path="depenses" element={<Depenses />} />

        {/* ADMIN panel */}
        <Route path="utilisateurs" element={<AdminRoute><Utilisateurs /></AdminRoute>} />

        {/* OWNER team management */}
        <Route path="equipe" element={<OwnerRoute><Equipe /></OwnerRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
