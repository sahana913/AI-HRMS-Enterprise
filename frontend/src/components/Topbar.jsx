import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Command,
  FileSearch,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ROLE_META, getRoleHome, hasPermission, normalizeRole } from '../utils/auth';

const notificationIcons = {
  ats: ShieldCheck,
  interview: Clock3,
  ai: Sparkles,
  leave: CheckCircle2,
};

export default function Topbar({ title }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const user = auth?.user || {};
  const [openPanel, setOpenPanel] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantData, setAssistantData] = useState(null);
  const unread = notifications.filter((item) => item.unread).length;
  const breadcrumb = useMemo(() => ['Workspace', title].filter(Boolean), [title]);
  const role = normalizeRole(user.role || 'employee');
  const roleLabel = ROLE_META[role]?.label || role;
  const home = getRoleHome(role);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await api.get('/api/notifications/');
        setNotifications(Array.isArray(response.data) ? response.data.map((item) => ({
          ...item,
          title: item.title || item.message || 'Notification',
          body: item.body || item.message || '',
          time: item.created_at || '',
          unread: Boolean(item.unread),
          icon: notificationIcons[item.type] || Bell,
        })) : []);
      } catch (error) {
        console.error(error);
        setNotifications([]);
      }
    };
    loadNotifications();
  }, []);

  const toggleTheme = () => {
    window.dispatchEvent(new Event('hrms:toggle-theme'));
  };

  const openSettings = (tab) => {
    setOpenPanel(null);
    navigate(`${home}/settings#${tab}`);
  };

  const openAssistant = async () => {
    const nextOpen = openPanel === 'assistant' ? null : 'assistant';
    setOpenPanel(nextOpen);
    if (nextOpen !== 'assistant' || assistantData) return;

    setAssistantLoading(true);
    try {
      const [summaryResult, candidatesResult, interviewsResult] = await Promise.allSettled([
        api.get('/api/analytics/summary'),
        hasPermission(role, 'candidates:manage') || hasPermission(role, 'applications:own') ? api.get('/api/candidates/') : Promise.resolve({ data: [] }),
        hasPermission(role, 'interviews:manage') ? api.get('/api/interviews/list') : Promise.resolve({ data: [] }),
      ]);
      const summary = summaryResult.status === 'fulfilled' ? summaryResult.value.data : {};
      const candidates = candidatesResult.status === 'fulfilled' && Array.isArray(candidatesResult.value.data) ? candidatesResult.value.data : [];
      const interviews = interviewsResult.status === 'fulfilled' && Array.isArray(interviewsResult.value.data) ? interviewsResult.value.data : [];
      const topCandidate = [...candidates].sort((a, b) => Number(b.resume_score || b.score || 0) - Number(a.resume_score || a.score || 0))[0];

      setAssistantData({
        summary,
        candidates,
        interviews,
        topCandidate,
      });
    } catch (error) {
      console.error(error);
      setAssistantData({ summary: {}, candidates: [], interviews: [] });
    } finally {
      setAssistantLoading(false);
    }
  };

  const assistantActions = [
    ['Open ATS', `${home}/ats`, 'ats:manage', 'bg-blue-600 text-white'],
    ['Schedule', `${home}/interviews`, 'interviews:manage', 'bg-slate-950 text-white'],
    ['Screen resume', `${home}/screening`, role === 'candidate' ? 'ai:candidate' : 'ai:screen', 'bg-slate-100 text-slate-700'],
  ].filter(([, , permission]) => hasPermission(role, permission));

  return (
    <div className="sticky top-0 z-20 -mx-3 mb-5 border-b border-slate-200 bg-white/86 px-3 py-3 text-slate-950 backdrop-blur-2xl sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 xl:-mx-6 xl:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            {breadcrumb.map((item, index) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className={index === breadcrumb.length - 1 ? 'text-blue-600' : ''}>{item}</span>
                {index < breadcrumb.length - 1 && <span className="text-slate-400">/</span>}
              </span>
            ))}
            <span className="premium-chip border-blue-200 bg-blue-50 text-blue-700">{roleLabel}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
            <span className="premium-chip">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
              Live workspace
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <label className="relative min-w-[230px] flex-1 xl:max-w-md">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input className="premium-input h-10 w-full pl-10 pr-16" placeholder="Search people, resumes, candidates..." />
            <span className="absolute right-2 top-2 hidden items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400 md:flex">
              <Command size={12} /> K
            </span>
          </label>

          <div className="relative">
          <button onClick={openAssistant} className="premium-button h-10 bg-slate-950 px-3.5 text-white shadow-lg shadow-slate-300/60 hover:bg-blue-700">
            <Bot size={17} /> <span className="hidden sm:inline">AI assistant</span>
          </button>
            <AnimatePresence>
              {openPanel === 'assistant' && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="absolute right-0 mt-3 w-[min(92vw,420px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-300/50 backdrop-blur-2xl">
                  <div className="border-b border-slate-200 p-4">
                    <p className="text-sm font-black text-slate-950">AI assistant</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Live workspace guidance from your HRMS data.</p>
                  </div>
                  <div className="space-y-3 p-4">
                    {assistantLoading ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Reading workspace signals...</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ['Candidates', assistantData?.summary?.candidates || 0],
                            ['Interviews', assistantData?.summary?.interviews || 0],
                            ['ATS avg', `${assistantData?.summary?.ats_average || 0}%`],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                              <p className="text-lg font-black text-slate-950">{value}</p>
                              <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Recommended next step</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {assistantData?.topCandidate
                              ? `${assistantData.topCandidate.candidate_name || assistantData.topCandidate.name || 'Top candidate'} has the highest ATS score. Review or schedule from the ATS pipeline.`
                              : 'No candidates are available yet. Screen a resume to create live ATS records.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {assistantActions.map(([label, path, , classes]) => (
                            <button key={path} onClick={() => { setOpenPanel(null); navigate(path); }} className={`premium-button ${classes}`}>{label}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button onClick={() => setOpenPanel(openPanel === 'notifications' ? null : 'notifications')} className="premium-button relative h-10 w-10 bg-slate-100 p-0 text-slate-600 hover:bg-slate-200" aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#0B1020]">{unread}</span>}
            </button>
            <AnimatePresence>
              {openPanel === 'notifications' && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="absolute right-0 mt-3 w-[min(92vw,390px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-300/50 backdrop-blur-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-black text-slate-950">Notification center</p>
                    <p className="text-xs text-slate-500">{unread} unread real-time alerts</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">Live</span>
                </div>
                <div className="max-h-[420px] overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No real notifications yet.</div>
                    ) : notifications.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id} className="flex gap-3 rounded-lg p-3 transition hover:bg-slate-50">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.unread ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold text-slate-950">{item.title}</p>
                              {item.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{item.body}</p>
                            <p className="mt-2 text-[11px] font-semibold text-slate-400">{item.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={toggleTheme} className="premium-button h-10 w-10 bg-slate-100 p-0 text-slate-600 hover:bg-slate-200" aria-label="Toggle theme">
            <Sun size={18} />
          </button>

          <div className="relative">
            <button onClick={() => setOpenPanel(openPanel === 'profile' ? null : 'profile')} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 pl-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-black text-white">
                {user.name ? user.name[0].toUpperCase() : <User size={16} />}
              </div>
              <span className="hidden max-w-28 truncate lg:inline">{user.name || 'User'}</span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            <AnimatePresence>
              {openPanel === 'profile' && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="absolute right-0 mt-3 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-300/50 backdrop-blur-2xl">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-black text-slate-950">{user.name || 'User'}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                    <div className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-blue-700">
                      {roleLabel}
                    </div>
                  </div>
                  <button onClick={() => openSettings('account')} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-950">
                    <Settings size={17} /> Account settings
                  </button>
                  <button onClick={() => openSettings('audit')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-950">
                    <FileSearch size={17} /> Audit activity
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
