import { useEffect, useMemo, useState } from 'react';
import { Bell, Bot, FileSearch, KeyRound, Palette, ShieldCheck, SlidersHorizontal, UserRound, UsersRound } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getRoleHome, normalizeRole } from '../utils/auth';

const tabs = [
  ['profile', 'Profile settings', UserRound],
  ['account', 'Account settings', SlidersHorizontal],
  ['roles', 'Role management', UsersRound],
  ['ai', 'AI preferences', Bot],
  ['notifications', 'Notifications', Bell],
  ['security', 'Security', KeyRound],
  ['theme', 'Theme', Palette],
  ['audit', 'Audit activity', FileSearch],
];

export default function SettingsPage() {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);
  const visibleTabs = useMemo(() => (
    currentRole === 'admin' ? tabs : tabs.filter(([id]) => !['roles', 'audit'].includes(id))
  ), [currentRole]);
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    return visibleTabs.some(([id]) => id === hash) ? hash : 'profile';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', role: user?.role || '' });
  const role = normalizeRole(form.role);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (visibleTabs.some(([id]) => id === hash)) setActiveTab(hash);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [visibleTabs]);

  const selectTab = (id) => {
    setActiveTab(id);
    window.history.replaceState(null, '', `${getRoleHome(role)}/settings#${id}`);
  };

  return (
    <div className="space-y-6">
      <Topbar title="Settings" />

      <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="premium-panel p-5 text-slate-950">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600 text-white"><UserRound size={22} /></div>
            <h2 className="mt-6 text-2xl font-black">Workspace profile</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Enterprise preferences for identity, roles, AI behavior, notifications, security, and theme.</p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="metric-label">Access level</p><p className="mt-1 font-black">{role}</p></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="metric-label">Security</p><p className="mt-1 font-black">JWT protected</p></div>
            </div>
          </div>
          <nav className="premium-panel p-2">
            {visibleTabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => selectTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${activeTab === id ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] dark:hover:text-white'}`}>
                <Icon size={17} /> {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="premium-panel p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-500/10 p-2 text-violet-500 dark:text-cyan-300"><ShieldCheck size={20} /></div>
            <div><p className="metric-label">{activeTab}</p><h2 className="text-xl font-black text-slate-950 dark:text-white">{visibleTabs.find(([id]) => id === activeTab)?.[1]}</h2></div>
          </div>

          {activeTab === 'profile' && (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {['name', 'email', 'role'].map((field) => (
                <label key={field} className="block text-sm font-semibold text-slate-500">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  <input className="premium-input mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} disabled={field === 'email' || field === 'role'} />
                </label>
              ))}
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {[
                ['Super Admin', 'Full platform, billing, role, security, and AI configuration access.'],
                ['HR Manager', 'Employees, ATS, interviews, leave, analytics, and reports.'],
                ['Recruiter', 'Candidates, ATS pipeline, interviews, screening, and notes.'],
                ['Employee', 'Resume builder, attendance, leave, notifications, and settings.'],
                ['Candidate', 'Public profile, resume experience, and candidate-facing workflow.'],
              ].map(([name, detail]) => (
                <div key={name} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="font-black text-slate-950 dark:text-white">{name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="mt-6 space-y-3">
              {[
                ['Session verified', 'JWT session validated for protected dashboard access.', 'Just now'],
                ['Profile menu opened', 'Account settings shortcut was used from the top navigation.', '1m ago'],
                ['Theme preference updated', 'Workspace theme preference stored locally for this browser.', 'Today'],
                ['ATS workspace viewed', 'Recruitment pipeline and analytics widgets were accessed.', 'Today'],
              ].map(([title, detail, time]) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-black text-slate-950 dark:text-white">{title}</p>
                      <span className="shrink-0 text-xs font-bold text-slate-400">{time}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'profile' && activeTab !== 'roles' && activeTab !== 'audit' && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {[
                ['AI resume suggestions', 'Enable contextual resume enhancement and ATS recommendations.'],
                ['Interview reminders', 'Send panel reminders, feedback nudges, and candidate updates.'],
                ['Security alerts', 'Notify admins for suspicious sessions and permission changes.'],
                ['Theme personalization', 'Persist dark mode, accent preferences, and workspace density.'],
              ].map(([title, detail], index) => (
                <label key={title} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <span><span className="block font-black text-slate-950 dark:text-white">{title}</span><span className="mt-1 block text-sm leading-6 text-slate-500">{detail}</span></span>
                  <input type="checkbox" defaultChecked={index < 2} className="mt-1 h-5 w-5 rounded" />
                </label>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm leading-6 text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
            <KeyRound className="mt-1 shrink-0 text-cyan-400" size={18} />
            <p>Profile identity and permissions remain connected to the existing HRMS authentication system. This page changes UI preferences only.</p>
          </div>
        </main>
      </section>
    </div>
  );
}
