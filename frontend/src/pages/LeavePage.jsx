import { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function LeavePage() {
  const [leave, setLeave] = useState({ employee_id: '', leave_type: 'Annual', start_date: '', end_date: '', reason: '' });
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const response = await api.get('/api/leave/history');
      setHistory(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/api/leave/apply', leave);
      toast.success('Leave request submitted');
      setLeave({ ...leave, reason: '' });
      loadHistory();
    } catch (error) {
      toast.error('Unable to submit leave request');
    }
  };

  return (
    <div className="space-y-6">
      <Topbar title="Leave Management" />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="premium-panel-strong p-5">
          <p className="metric-label">Apply leave</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Request workflow</h2>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {['employee_id', 'start_date', 'end_date', 'reason'].map((field) => (
              <label key={field} className="block text-sm font-semibold text-slate-500">
                {field.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                <input
                  className="premium-input mt-2 w-full"
                  name={field}
                  value={leave[field]}
                  type={field.includes('date') ? 'date' : 'text'}
                  onChange={(e) => setLeave({ ...leave, [field]: e.target.value })}
                  required
                />
              </label>
            ))}
            <label className="block text-sm font-semibold text-slate-500">
              Leave type
              <select
                className="premium-input mt-2 w-full"
                value={leave.leave_type}
                onChange={(e) => setLeave({ ...leave, leave_type: e.target.value })}
              >
                <option value="Annual">Annual</option>
                <option value="Sick">Sick</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </label>
            <button className="premium-button w-full bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 font-bold text-white shadow-lg shadow-violet-500/20">
              Submit request
            </button>
          </form>
        </div>
        <div className="premium-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">Leave history</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Request queue</h2>
            </div>
            <span className="premium-chip">{history.length} requests</span>
          </div>
          <div className="mt-5 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-white/10">No leave requests yet.</div>
            ) : (
              history.map((record, index) => (
                <div key={index} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                  <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>{record.leave_type}</span>
                    <span>{record.status}</span>
                  </div>
                  <p className="mt-3 text-base font-black text-slate-950 dark:text-white">{record.start_date} to {record.end_date}</p>
                  <p className="mt-2 text-sm text-slate-500">{record.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
