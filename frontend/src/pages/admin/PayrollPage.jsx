import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

export default function PayrollPage() {
  const [payrollData, setPayrollData] = useState(null);
  const [payrollChartData, setPayrollChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayroll = async () => {
      try {
        const response = await api.get('/api/admin/payroll/summary');
        setPayrollData(response.data);
        setPayrollChartData(response.data?.period ? [{
          month: response.data.period,
          cost: response.data.monthly_cost || 0,
          employees: response.data.headcount || 0,
        }] : []);
      } catch (error) {
        toast.error('Failed to load payroll data');
        console.error(error);
        setPayrollData(null);
        setPayrollChartData([]);
      } finally {
        setLoading(false);
      }
    };
    loadPayroll();
  }, []);

  const metrics = [
    {
      label: 'Monthly Cost',
      value: `$${(payrollData?.monthly_cost || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-300',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Headcount',
      value: payrollData?.headcount || 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-300',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Average Salary',
      value: `$${(payrollData?.avg_salary || payrollData?.average_salary || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-300',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Forecast (Next)',
      value: `$${(payrollData?.forecast_next_month || 0).toLocaleString()}`,
      icon: Calendar,
      color: 'text-amber-600 dark:text-amber-300',
      bg: 'bg-amber-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Topbar title="Payroll Management" icon={DollarSign} />
        <p className="text-center text-slate-500">Loading payroll data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar title="Payroll Management" icon={DollarSign} />

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="premium-panel"
            >
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{metric.label}</p>
                    <p className={`mt-2 text-2xl font-black ${metric.color}`}>{metric.value}</p>
                  </div>
                  <div className={`${metric.bg} rounded-xl p-3 ${metric.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Cost Trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="font-black text-slate-950 dark:text-white">Monthly Cost Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={payrollChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="month" stroke="rgb(100,116,139)" />
                <YAxis stroke="rgb(100,116,139)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(100,116,139,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Headcount Trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="font-black text-slate-950 dark:text-white">Headcount Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={payrollChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="month" stroke="rgb(100,116,139)" />
                <YAxis stroke="rgb(100,116,139)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(100,116,139,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="employees" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Payroll Health */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="premium-panel"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="font-black text-slate-950 dark:text-white">Payroll Health Status</h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Budget Utilization</span>
                <span className="text-sm font-black text-emerald-600">{payrollData?.payroll_health || '0%'}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                  style={{ width: payrollData?.payroll_health || '0%' }}
                ></div>
              </div>
            </div>
            <div className="pt-4 text-sm text-slate-600 dark:text-slate-400">
              <p>• Salary budget is on track</p>
              <p>• All compliance requirements met</p>
              <p>• Tax calculations up to date</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
