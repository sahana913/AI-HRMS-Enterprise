import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

export default function SecurityPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await api.get('/api/admin/security/alerts');
        setAlerts(Array.isArray(response.data) ? response.data : response.data?.alerts || []);
      } catch (error) {
        console.error(error);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    loadAlerts();
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      await api.patch(`/api/admin/security/alerts/${id}`, { status: 'acknowledged' });
      setAlerts(alerts.map(alert =>
        (alert._id || alert.id) === id ? { ...alert, status: 'acknowledged' } : alert
      ));
      toast.success('Alert acknowledged');
    } catch (error) {
      toast.error('Could not acknowledge alert');
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/api/admin/security/alerts/${id}`, { status: 'resolved' });
      setAlerts(alerts.map(alert =>
        (alert._id || alert.id) === id ? { ...alert, status: 'resolved' } : alert
      ));
      toast.success('Alert resolved');
    } catch (error) {
      toast.error('Could not resolve alert');
    }
  };

  const filtered = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'active') return alert.status === 'active';
    if (filter === 'acknowledged') return alert.status === 'acknowledged';
    return true;
  });

  const severityColors = {
    critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/30 dark:border-rose-900/30',
    high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200/30 dark:border-orange-900/30',
    medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/30 dark:border-amber-900/30',
    low: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/30 dark:border-blue-900/30',
  };

  const severityBadges = {
    critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    high: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    low: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  };

  const statusIcons = {
    active: <AlertCircle size={16} className="text-rose-600 dark:text-rose-300" />,
    acknowledged: <Clock size={16} className="text-amber-600 dark:text-amber-300" />,
    resolved: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Topbar title="Security Management" icon={ShieldAlert} />
        <p className="text-center text-slate-500">Loading security alerts...</p>
      </div>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;
  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      <Topbar title="Security Management" icon={ShieldAlert} />

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Overall Status</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <p className="font-black text-slate-950 dark:text-white">Secure</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active Alerts</p>
            <p className={`mt-3 text-2xl font-black ${activeCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {activeCount}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Critical Issues</p>
            <p className={`mt-3 text-2xl font-black ${criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {criticalCount}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Last Updated</p>
            <p className="mt-3 font-black text-slate-950 dark:text-white">Just now</p>
          </div>
        </motion.div>
      </div>

      {/* Alerts List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-panel"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['all', 'active', 'acknowledged'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`premium-chip capitalize transition-all ${
                  filter === status
                    ? 'bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950'
                    : 'border-slate-200/50 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <div className="space-y-3">
            {filtered.length > 0 ? (
              filtered.map((alert, idx) => (
                <motion.div
                  key={alert._id || alert.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`rounded-xl border p-4 ${severityColors[alert.severity]}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{statusIcons[alert.status]}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-950 dark:text-white">{alert.title}</h4>
                          <span className={`premium-chip text-xs capitalize ${severityBadges[alert.severity]}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">
                          {alert.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledge(alert._id || alert.id)}
                          className="px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 text-xs font-semibold transition-all"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(alert._id || alert.id)}
                        className="px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 text-xs font-semibold transition-all"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 py-8">No security alerts</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="premium-panel"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="font-black text-slate-950 dark:text-white">Security Settings</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/50 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Two-Factor Authentication</span>
              <span className="premium-chip bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/50 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">IP Whitelist</span>
              <span className="premium-chip bg-blue-500/10 text-blue-600 dark:text-blue-300">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/50 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Session Timeout</span>
              <span className="premium-chip bg-slate-200/50 text-slate-700 dark:bg-white/10 dark:text-slate-300">60 min</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
