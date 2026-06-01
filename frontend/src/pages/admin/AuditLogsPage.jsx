import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { BookOpen, Search, Download, Filter } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await api.get('/api/admin/audit-logs');
        setLogs(Array.isArray(response.data) ? response.data : response.data?.logs || []);
      } catch (error) {
        console.error(error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const actions = ['all', 'User Login', 'Role Created', 'Permission Modified', 'User Deleted', 'Failed Login Attempt'];

  const filtered = logs.filter(log => {
    const matchesSearch = log.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.resource?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Action', 'Actor', 'Resource', 'IP', 'Status'].join(','),
      ...filtered.map(log =>
        [
          new Date(log.timestamp).toLocaleString(),
          log.action,
          log.actor,
          log.resource,
          log.ip,
          log.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Logs exported');
  };

  const statusColors = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    failure: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Topbar title="Audit Logs" icon={BookOpen} />
        <p className="text-center text-slate-500">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar title="Audit Logs" icon={BookOpen} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-panel"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
          {/* Toolbar */}
          <div className="space-y-4">
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by actor or resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="premium-input w-full pl-9"
                />
              </div>
              <button
                onClick={handleExport}
                className="premium-button flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 sm:px-4"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>

            {/* Action Filter */}
            <div className="flex gap-2 flex-wrap">
              {actions.map(action => (
                <button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  className={`premium-chip capitalize transition-all ${
                    filterAction === action
                      ? 'bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950'
                      : 'border-slate-200/50 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02]'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-white/10">
                  <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Timestamp</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Action</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Actor</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Resource</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">IP Address</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((log, idx) => (
                    <motion.tr
                      key={log._id || log.id}
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-slate-200/30 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{log.action}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.actor}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="premium-chip bg-slate-200/50 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {log.resource}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{log.ip}</td>
                      <td className="px-4 py-3">
                        <span className={`premium-chip ${statusColors[log.status] || statusColors.warning}`}>
                          {log.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      No audit logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-6 flex gap-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Events</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{logs.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Success Rate</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">
                {Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Failed Events</p>
              <p className="mt-1 text-2xl font-black text-rose-600">
                {logs.filter(l => l.status === 'failure').length}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
