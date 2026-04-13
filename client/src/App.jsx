import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LoadingScreen from './components/ui/LoadingScreen';

// Lazy load pages for better performance and smaller initial bundle
const ChatDashboard = lazy(() => import('./pages/ChatDashboard'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DeviceHistoryPage = lazy(() => import('./pages/DeviceHistoryPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const PrivateRoute = ({ children }) => {
  const { user, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <LoadingScreen message="Verifying your session..." />;
  }

  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <LoadingScreen message="Verifying admin access..." />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'owner'].includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

const AuthRoute = ({ children }) => {
  const { user, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return user ? <Navigate to="/" replace /> : children;
};

// Wrapper specifically for the Chat/App area where contexts are needed
const AppProviders = ({ children }) => {
  return (
      <SocketProvider>
        <CallProvider>
          {children}
        </CallProvider>
      </SocketProvider>
  );
};

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AppProviders>
      <Router>
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
          <Routes>
            <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
            <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
            
            <Route path="/" element={
              <PrivateRoute>
                <ChatDashboard />
              </PrivateRoute>
            } />
            
            <Route path="/settings" element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            } />
            
            <Route path="/settings/devices" element={
              <PrivateRoute>
                <DeviceHistoryPage />
              </PrivateRoute>
            } />

            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AppProviders>
  );
}

export default App;
