import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileSearch,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';

function MetricCard({ title, value, icon: Icon, detail, trend, tone = 'violet', delay = 0 }) {
  const tones = {
    cyan: 'from-cyan-400/18 to-blue-500/8 text-cyan-300',
    emerald: 'from-emerald-400/18 to-cyan-500/8 text-emerald-300',
    violet: 'from-violet-500/20 to-blue-500/8 text-violet-300',
    amber: 'from-amber-400/18 to-orange-500/8 text-amber-300',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="premium-panel group overflow-hidden p-4">
      <div className={`relative min-h-32 rounded-2xl bg-gradient-to-br ${tones[tone]} p-4`}>
        <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem] bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div className="rounded-xl bg-white/80 p-2 text-slate-950 shadow-sm dark:bg-slate-950/60 dark:text-current">
            <Icon size={19} />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[11px] font-bold text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
            <ArrowUpRight size={12} /> {trend}
          </span>
        </div>
        <p className="relative mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
        <div className="relative mt-1 flex items-end justify-between gap-3">
          <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          <p className="max-w-32 text-right text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ employees: 0, candidates: 0, shortlisted: 0, interviews: 0, attendance_today: 0, ats_average: 0, resume_profiles: 0 });
  const [interviews, setInterviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get('/api/analytics/summary');
        setStats(response.data);
        const [interviewResponse, notificationResponse] = await Promise.allSettled([
          api.get('/api/interviews/list'),
          api.get('/api/notifications/'),
        ]);
        if (interviewResponse.status === 'fulfilled') setInterviews(interviewResponse.value.data || []);
        if (notificationResponse.status === 'fulfilled') setNotifications(notificationResponse.value.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const attendanceData = useMemo(() => {
    const today = new Date().toLocaleDateString(undefined, { weekday: 'short' });
    return [{ day: today, value: stats.attendance_today || 0 }];
  }, [stats.attendance_today]);

  const hiringData = useMemo(() => [
    { month: 'Current', hires: stats.shortlisted || 0, ats: stats.ats_average || 0 },
  ], [stats.shortlisted, stats.ats_average]);

  const schedule = useMemo(() => interviews.slice(0, 3).map((item) => ({
    role: item.candidate_name || `Candidate ${item.candidate_id || ''}`.trim(),
    person: item.interviewer,
    time: item.interview_date ? new Date(item.interview_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set',
    mode: item.mode,
  })), [interviews]);

  const activities = useMemo(() => notifications.slice(0, 4).map((item) => [
    item.title || item.type || 'Notification',
    item.message || item.body || '',
    item.created_at || '',
  ]), [notifications]);

  const funnel = useMemo(() => [
    { name: 'Applications', value: Number(stats.candidates || 0), fill: '#7C3AED' },
    { name: 'ATS qualified', value: Number(stats.shortlisted || 0), fill: '#3B82F6' },
    { name: 'Interviews', value: Number(stats.interviews || 0), fill: '#06B6D4' },
  ], [stats]);

  const distribution = useMemo(() => [
    { name: 'Shortlisted', value: Number(stats.shortlisted || 0), fill: '#06B6D4' },
    { name: 'Review', value: Math.max(Number(stats.candidates || 0) - Number(stats.shortlisted || 0), 0), fill: '#7C3AED' },
    { name: 'Interviewing', value: Number(stats.interviews || 0), fill: '#3B82F6' },
  ], [stats]);
  const hasFunnelData = funnel.some((item) => item.value > 0);
  const hasDistributionData = distribution.some((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <Topbar title="Executive Dashboard" />

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="premium-panel overflow-hidden p-5">
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <p className="metric-label">AI command center</p>
                <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-slate-950 dark:text-white">Operate hiring, workforce signals, and ATS quality from one intelligent workspace.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Live analytics from your HRMS backend with recruiter-ready alerts, candidate scoring, and operational visibility.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['AI matches', stats.shortlisted, Bot],
                  ['Interviews', stats.interviews, Clock3],
                  ['ATS avg', `${stats.ats_average || 0}%`, TrendingUp],
                ].map(([label, value, Icon]) => (
                  <div key={label} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <Icon className="text-violet-500 dark:text-cyan-300" size={18} />
                    <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.09)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">ATS health</p>
                  <p className="mt-2 text-5xl font-black">{stats.ats_average || 0}%</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <FileSearch size={24} />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={attendanceData} margin={{ top: 24, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heroGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#06B6D4" fill="url(#heroGlow)" strokeWidth={3} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-500">
                <span>Screen</span>
                <span>Qualify</span>
                <span>Interview</span>
              </div>
            </div>
          </div>
        </div>

        <div className="premium-panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-500/10 p-2 text-violet-500 dark:text-violet-300"><Sparkles size={20} /></div>
            <div>
              <p className="metric-label">AI insights</p>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Recruiting signal</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              `${stats.resume_profiles || 0} resume profiles stored`,
              `${stats.interviews || 0} interviews scheduled`,
              `${stats.shortlisted || 0} candidates shortlisted`,
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-400/10 text-xs font-black text-cyan-500">{index + 1}</span>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {loading ? [...Array(4)].map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-white/70 dark:bg-white/[0.05]" />) : (
          <>
            <MetricCard title="Employees" value={stats.employees} icon={Users} detail="Active workforce" trend="Live" tone="cyan" />
            <MetricCard title="Candidates" value={stats.candidates} icon={BriefcaseBusiness} detail="AI processed" trend="Live" tone="violet" delay={0.04} />
            <MetricCard title="Shortlisted" value={stats.shortlisted} icon={CheckCircle2} detail="Recruiter ready" trend="Live" tone="emerald" delay={0.08} />
            <MetricCard title="Interviews" value={stats.interviews} icon={CalendarClock} detail={`${stats.resume_profiles || 0} profiles`} trend="Live" tone="amber" delay={0.12} />
          </>
        )}
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.25fr_0.82fr_0.72fr]">
        <div className="premium-panel p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Hiring velocity</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Monthly hires and ATS quality</h2>
            </div>
            <span className="premium-chip"><TrendingUp size={14} /> MongoDB</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hiringData} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
              <Bar dataKey="hires" fill="#06B6D4" radius={[10, 10, 0, 0]} />
              <Bar dataKey="ats" fill="#7C3AED" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Recruitment funnel</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Pipeline conversion</h2>
          {hasFunnelData ? (
            <ResponsiveContainer width="100%" height={280}>
              <FunnelChart>
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Funnel dataKey="value" data={funnel} isAnimationActive>
                  <LabelList position="right" fill="#94a3b8" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <div className="mt-5 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400 dark:border-white/10">No recruitment funnel data yet.</div>
          )}
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Candidate mix</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Active distribution</h2>
          {hasDistributionData ? (
            <ResponsiveContainer width="100%" height={255}>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={5}>
                  {distribution.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="mt-5 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400 dark:border-white/10">No candidate mix data yet.</div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.78fr_0.78fr]">
        <div className="premium-panel p-5">
          <p className="metric-label">Attendance intelligence</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Weekly presence</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={attendanceData} margin={{ top: 10, right: 10, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="presenceGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="url(#presenceGlow)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Interview schedule</p>
          <div className="mt-5 space-y-3">
            {schedule.map((item) => (
              <div key={`${item.role}-${item.time}`} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{item.role}</p>
                  <span className="text-xs font-bold text-cyan-500">{item.time}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.person}</p>
                <p className="mt-3 inline-flex rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-500 dark:text-violet-300">{item.mode}</p>
              </div>
            ))}
            {schedule.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400 dark:border-white/10">No interviews scheduled yet.</div>}
          </div>
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Recent activity</p>
          <div className="mt-5 space-y-3">
            {activities.map(([title, body, time]) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">{time}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400 dark:border-white/10">No real activity yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
