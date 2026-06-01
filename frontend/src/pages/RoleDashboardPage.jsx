import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  FileSpreadsheet,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Mail,
  Palette,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserCog,
  Users,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ROLE_DASHBOARD_CARDS, ROLE_META, ROLE_NAVIGATION, ROLES, getRoleHome, hasPermission, normalizeRole } from '../config/roles';

const emptyStats = {
  employees: 0,
  candidates: 0,
  shortlisted: 0,
  interviews: 0,
  attendance_today: 0,
  ats_average: 0,
  resume_profiles: 0,
  notifications: 0,
  payroll: 0,
  forecast: '0%',
  productivity: 0,
  open_tasks: 0,
  open_jobs: 0,
  leave_balance: '0d',
  salary: 0,
  performance: '0%',
  job_matches: 0,
  resume_strength: 0,
  secure: '0 alerts',
  roles: 0,
  audit_events: 0,
  security_alerts: 0,
  blocked_alerts: 0,
  report_exports: 0,
  project_progress: 0,
  source_analytics: [],
  department_performance: [],
  recruitment_trends: [],
  attendance_analytics: [],
  payroll_analytics: [],
};

function DashboardMetric({ label, value, Icon, detail, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="premium-panel p-4"
    >
      <div className="flex min-h-32 flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-xl bg-white p-2 text-violet-600 shadow-sm dark:bg-slate-950/70 dark:text-cyan-300">
            <Icon size={19} />
          </div>
          <span className="premium-chip border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            Live
          </span>
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{label}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

const adminModules = [
  [UserCog, 'User Management', 'Create users, assign roles, deactivate accounts, reset passwords, and bulk import identities.', ['Create user', 'Assign roles', 'Bulk import']],
  [Building2, 'Organization Management', 'Model departments, branches, teams, reporting lines, and company structure.', ['Departments', 'Branches', 'Teams']],
  [Bot, 'AI Workforce Analytics', 'Track hiring trends, employee growth, retention risk, and department performance.', ['Hiring trends', 'Retention', 'Performance']],
  [ShieldAlert, 'Security Center', 'Review login activity, audit logs, suspicious access, and permission changes.', ['Audit logs', 'Suspicious access', 'Permissions']],
  [ServerCog, 'System Configuration', 'Tune AI model settings, notifications, email templates, and workspace themes.', ['AI models', 'Templates', 'Themes']],
  [FileSpreadsheet, 'Reports Center', 'Export hiring, attendance, workforce, and analytics reports to PDF or Excel.', ['PDF reports', 'Excel exports', 'Attendance']],
];

const hrModules = [
  [Bot, 'AI Resume Screening', 'Batch screen resumes, extract skills, score fit, and generate hiring recommendations.', 'Launch screening'],
  [GitBranch, 'ATS Dashboard', 'Operate candidate stages with a drag-and-drop recruitment Kanban.', 'Open pipeline'],
  [Users, 'Candidate Pipeline', 'Rank best candidates, inspect gaps, and move decisions forward.', 'Review candidates'],
  [Building2, 'Job Management', 'Plan roles, departments, openings, and hiring priorities.', 'Manage jobs'],
  [Mail, 'Interview Management', 'Coordinate panels, reminders, scorecards, and interview stages.', 'Schedule loops'],
  [Bell, 'HR Notifications', 'Track applications, shortlist alerts, interviews, leave approvals, and hiring events.', 'View alerts'],
];

const heroPanelClass = 'overflow-hidden rounded-lg border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.09)]';
const heroKickerClass = 'text-xs font-black uppercase tracking-[0.22em] text-blue-600';
const heroCopyClass = 'mt-3 max-w-2xl text-sm leading-7 text-slate-600';
const heroActionClass = 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-950 px-3.5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700';

function AdminDashboard({ stats, quickActions }) {
  const trend = (stats.recruitment_trends || []).map((item) => ({
    month: item.period || item.month || 'Current',
    hiring: Number(item.count || 0),
    employees: Number(stats.employees || 0),
  }));
  const security = [
    { name: 'Normal', value: Math.max(Number(stats.employees || 0) - Number(stats.security_alerts || 0), 0), fill: '#06B6D4' },
    { name: 'Review', value: Math.max(Number(stats.security_alerts || 0) - Number(stats.blocked_alerts || 0), 0), fill: '#F59E0B' },
    { name: 'Blocked', value: Number(stats.blocked_alerts || 0), fill: '#F43F5E' },
  ];
  const hasTrendData = trend.some((item) => item.hiring > 0 || item.employees > 0);
  const hasSecurityData = security.some((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <Topbar title="Enterprise Admin Console" />
      <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className={heroPanelClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={heroKickerClass}>Admin intelligence layer</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">AI workforce governance, security, and operating control.</h1>
              <p className={heroCopyClass}>Manage the organization, permission model, analytics, reporting, and platform configuration from a single enterprise admin surface.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Users', stats.employees || 0],
                ['Roles', stats.roles || 0],
                ['Alerts', stats.security_alerts || 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-[11px] font-bold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {quickActions.slice(0, 3).map((item) => (
              <Link key={item.path} to={item.path} className="group rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50">
                <item.icon className="text-blue-600" size={20} />
                <p className="mt-3 text-sm font-black">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.permission}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="premium-panel p-5">
          <div className="flex items-center justify-between">
            <div><p className="metric-label">Security center</p><h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Access health</h2></div>
            <span className="premium-chip"><Fingerprint size={14} /> Live audit</span>
          </div>
          {hasSecurityData ? (
            <ResponsiveContainer width="100%" height={235}>
              <PieChart>
                <Pie data={security} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={5}>
                  {security.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No security events have been recorded yet.</EmptyAnalytics>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[
          ['Active users', stats.employees || 0, Users, 'Employees and platform accounts'],
          ['Hiring demand', stats.candidates || 0, Bot, 'Candidates under AI review'],
          ['Audit events', stats.audit_events || 0, ShieldCheck, 'Recent security and role actions'],
          ['Report exports', stats.report_exports || 0, FileSpreadsheet, 'PDF and Excel packages'],
        ].map(([label, value, Icon, detail], index) => <DashboardMetric key={label} label={label} value={value} Icon={Icon} detail={detail} index={index} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">AI workforce analytics</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Hiring, growth, and retention</h2></div><span className="premium-chip">Animated</span></div>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trend} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <defs><linearGradient id="adminHiring" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} /><stop offset="95%" stopColor="#06B6D4" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.28} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Area type="monotone" dataKey="employees" stroke="#7C3AED" fill="url(#adminHiring)" strokeWidth={3} />
                <Area type="monotone" dataKey="hiring" stroke="#06B6D4" fill="url(#adminHiring)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No workforce trend records are available yet.</EmptyAnalytics>
          )}
        </div>
        <div className="grid gap-3">
          {adminModules.map(([Icon, title, body, chips]) => (
            <div key={title} className="premium-panel p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-cyan-300"><Icon size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{chips.map((chip) => <span key={chip} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-white/[0.07]">{chip}</span>)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HrDashboard({ stats, quickActions }) {
  const funnel = [
    { name: 'Applied', value: Number(stats.candidates || 0), fill: '#7C3AED' },
    { name: 'Screening', value: Math.max(Number(stats.candidates || 0) - Number(stats.shortlisted || 0), 0), fill: '#3B82F6' },
    { name: 'Shortlisted', value: Number(stats.shortlisted || 0), fill: '#06B6D4' },
    { name: 'Interviews', value: Number(stats.interviews || 0), fill: '#059669' },
  ];
  const hasFunnelData = funnel.some((item) => item.value > 0);
  const sources = Array.isArray(stats.source_analytics) ? stats.source_analytics : [];
  const hasSources = sources.some((item) => Number(item.candidates || 0) > 0 || Number(item.conversion || 0) > 0);

  return (
    <div className="space-y-6">
      <Topbar title="HR Talent Command" />
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={heroPanelClass}>
          <p className={heroKickerClass}>Premium ATS workspace</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">Recruit, screen, interview, onboard, and operate HR workflows with AI assistance.</h1>
          <p className={heroCopyClass}>A Greenhouse/Lever-style command layer for batch screening, candidate pipeline movement, hiring analytics, onboarding, leave approvals, attendance, and HR notifications.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quickActions.slice(0, 4).map((item) => <Link key={item.path} to={item.path} className={heroActionClass}><item.icon size={16} /> {item.label}</Link>)}
          </div>
        </div>
        <div className="premium-panel p-5">
          <p className="metric-label">Hiring funnel</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Recruitment conversion</h2>
          {hasFunnelData ? (
            <ResponsiveContainer width="100%" height={270}>
              <FunnelChart><Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} /><Funnel dataKey="value" data={funnel} isAnimationActive /></FunnelChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No candidate pipeline data has been stored yet.</EmptyAnalytics>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[
          ['Uploaded resumes', stats.resume_profiles || stats.candidates || 0, Upload, 'Batch intake volume'],
          ['Shortlisted', stats.shortlisted || 0, CheckCircle2, 'AI recommended candidates'],
          ['Offer acceptance', `${stats.offer_acceptance_rate || 0}%`, Mail, 'Accepted offers over total offers'],
          ['Time to hire', `${stats.time_to_hire || 0}d`, Bot, 'Average candidate cycle time'],
        ].map(([label, value, Icon, detail], index) => <DashboardMetric key={label} label={label} value={value} Icon={Icon} detail={detail} index={index} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">Source analytics</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Candidate source and conversion</h2></div><span className="premium-chip"><Database size={14} /> ATS data</span></div>
          {hasSources ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sources} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.28} />
                <XAxis dataKey="source" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Bar dataKey="candidates" fill="#7C3AED" radius={[10, 10, 0, 0]} />
                <Bar dataKey="conversion" fill="#06B6D4" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No source analytics found in MongoDB yet.</EmptyAnalytics>
          )}
        </div>
        <div className="grid gap-3">
          {hrModules.map(([Icon, title, body, action]) => (
            <div key={title} className="premium-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-600 dark:text-cyan-300"><Icon size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-white/[0.07] sm:inline">{action}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmployeeDashboard({ stats, quickActions }) {
  const productivity = (stats.attendance_analytics || []).map((item) => ({
    day: item.period || item.month || 'Current',
    hours: Number(item.count || 0),
  }));
  const growth = Array.isArray(stats.skill_gaps) ? stats.skill_gaps : [];
  const readiness = Number(stats.resume_strength || stats.ats_average || 0);

  return (
    <div className="space-y-6">
      <Topbar title="Employee Workspace" />
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={heroPanelClass}>
          <p className={heroKickerClass}>Modern employee portal</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">Your HR, productivity, career, and resume workspace.</h1>
          <p className={heroCopyClass}>Manage attendance, leave, payroll, documents, internal communication, profile identity, and AI-powered career growth from one clean workspace.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quickActions.slice(0, 5).map((item) => <Link key={item.path} to={item.path} className={heroActionClass}><item.icon size={16} /> {item.label}</Link>)}
          </div>
        </div>
        <div className="premium-panel p-5">
          <div className="flex items-center justify-between"><div><p className="metric-label">Career assistant</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Promotion readiness</h2></div><span className="premium-chip"><Bot size={14} /> AI</span></div>
          <div className="mt-5 grid grid-cols-[140px_1fr] gap-5">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-4xl font-black text-slate-950">{readiness}%</div>
            <div className="space-y-3">
              {[
                `${stats.resume_profiles || 0} resume profiles stored`,
                `${growth.length} skill gaps identified`,
                `${stats.notifications || 0} unread HR notifications`,
                `${stats.open_tasks || 0} assigned project tasks`,
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-black text-cyan-500">{index + 1}</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[
          ['Attendance', stats.attendance_today || 'Ready', CalendarClock, 'Check-in/out and working hours'],
          ['Leave requests', stats.leave_requests || 0, ClipboardList, 'Requests, balances, approval tracking'],
          ['Payroll', `$${Number(stats.payroll || 0).toLocaleString()}`, FileSpreadsheet, 'Salary slips, tax, bonuses, deductions'],
          ['Learning', `${stats.learning_progress || 0}%`, FileText, 'Training and growth progress'],
        ].map(([label, value, Icon, detail], index) => <DashboardMetric key={label} label={label} value={value} Icon={Icon} detail={detail} index={index} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">Productivity analytics</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Working hours and focus signals</h2></div><span className="premium-chip">Live</span></div>
          {productivity.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={productivity} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <defs><linearGradient id="employeeFocus" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} /><stop offset="95%" stopColor="#06B6D4" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.28} />
                <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Area type="monotone" dataKey="hours" stroke="#06B6D4" fill="url(#employeeFocus)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No attendance history is available for this workspace yet.</EmptyAnalytics>
          )}
        </div>
        <div className="premium-panel p-5">
          <p className="metric-label">Skill-gap analysis</p>
          <div className="mt-5 space-y-4">
            {growth.length ? growth.map((item) => (
              <div key={item.skill || item.name}>
                <div className="mb-2 flex justify-between text-xs font-bold text-slate-500"><span>{item.skill || item.name}</span><span>{Number(item.value || item.score || 0)}%</span></div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Number(item.value || item.score || 0)}%` }} /></div>
              </div>
            )) : <EmptyAnalytics>No skill-gap records are stored yet.</EmptyAnalytics>}
          </div>
        </div>
      </section>
    </div>
  );
}

function ActivityHeatmap({ data = [], summary = {} }) {
  const max = Math.max(...data.map((item) => Number(item.count || 0)), 0);
  if (!data.length) {
    return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No candidate activity has been recorded yet.</div>;
  }
  const weeklyTotal = (summary.weekly || []).reduce((total, item) => total + Number(item.count || 0), 0);
  const monthlyTotal = (summary.monthly || []).reduce((total, item) => total + Number(item.count || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-10 gap-2">
        {data.map((item) => {
          const count = Number(item.count || 0);
          const opacity = max ? Math.max(0.12, count / max) : 0.08;
          return (
            <div key={item.date} title={`${item.date}: ${count} events`} className="aspect-square rounded-md border border-slate-200 bg-blue-600" style={{ opacity }} />
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ['30-day events', data.reduce((total, item) => total + Number(item.count || 0), 0)],
          ['Weekly activity', weeklyTotal],
          ['Monthly activity', monthlyTotal],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-lg font-black text-slate-950">{value}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyAnalytics({ children }) {
  return <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</div>;
}

function SeniorManagerDashboard({ stats, quickActions }) {
  const delivery = (stats.project_trends || stats.recruitment_trends || []).map((item) => ({
    week: item.period || item.month || 'Current',
    productivity: Number(item.count || 0),
    progress: Number(stats.project_progress || 0),
  }));
  const resourceAllocation = (stats.department_performance || []).map((item) => ({
    team: item.department || item.name || 'Department',
    capacity: Number(item.performance || item.headcount || 0),
  }));

  return (
    <div className="space-y-6">
      <Topbar title="Senior Manager Workspace" />
      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className={heroPanelClass}>
          <p className={heroKickerClass}>Leadership execution layer</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">Plan capacity, approve work, track goals, and predict team productivity.</h1>
          <p className={heroCopyClass}>A manager-first cockpit for team management, goal tracking, resource allocation, leave approvals, project health, and hiring requests.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quickActions.slice(0, 5).map((item) => <Link key={item.path} to={item.path} className={heroActionClass}><item.icon size={16} /> {item.label}</Link>)}
          </div>
        </div>
        <div className="premium-panel p-5">
          <div className="flex items-center justify-between"><div><p className="metric-label">AI productivity forecast</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Next sprint confidence</h2></div><span className="premium-chip"><Bot size={14} /> Predictive</span></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-[132px_1fr]">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 text-4xl font-black text-white">{stats.productivity || stats.project_progress || 0}%</div>
            <div className="space-y-3">
              {[
                `${stats.open_tasks || 0} open project tasks`,
                `${stats.leave_requests || 0} leave requests in scope`,
                `${stats.project_progress || 0}% project progress`,
                `${stats.candidates || 0} hiring requests or candidates in demand`,
              ].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[
          ['Team productivity', `${stats.productivity || stats.project_progress || 0}%`, BarChart3, 'Output, focus, and delivery quality'],
          ['Team attendance', stats.attendance_today || 0, CalendarClock, 'Today availability'],
          ['Goal completion', `${stats.goal_completion || 0}%`, ClipboardList, 'Team OKR and goal completion'],
          ['Project progress', `${stats.project_progress || 0}%`, GitBranch, 'Sprint completion'],
        ].map(([label, value, Icon, detail], index) => <DashboardMetric key={label} label={label} value={value} Icon={Icon} detail={detail} index={index} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">Performance trends</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Productivity and project progress</h2></div><span className="premium-chip">Manager analytics</span></div>
          {delivery.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={delivery} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false} opacity={0.7} />
                <XAxis dataKey="week" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(15,23,42,0.12)' }} />
                <Area type="monotone" dataKey="productivity" stroke="#2563EB" fill="#bfdbfe" strokeWidth={3} />
                <Area type="monotone" dataKey="progress" stroke="#059669" fill="#bbf7d0" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No project trend data is available yet.</EmptyAnalytics>
          )}
        </div>
        <div className="premium-panel p-5">
          <p className="metric-label">Resource allocation</p>
          <div className="mt-5 space-y-3">
            {resourceAllocation.length ? resourceAllocation.map(({ team, capacity }) => (
              <div key={team} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm font-black text-slate-950"><span>{team}</span><span>{capacity}%</span></div>
                <div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${capacity}%` }} /></div>
              </div>
            )) : <EmptyAnalytics>No department allocation records are stored yet.</EmptyAnalytics>}
          </div>
        </div>
      </section>
    </div>
  );
}

function CandidateDashboard({ quickActions }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadCandidateAnalytics = async () => {
      try {
        const response = await api.get('/api/candidate/dashboard-analytics');
        if (mounted) setAnalytics(response.data);
      } catch (error) {
        console.error('Candidate analytics failed', error);
        if (mounted) setAnalytics(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadCandidateAnalytics();
    const interval = setInterval(loadCandidateAnalytics, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const liveStats = analytics?.stats || {};
  const ats = analytics?.ats || {};
  const pipeline = analytics?.pipeline || [];
  const jobMatches = analytics?.job_matches || [];
  const aiAnalytics = analytics?.ai_analytics || {};
  const interviews = analytics?.interviews || {};
  const activitySummary = analytics?.activity_summary || {};
  const hasPipeline = pipeline.some((item) => Number(item.value || 0) > 0);
  const hasJobMatches = jobMatches.length > 0;

  return (
    <div className="space-y-6">
      <Topbar title="Candidate Career Platform" />
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={heroPanelClass}>
          <p className={heroKickerClass}>Premium application portal</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">Build resumes, analyze ATS fit, match jobs, and prepare for interviews.</h1>
          <p className={heroCopyClass}>A candidate-facing AI career platform for applications, saved roles, resume enhancement, interview tracking, and hiring probability guidance.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quickActions.slice(0, 5).map((item) => <Link key={item.path} to={item.path} className={heroActionClass}><item.icon size={16} /> {item.label}</Link>)}
          </div>
        </div>
        <div className="premium-panel p-5">
          <p className="metric-label">Application tracking</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Pipeline status</h2>
          {loading ? (
            <EmptyAnalytics>Loading real pipeline data...</EmptyAnalytics>
          ) : hasPipeline ? (
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie data={pipeline} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={5}>
                  {pipeline.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(15,23,42,0.12)', color: '#0f172a' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No applications have reached the recruitment pipeline yet.</EmptyAnalytics>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[
          ['ATS score', `${liveStats.ats_score || 0}%`, Target, 'Latest stored resume analysis'],
          ['Job matches', liveStats.job_matches || 0, Sparkles, 'Database-driven recommended roles'],
          ['Saved jobs', liveStats.saved_jobs || 0, CheckCircle2, 'Stored saved job records'],
          ['Interviews', liveStats.upcoming_interviews || 0, Mail, `${liveStats.completed_interviews || 0} completed`],
        ].map(([label, value, Icon, detail], index) => <DashboardMetric key={label} label={label} value={value} Icon={Icon} detail={detail} index={index} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">AI job matching</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Match and hiring probability</h2></div><span className="premium-chip"><Bot size={14} /> Predictive</span></div>
          {loading ? (
            <EmptyAnalytics>Loading job matching data...</EmptyAnalytics>
          ) : hasJobMatches ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={jobMatches} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                <XAxis dataKey="role" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(15,23,42,0.12)', color: '#0f172a' }} />
                <Bar dataKey="match" fill="#2563EB" radius={[10, 10, 0, 0]} />
                <Bar dataKey="probability" fill="#06B6D4" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No matching open jobs found from stored job and resume data.</EmptyAnalytics>
          )}
        </div>
        <div className="premium-panel p-5">
          <p className="metric-label">Real ATS intelligence</p>
          <div className="mt-5 space-y-3">
            {[
              ['Resume strength', `${ats.resume_strength || 0}%`],
              ['Recruiter visibility', `${ats.recruiter_visibility || 0}%`],
              ['Semantic score', `${ats.semantic_score || 0}%`],
              ['Keyword match', `${ats.keyword_match || 0}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {(ats.improvement_tips || []).length ? ats.improvement_tips.slice(0, 3).map((tip) => (
              <div key={tip} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">{tip}</div>
            )) : <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Run an ATS scan to store improvement tips.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">Activity heatmap</p><h2 className="text-lg font-black text-slate-950">Daily candidate activity</h2></div><span className="premium-chip">Database</span></div>
          <ActivityHeatmap data={analytics?.heatmap || []} summary={activitySummary} />
        </div>
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">AI analytics engine</p><h2 className="text-lg font-black text-slate-950">Career competitiveness</h2></div><span className="premium-chip"><Sparkles size={14} /> Live</span></div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Hiring probability', `${aiAnalytics.hiring_probability || 0}%`],
              ['Market score', `${aiAnalytics.market_competitiveness || 0}%`],
              ['Skill gaps', aiAnalytics.skill_gap_count || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {(aiAnalytics.career_recommendations || []).length ? aiAnalytics.career_recommendations.map((item) => (
              <div key={item} className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-800">{item}</div>
            )) : <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Upload a resume or submit applications to generate AI recommendations.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="premium-panel p-5">
          <p className="metric-label">Matched skills and gaps</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Matched skills</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(ats.matched_skills || []).length ? ats.matched_skills.map((skill) => <span key={skill} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700">{skill}</span>) : <span className="text-sm text-slate-500">No parsed skills yet.</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Missing keywords</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(ats.missing_keywords || []).length ? ats.missing_keywords.map((keyword) => <span key={keyword} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-700">{keyword}</span>) : <span className="text-sm text-slate-500">No keyword gaps recorded.</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="premium-panel p-5">
          <p className="metric-label">Interview readiness</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ['Upcoming', (interviews.upcoming || []).length],
              ['Completed', interviews.completed || 0],
              ['Feedback pending', interviews.feedback_pending || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {(interviews.upcoming || []).length ? interviews.upcoming.map((item) => (
              <div key={item.id || item.candidate_id || item.interview_date} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">{item.interview_date || 'Interview date pending'}</p>
                <p className="mt-1 text-xs text-slate-500">{item.mode || 'Mode not set'} {item.feedback ? '- Feedback available' : '- Feedback pending'}</p>
              </div>
            )) : <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No upcoming interviews found in MongoDB.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function ManagementAdminDashboard({ stats, quickActions }) {
  const hiringTrend = (stats.recruitment_trends || []).map((item) => ({
    month: item.period || item.month || 'Current',
    candidates: Number(item.count || 0),
    shortlisted: Math.round(Number(item.count || 0) * 0.35),
  }));
  const deptData = (stats.department_performance || []).slice(0, 6).map((item) => ({
    name: item.department || item.name || 'Dept',
    headcount: Number(item.headcount || item.count || 0),
  }));
  const hasTrend = hiringTrend.some((i) => i.candidates > 0);
  const hasDept = deptData.some((i) => i.headcount > 0);

  return (
    <div className="space-y-6">
      <Topbar title="Executive Analytics Command" />
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={heroPanelClass}>
          <p className={heroKickerClass}>Management intelligence layer</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">Company performance, workforce analytics, and executive reporting.</h1>
          <p className={heroCopyClass}>Access company-wide analytics, hiring performance, employee metrics, budget approvals, and AI-powered workforce forecasting from a single executive surface.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quickActions.slice(0, 4).map((item) => <Link key={item.path} to={item.path} className={heroActionClass}><item.icon size={16} /> {item.label}</Link>)}
          </div>
        </div>
        <div className="premium-panel p-5">
          <div className="flex items-center justify-between"><div><p className="metric-label">Executive KPIs</p><h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Company health</h2></div><span className="premium-chip"><BarChart3 size={14} /> Live</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ['Employees', stats.employees || 0],
              ['Candidates', stats.candidates || 0],
              ['Attrition %', `${stats.attrition_rate || 0}%`],
              ['Offer rate', `${stats.offer_acceptance_rate || 0}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p>
                <p className="text-xs font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[
          ['Total employees', stats.employees || 0, Users, 'Company-wide headcount'],
          ['Hiring pipeline', stats.candidates || 0, BriefcaseBusiness, 'Active candidates'],
          ['Goal completion', `${stats.goal_completion || 0}%`, Target, 'Team OKR progress'],
          ['Monthly payroll', `$${Number(stats.payroll || 0).toLocaleString()}`, FileSpreadsheet, 'Current payroll cost'],
        ].map(([label, value, Icon, detail], index) => <DashboardMetric key={label} label={label} value={value} Icon={Icon} detail={detail} index={index} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
        <div className="premium-panel p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="metric-label">Hiring analytics</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Recruitment trends</h2></div><span className="premium-chip">6 months</span></div>
          {hasTrend ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hiringTrend} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <defs><linearGradient id="mgmtHiring" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Area type="monotone" dataKey="candidates" stroke="#7C3AED" fill="url(#mgmtHiring)" strokeWidth={3} name="Candidates" />
                <Area type="monotone" dataKey="shortlisted" stroke="#06B6D4" fill="none" strokeWidth={2} name="Shortlisted" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No hiring trend data available yet.</EmptyAnalytics>
          )}
        </div>
        <div className="premium-panel p-5">
          <p className="metric-label">Department headcount</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Workforce distribution</h2>
          {hasDept ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Bar dataKey="headcount" fill="#06B6D4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalytics>No department data available yet.</EmptyAnalytics>
          )}
        </div>
      </section>
    </div>
  );
}

export default function RoleDashboardPage({ role: routeRole }) {
  const { user } = useAuth();
  const role = normalizeRole(routeRole || user?.role);
  const meta = ROLE_META[role] || ROLE_META.employee;
  const home = getRoleHome(role);
  const [stats, setStats] = useState(emptyStats);

  useEffect(() => {
    const loadDashboard = async () => {
      const [summaryResult, notificationsResult, biResult, projectResult] = await Promise.allSettled([
        api.get('/api/analytics/summary'),
        api.get('/api/notifications/'),
        api.get('/api/bi/dashboard'),
        api.get('/api/projects/board'),
      ]);

      const summary = summaryResult.status === 'fulfilled' ? summaryResult.value.data : {};
      const bi = biResult.status === 'fulfilled' ? biResult.value.data : {};
      const projectSummary = projectResult.status === 'fulfilled' ? projectResult.value.data?.summary || {} : {};
      const notifications = notificationsResult.status === 'fulfilled' && Array.isArray(notificationsResult.value.data)
        ? notificationsResult.value.data.length
        : 0;

      setStats({
        ...emptyStats,
        ...summary,
        ...(bi.kpis || {}),
        notifications,
        ats_average: bi.kpis?.average_ats ?? summary.ats_average ?? 0,
        forecast: `${bi.workforce_forecasting?.projected_headcount || 0}`,
        payroll: bi.kpis?.monthly_payroll || 0,
        open_tasks: projectSummary.open_tasks || 0,
        project_progress: projectSummary.progress || 0,
        productivity: bi.kpis?.team_productivity ?? projectSummary.progress ?? 0,
        active_employees: bi.kpis?.active_employees || 0,
        new_hires: bi.kpis?.new_hires || 0,
        attrition_rate: bi.kpis?.attrition_rate || 0,
        goal_completion: bi.kpis?.goal_completion || 0,
        learning_progress: bi.kpis?.learning_progress || 0,
        offer_acceptance_rate: bi.kpis?.offer_acceptance_rate || 0,
        time_to_hire: bi.kpis?.time_to_hire || 0,
        source_analytics: bi.source_analytics || [],
        department_performance: bi.department_performance || [],
        recruitment_trends: bi.recruitment_trends || [],
        attendance_analytics: bi.attendance_analytics || [],
        payroll_analytics: bi.payroll_analytics || [],
        project_trends: bi.project_trends || [],
        leave_requests: bi.kpis?.leave_requests || 0,
        roles: bi.kpis?.roles || 0,
        audit_events: bi.kpis?.audit_events || 0,
        security_alerts: bi.kpis?.security_alerts || 0,
        blocked_alerts: bi.kpis?.blocked_alerts || 0,
        report_exports: bi.kpis?.report_exports || 0,
        secure: `${bi.kpis?.security_alerts || 0} alerts`,
      });
    };

    loadDashboard();
  }, []);

  const cards = useMemo(
    () => (ROLE_DASHBOARD_CARDS[role] || []).filter((card) => hasPermission(role, card[4])),
    [role]
  );

  const quickActions = useMemo(
    () =>
      (ROLE_NAVIGATION[role] || [])
        .flatMap((section) => section.items)
        .filter((item) => item.path !== home)
        .slice(0, 5),
    [home, role]
  );

  const workflowData = useMemo(
    () => [
      { name: 'Employees', value: Number(stats.employees || 0) },
      { name: 'Candidates', value: Number(stats.candidates || 0) },
      { name: 'Shortlist', value: Number(stats.shortlisted || 0) },
      { name: 'Interviews', value: Number(stats.interviews || 0) },
    ],
    [stats]
  );

  const HeroIcon = meta.icon || Sparkles;

  if (role === ROLES.superAdmin) {
    return <AdminDashboard stats={stats} quickActions={quickActions} />;
  }

  if (role === ROLES.managementAdmin) {
    return <ManagementAdminDashboard stats={stats} quickActions={quickActions} />;
  }

  if (role === ROLES.seniorManager) {
    return <SeniorManagerDashboard stats={stats} quickActions={quickActions} />;
  }

  if (role === ROLES.hrRecruiter) {
    return <HrDashboard stats={stats} quickActions={quickActions} />;
  }

  if (role === ROLES.employee) {
    return <EmployeeDashboard stats={stats} quickActions={quickActions} />;
  }

  if (role === ROLES.candidate) {
    return <CandidateDashboard stats={stats} quickActions={quickActions} />;
  }

  return (
    <div className="space-y-6">
      <Topbar title={meta.title} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.09)]">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              <LockKeyhole size={14} /> {meta.label} workspace
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">{meta.title}</h1>
            <p className={heroCopyClass}>{meta.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {quickActions.slice(0, 3).map((item) => (
                <Link key={item.path} to={item.path} className={heroActionClass}>
                  <item.icon size={16} /> {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Permission boundary</p>
                <p className="mt-2 text-5xl font-black">{ROLE_NAVIGATION[role]?.reduce((count, section) => count + section.items.length, 0) || 0}</p>
                <p className="mt-1 text-sm text-slate-500">Allowed navigation surfaces</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-600 text-white">
                <HeroIcon size={28} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {['JWT', 'RBAC', 'Audit'].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-black text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {cards.map(([label, key, Icon, detail], index) => (
          <DashboardMetric key={label} label={label} value={stats[key]} Icon={Icon} detail={detail} index={index} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="premium-panel p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">Role analytics</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{meta.label} visibility model</h2>
            </div>
            <span className="premium-chip"><Bot size={14} /> AI signals</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workflowData} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
              <Bar dataKey="value" fill="#06B6D4" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Allowed workflows</p>
          <div className="mt-5 space-y-3">
            {quickActions.map((item) => (
              <Link key={item.path} to={item.path} className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/60 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-cyan-300">
                    <item.icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-slate-950 dark:text-white">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.permission}</span>
                  </span>
                </span>
                <ArrowRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-400" />
              </Link>
            ))}
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="mb-2" size={18} />
              Direct URL access outside this role redirects back to this dashboard.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
