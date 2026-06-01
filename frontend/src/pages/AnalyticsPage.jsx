import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, LabelList, Line, LineChart as ReLineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Bot, BriefcaseBusiness, Building2, Download, FileSpreadsheet, Flame, Layers3, Search, Target, TrendingUp, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import api from '../services/api';

const colors = ['#2563EB', '#06B6D4', '#059669', '#F59E0B', '#E11D48', '#7C3AED'];

function Metric({ label, value, detail, icon: Icon, delay = 0, onClick }) {
  return (
    <motion.button type="button" onClick={onClick} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="premium-panel p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-blue-600/10 p-2 text-blue-600 dark:text-cyan-300"><Icon size={19} /></div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-black text-emerald-600">Live</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </motion.button>
  );
}

function EmptyAnalytics({ children }) {
  return <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10">{children}</div>;
}

function Heatmap({ data = [] }) {
  const max = Math.max(...data.map((item) => Number(item.count || 0)), 0);
  if (!data.length) return <EmptyAnalytics>No analytics activity has been recorded yet.</EmptyAnalytics>;
  return (
    <div className="grid grid-cols-10 gap-2">
      {data.map((item) => {
        const count = Number(item.count || 0);
        return (
          <div key={item.date} title={`${item.date}: ${count} events`} className="aspect-square rounded-md border border-slate-200 bg-blue-600 dark:border-white/10" style={{ opacity: max ? Math.max(0.12, count / max) : 0.08 }} />
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState({ employees: 0, candidates: 0, shortlisted: 0, interviews: 0, attendance_today: 0, ats_average: 0 });
  const [bi, setBi] = useState(null);
  const [drilldown, setDrilldown] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryResponse, biResponse] = await Promise.all([
          api.get('/api/analytics/summary'),
          api.get('/api/bi/dashboard'),
        ]);
        setSummary(summaryResponse.data);
        setBi(biResponse.data);
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Failed to load BI dashboard');
      }
    };
    load();
    const handleRealtime = () => load();
    window.addEventListener('hrms:realtime', handleRealtime);
    return () => window.removeEventListener('hrms:realtime', handleRealtime);
  }, []);

  const kpis = bi?.kpis || {};
  const hiringFunnel = bi?.hiring_analytics?.funnel || [];
  const atsDistribution = bi?.ats_distribution || [];
  const departments = bi?.department_distribution || [];
  const recruiterPerformance = bi?.recruiter_performance || [];
  const attendanceTrends = bi?.attendance_analytics || [];
  const performanceTrends = bi?.manager_analytics?.performance_trends || bi?.project_trends || [];
  const payrollTrends = bi?.payroll_analytics || [];
  const heatmap = bi?.heatmap || [];
  const forecast = bi?.workforce_forecasting || {};

  const adminTrend = useMemo(() => (bi?.recruitment_trends || []).map((item, index) => ({
    month: item.month,
    hiring: item.count,
    payroll: payrollTrends[index]?.count || 0,
    attendance: attendanceTrends[index]?.count || 0,
  })), [bi, payrollTrends, attendanceTrends]);

  const exportReport = async (format, section = 'summary') => {
    const response = await api.get(`/api/bi/export?format=${format}&section=${section}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hrms-bi-${section}.${format === 'pdf' ? 'pdf' : 'xls'}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${format.toUpperCase()} export generated`);
  };

  const openDrilldown = async (section) => {
    try {
      const response = await api.get(`/api/bi/drilldown/${section}?limit=50`);
      setDrilldown(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Drilldown is not available for your role');
    }
  };

  return (
    <div className="space-y-6">
      <Topbar title="Enterprise Business Intelligence" />

      <section className="premium-panel overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="metric-label text-blue-600">Power BI style command center</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Real-time HRMS intelligence across workforce, recruiting, payroll, goals, and learning.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">All cards and charts are backed by MongoDB collections through backend APIs. Empty charts show no-data states instead of mock values.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportReport('pdf')} className="premium-button bg-slate-950 text-white"><Download size={16} /> Export PDF</button>
            <button onClick={() => exportReport('excel')} className="premium-button bg-blue-600 text-white"><FileSpreadsheet size={16} /> Export Excel</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-6">
        <Metric label="Total Employees" value={kpis.employees ?? summary.employees ?? 0} icon={Users} detail="MongoDB employees collection" onClick={() => openDrilldown('employees')} />
        <Metric label="Active Employees" value={kpis.active_employees ?? 0} icon={Activity} detail="Active employee records" delay={0.03} onClick={() => openDrilldown('employees')} />
        <Metric label="New Hires" value={kpis.new_hires ?? 0} icon={BriefcaseBusiness} detail="Last 30 days" delay={0.06} onClick={() => openDrilldown('employees')} />
        <Metric label="Attrition Rate" value={`${kpis.attrition_rate ?? 0}%`} icon={Flame} detail="Leave and rejection risk signal" delay={0.09} />
        <Metric label="Payroll Costs" value={`$${Number(kpis.payroll_costs || 0).toLocaleString()}`} icon={FileSpreadsheet} detail="Latest payroll period" delay={0.12} onClick={() => openDrilldown('payroll')} />
        <Metric label="Forecast Headcount" value={forecast.projected_headcount ?? 0} icon={Bot} detail="AI workforce projection" delay={0.15} />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.15fr_0.85fr_0.8fr]">
        <div className="premium-panel p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="metric-label">Admin analytics</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Payroll, hiring, and attendance trends</h2></div><button onClick={() => exportReport('excel', 'summary')} className="premium-chip"><FileSpreadsheet size={14} /> Excel</button></div>
          {adminTrend.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={adminTrend} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Area type="monotone" dataKey="hiring" stroke="#2563EB" fill="#bfdbfe" strokeWidth={3} />
                <Area type="monotone" dataKey="attendance" stroke="#06B6D4" fill="#a5f3fc" strokeWidth={2} />
                <Area type="monotone" dataKey="payroll" stroke="#059669" fill="#bbf7d0" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyAnalytics>No admin trend data exists yet.</EmptyAnalytics>}
        </div>

        <div className="premium-panel p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="metric-label">Department distribution</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Headcount by department</h2></div><button onClick={() => openDrilldown('employees')} className="premium-chip"><Search size={14} /> Drill</button></div>
          {departments.some((item) => Number(item.count || 0) > 0) ? (
            <ResponsiveContainer width="100%" height={290}>
              <PieChart>
                <Pie data={departments} dataKey="count" nameKey="department" innerRadius={58} outerRadius={96} paddingAngle={4}>
                  {departments.map((entry, index) => <Cell key={entry.department} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyAnalytics>No department distribution exists yet.</EmptyAnalytics>}
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Forecasting</p>
          <div className="mt-5 space-y-3">
            {[
              ['Current headcount', forecast.current_headcount || 0],
              ['Projected headcount', forecast.projected_headcount || 0],
              ['Next 30 days', forecast.next_30_days || 0],
              ['Attrition risk', `${forecast.attrition_risk || 0}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="premium-panel p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="metric-label">HR analytics</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Hiring funnel</h2></div><button onClick={() => exportReport('pdf', 'hiring')} className="premium-chip"><Download size={14} /> PDF</button></div>
          {hiringFunnel.some((item) => Number(item.count || 0) > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Funnel dataKey="count" data={hiringFunnel} isAnimationActive><LabelList position="right" fill="#94a3b8" stroke="none" dataKey="stage" /></Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : <EmptyAnalytics>No hiring funnel records exist yet.</EmptyAnalytics>}
        </div>

        <div className="premium-panel p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="metric-label">ATS distribution</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Score quality bands</h2></div><button onClick={() => openDrilldown('ats')} className="premium-chip"><Layers3 size={14} /> Drill</button></div>
          {atsDistribution.some((item) => Number(item.count || 0) > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={atsDistribution} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="range" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyAnalytics>No ATS score distribution exists yet.</EmptyAnalytics>}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="premium-panel p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="metric-label">Recruiter performance</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Productivity, conversion, and throughput</h2></div><button onClick={() => exportReport('excel', 'recruiters')} className="premium-chip"><FileSpreadsheet size={14} /> Excel</button></div>
          {recruiterPerformance.length ? (
            <ResponsiveContainer width="100%" height={310}>
              <BarChart data={recruiterPerformance} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="recruiter" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Bar dataKey="candidates" fill="#7C3AED" radius={[8, 8, 0, 0]} />
                <Bar dataKey="shortlisted" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                <Bar dataKey="conversion" fill="#059669" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyAnalytics>No recruiter performance records exist yet.</EmptyAnalytics>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['Offer Acceptance Rate', `${kpis.offer_acceptance_rate || 0}%`, Target],
            ['Time To Hire', `${kpis.time_to_hire || 0}d`, TrendingUp],
            ['Team Productivity', `${kpis.team_productivity || 0}%`, Activity],
            ['Goal Completion', `${kpis.goal_completion || 0}%`, Bot],
          ].map(([label, value, Icon]) => (
            <div key={label} className="premium-panel p-5">
              <Icon className="text-blue-600" size={22} />
              <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr_0.7fr]">
        <div className="premium-panel p-5">
          <p className="metric-label">Manager analytics</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Attendance and performance trends</h2>
          {(attendanceTrends.length || performanceTrends.length) ? (
            <ResponsiveContainer width="100%" height={310}>
              <ReLineChart data={attendanceTrends.map((item, index) => ({ month: item.month, attendance: item.count, performance: performanceTrends[index]?.count || 0 }))} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }} />
                <Line type="monotone" dataKey="attendance" stroke="#06B6D4" strokeWidth={3} />
                <Line type="monotone" dataKey="performance" stroke="#059669" strokeWidth={3} />
              </ReLineChart>
            </ResponsiveContainer>
          ) : <EmptyAnalytics>No manager trend records exist yet.</EmptyAnalytics>}
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Employee analytics</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Personal KPIs and learning progress</h2>
          <div className="mt-5 space-y-4">
            {[
              ['Personal attendance records', bi?.employee_analytics?.personal_kpis?.attendance || 0],
              ['Personal goals', bi?.employee_analytics?.personal_kpis?.goals || 0],
              ['Learning progress', `${bi?.employee_analytics?.learning_progress || 0}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-xs font-bold text-slate-500"><span>{label}</span><span>{value}</span></div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, Number.parseFloat(value) || 0)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Activity heatmap</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">30-day analytics activity</h2>
          <div className="mt-5"><Heatmap data={heatmap} /></div>
        </div>
      </section>

      {drilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[82vh] w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
              <div><p className="metric-label">Drill down analytics</p><h2 className="text-lg font-black text-slate-950 dark:text-white">{drilldown.section}</h2></div>
              <button onClick={() => setDrilldown(null)} className="premium-button bg-slate-950 text-white">Close</button>
            </div>
            <div className="max-h-[62vh] overflow-auto p-4">
              {drilldown.rows?.length ? (
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900">
                    <tr>{Object.keys(drilldown.rows[0]).slice(0, 8).map((key) => <th key={key} className="px-3 py-2">{key}</th>)}</tr>
                  </thead>
                  <tbody>
                    {drilldown.rows.map((row) => (
                      <tr key={row.id || JSON.stringify(row)} className="border-b border-slate-100 dark:border-white/10">
                        {Object.keys(drilldown.rows[0]).slice(0, 8).map((key) => <td key={key} className="px-3 py-2 text-slate-600 dark:text-slate-300">{Array.isArray(row[key]) ? row[key].join(', ') : String(row[key] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyAnalytics>No drilldown rows are available.</EmptyAnalytics>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
