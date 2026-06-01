import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHome } from '../utils/auth';

export default function PublicLayout({ guestOnly = false }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (guestOnly && isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || getRoleHome(user?.role)} replace />;
  }

  return <Outlet />;
}
