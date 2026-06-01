import { useState } from 'react';
import Topbar from '../components/Topbar';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState('');
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    if (!employeeId) return;
    const response = await api.get(`/api/attendance/history/${employeeId}`);
    setHistory(response.data);
  };

  const checkIn = async () => {
    try {
      await api.post('/api/attendance/checkin', { employee_id: employeeId });
      toast.success('Checked in successfully');
      fetchHistory();
    } catch (error) {
      toast.error('Check-in failed');
    }
  };

  const checkOut = async () => {
    try {
      await api.post('/api/attendance/checkout', { employee_id: employeeId });
      toast.success('Checked out successfully');
      fetchHistory();
    } catch (error) {
      toast.error('Check-out failed');
    }
  };

  return (
    <div className="space-y-6">
      <Topbar title="Attendance" />
      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="premium-panel-strong p-5">
          <p className="metric-label">Clock in / out</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Attendance actions</h2>
          <div className="mt-5 space-y-4">
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Employee ID"
              className="premium-input w-full"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <button onClick={checkIn} className="premium-button bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-bold text-white shadow-lg shadow-cyan-500/20">
                Check in
              </button>
              <button onClick={checkOut} className="premium-button bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white/10">
                Check out
              </button>
            </div>
            <button onClick={fetchHistory} className="premium-button w-full border border-slate-200/80 px-5 py-3 text-slate-600 hover:border-violet-400 dark:border-white/10 dark:text-slate-300">
              Load attendance history
            </button>
          </div>
        </div>

        <div className="premium-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">Recent attendance</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Timeline</h2>
            </div>
            <span className="premium-chip">{history.length} records</span>
          </div>
          <div className="mt-5 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-white/10">No attendance data yet.</div>
            ) : (
              history.map((entry, index) => (
                <div key={index} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{entry.date}</span>
                    <span>{entry.check_in} - {entry.check_out || 'In progress'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
