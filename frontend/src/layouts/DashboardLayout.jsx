import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Moon, Sparkles, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { connectRealtime } from '../services/realtime';

export default function DashboardLayout({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('hrms_theme') === 'dark');

  const toggleTheme = useCallback(() => {
    setDark((current) => {
      const next = !current;
      localStorage.setItem('hrms_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  useEffect(() => {
    const handleThemeToggle = () => toggleTheme();
    window.addEventListener('hrms:toggle-theme', handleThemeToggle);
    return () => window.removeEventListener('hrms:toggle-theme', handleThemeToggle);
  }, [toggleTheme]);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    const socket = connectRealtime({
      token,
      onMessage: (message) => {
        if (message.type === 'activity') {
          window.dispatchEvent(new CustomEvent('hrms:realtime', { detail: message }));
          const action = message.payload?.action;
          if (action) toast.info(action, { autoClose: 1800 });
        }
        if (message.type === 'resume_updated') {
          window.dispatchEvent(new CustomEvent('hrms:resume-updated', { detail: message }));
        }
      },
    });
    return () => socket?.close();
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="workspace-premium min-h-screen text-slate-950">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(79,70,229,0.16),transparent_30%),radial-gradient(circle_at_86%_4%,rgba(6,182,212,0.12),transparent_28%),radial-gradient(circle_at_48%_100%,rgba(124,58,237,0.08),transparent_34%),linear-gradient(135deg,#f8fbff,#eef4ff_48%,#f8fafc)]" />
          <div className="enterprise-grid-bg absolute inset-0" />
        </div>
        <div className="relative lg:flex">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 text-slate-950 backdrop-blur-2xl lg:hidden">
              <button
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <span className="inline-flex items-center gap-2 text-sm font-black tracking-tight">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white"><Sparkles size={16} /></span>
                AI-HRMS
              </span>
              <button
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {dark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </header>
            <motion.main
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="mx-auto w-full max-w-[1720px] p-3 sm:p-4 lg:p-5 xl:p-6"
            >
              {children || <Outlet />}
            </motion.main>
          </div>
        </div>
      </div>
    </div>
  );
}
