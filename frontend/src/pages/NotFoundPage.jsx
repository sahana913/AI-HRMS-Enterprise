import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHome } from '../utils/auth';

export default function NotFoundPage() {
  const { isAuthenticated, user } = useAuth();
  const homePath = isAuthenticated ? getRoleHome(user?.role) : '/';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-xl rounded-[32px] border border-slate-800 bg-slate-900/80 p-12 text-center shadow-2xl">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan-400">404 Error</p>
        <h1 className="mt-6 text-6xl font-black text-white">Page not found</h1>
        <p className="mt-4 text-slate-400">The link you followed might be broken, or the page has moved.</p>
        <Link className="mt-8 inline-flex rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400" to={homePath}>
          Go back home
        </Link>
      </div>
    </div>
  );
}
