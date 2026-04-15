import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageLoading from '../ui/PageLoading';

export default function ProtectedRoute() {
  const { state } = useApp();

  if (!state.bootstrapped) {
    return <PageLoading message="Проверяем вход и сохранённый прогресс…" />;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
