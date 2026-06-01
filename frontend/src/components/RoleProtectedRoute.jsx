import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AUTH_STORAGE_KEYS, getRoleHome, hasPermission, normalizeRole } from '../utils/auth';

function RoleAccessLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-blue-700">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.1)]">
        <div className="flex items-center gap-3 text-sm font-black">
          <span className="h-3 w-3 animate-ping rounded-full bg-blue-500" />
          Validating role workspace...
        </div>
      </div>
    </div>
  );
}

export default function RoleProtectedRoute({ children, allowedRoles = [], permission }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RoleAccessLoading />;

  const invalidSession = sessionStorage.getItem(AUTH_STORAGE_KEYS.invalidSession) === '1';
  if (invalidSession) {
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.invalidSession);
    return <Navigate to="/" replace />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = normalizeRole(user.role);
  const allowed = allowedRoles.map(normalizeRole);
  if (allowed.length && !allowed.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  if (permission && !hasPermission(role, permission)) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return children || <Outlet />;
}
