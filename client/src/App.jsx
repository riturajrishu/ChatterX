import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatDashboard from './pages/ChatDashboard';
import SettingsPage from './pages/SettingsPage';
import DeviceHistoryPage from './pages/DeviceHistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import LoadingScreen from './components/ui/LoadingScreen';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Verifying your session..." />;
  }

  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Verifying admin access..." />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'owner'].includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return user ? <Navigate to="/" replace /> : children;
};

// Wrapper specifically for the Chat/App area where contexts are needed
const AppProviders = ({ children }) => {
  return (
      <SocketProvider>
        {children}
      </SocketProvider>
  );
};

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
        
        <Route path="/" element={
          <PrivateRoute>
            <AppProviders>
              <ChatDashboard />
            </AppProviders>
          </PrivateRoute>
        } />
        
        <Route path="/settings" element={
          <PrivateRoute>
             <AppProviders>
              <SettingsPage />
            </AppProviders>
          </PrivateRoute>
        } />
        
        <Route path="/settings/devices" element={
          <PrivateRoute>
             <AppProviders>
              <DeviceHistoryPage />
            </AppProviders>
          </PrivateRoute>
        } />

        <Route path="/admin" element={
          <AdminRoute>
            <AppProviders>
              <AdminDashboard />
            </AppProviders>
          </AdminRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
