import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../store/AppContext';

export default function ProtectedRoute() {
  const { state } = useApp();

  if (!state.bootstrapped) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          color: '#6B7280',
        }}
      >
        Загрузка…
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
