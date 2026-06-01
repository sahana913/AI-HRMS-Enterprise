import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  ChevronLeft,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_META, ROLE_NAVIGATION, getRoleHome, hasPermission, normalizeRole } from '../config/roles';

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { isAuthenticated, signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const role = normalizeRole(user?.role || 'employee');
  const roleMeta = ROLE_META[role] || ROLE_META.employee;
  const initials = user?.username ? user.username.slice(0, 1).toUpperCase() : 'A';
  const home = getRoleHome(role);
  const visibleSections = useMemo(() => (ROLE_NAVIGATION[role] || [])
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPermission(role, item.permission)),
    }))
    .filter((section) => section.items.length), [role]);

  if (!isAuthenticated) {
    return null;
  }

  const shellClasses = `fixed inset-y-0 left-0 z-40 flex ${collapsed ? 'w-[76px]' : 'w-[276px]'} flex-col border-r border-white/60 bg-white/76 p-2.5 text-slate-950 shadow-[18px_0_70px_rgba(79,70,229,0.12)] backdrop-blur-2xl transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
    open ? 'translate-x-0' : '-translate-x-full'
  }`;

  return (
    <>
      {open && <button className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside className={shellClasses}>
        <div className="flex items-center justify-between gap-2 px-1 py-1.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 text-white shadow-lg shadow-violet-500/20">
              <Sparkles size={19} />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#0B1020]" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">AI-HRMS</p>
                <h1 className="truncate text-sm font-black tracking-tight text-slate-950">{roleMeta.label} Workspace</h1>
              </div>
            )}
          </div>
          <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onClose} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>

        <button
          onClick={() => setCollapsed((value) => !value)}
          className="absolute -right-3 top-20 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-blue-600 lg:flex"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft size={16} className={`transition ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className={`mt-3 rounded-xl border border-white/70 bg-white/58 p-3 shadow-inner shadow-white/60 ${collapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3`}>
            {!collapsed && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Workspace</p>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-950">{roleMeta.title}</p>
              </div>
            )}
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <BarChart3 size={18} />
            </div>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-1">
          {visibleSections.map((section) => (
            <div key={section.label}>
              {!collapsed && <p className="mb-2 px-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{section.label}</p>}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={`${section.label}-${item.label}`} to={item.path} end={item.path === home} onClick={onClose} title={collapsed ? item.label : undefined}>
                      {({ isActive }) => (
                        <motion.div
                          whileHover={{ x: collapsed ? 0 : 2 }}
                          className={`group relative flex h-10 items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-2.5'} rounded-xl text-sm transition ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)]'
                              : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 hover:shadow-sm'
                          }`}
                        >
                          {isActive && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-blue-600 shadow-[0_0_14px_rgba(37,99,235,0.35)]" />}
                          <Icon size={17} className="shrink-0" />
                          {!collapsed && <span className="truncate font-semibold">{item.label}</span>}
                          {collapsed && (
                            <span className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-950 shadow-2xl group-hover:block">
                              {item.label}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 space-y-2 border-t border-white/70 px-1 pt-3">
          <div className={`rounded-xl border border-white/70 bg-white/58 p-2.5 ${collapsed ? 'flex justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              {user?.profileImage ? (
                <img className="h-9 w-9 shrink-0 rounded-lg object-cover" src={user.profileImage} alt="" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-black text-white">{initials}</div>
              )}
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{user?.username || user?.name || 'User'}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">{roleMeta.label}</p>
                </div>
              )}
            </div>
          </div>
          <button onClick={signOut} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
