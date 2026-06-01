import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Zap, Plus, Edit2, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

const statusColors = {
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200/30 dark:border-emerald-900/30',
  Planning: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-200/30 dark:border-blue-900/30',
  Review: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-200/30 dark:border-amber-900/30',
  Completed: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200/30 dark:border-slate-900/30',
};

const statusIcons = {
  Active: <Zap size={16} />,
  Planning: <Clock size={16} />,
  Review: <AlertCircle size={16} />,
  Completed: <CheckCircle2 size={16} />,
};

export default function SprintsPage() {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', status: 'Planning', start_date: '', end_date: '' });

  useEffect(() => {
    const loadSprints = async () => {
      try {
        const response = await api.get('/api/projects/sprints');
        setSprints(response.data || []);
      } catch (error) {
        console.error(error);
        setSprints([]);
      } finally {
        setLoading(false);
      }
    };
    loadSprints();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Sprint name required');
      return;
    }

    try {
      if (editing) {
        await api.put(`/api/projects/sprints/${editing._id}`, form);
        toast.success('Sprint updated');
      } else {
        await api.post('/api/projects/sprints', form);
        toast.success('Sprint created');
      }
      setForm({ name: '', status: 'Planning', start_date: '', end_date: '' });
      setEditing(null);
      // Reload sprints
      const response = await api.get('/api/projects/sprints');
      setSprints(response.data || []);
    } catch (error) {
      toast.error('Operation failed');
      console.error(error);
    }
  };

  const handleEdit = (sprint) => {
    setEditing(sprint);
    setForm({
      name: sprint.name,
      status: sprint.status,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sprint?')) return;
    try {
      await api.delete(`/api/projects/sprints/${id}`);
      toast.success('Sprint deleted');
      setSprints(sprints.filter(s => s._id !== id));
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const activeSprints = sprints.filter(s => s.status === 'Active');
  const totalTasks = sprints.reduce((sum, s) => sum + (s.tasks || 0), 0);
  const completedTasks = sprints.reduce((sum, s) => sum + (s.completed || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Topbar title="Sprint Management" icon={Zap} />
        <p className="text-center text-slate-500">Loading sprints...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar title="Sprint Management" icon={Zap} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Sprints</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{sprints.length}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{activeSprints.length}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Completion Rate</p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
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
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Tasks</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{totalTasks}</p>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Sprints List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">All Sprints</h3>

            <div className="mt-6 space-y-4">
              {sprints.length > 0 ? (
                sprints.map((sprint, idx) => (
                  <motion.div
                    key={sprint._id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-xl border p-4 ${statusColors[sprint.status]}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        {statusIcons[sprint.status]}
                        <div>
                          <h4 className="font-black text-slate-950 dark:text-white">{sprint.name}</h4>
                          <p className="text-xs mt-1 opacity-75">
                            {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(sprint)}
                          className="rounded-lg p-2 hover:bg-white/50 dark:hover:bg-slate-900/50 transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(sprint._id)}
                          className="rounded-lg p-2 hover:bg-white/50 dark:hover:bg-slate-900/50 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold">Progress</span>
                          <span className="text-xs font-black">{sprint.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200/50 dark:bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${sprint.progress}%` }}
                            transition={{ duration: 0.5 }}
                          ></motion.div>
                        </div>
                      </div>

                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-slate-200/50 dark:bg-white/5">
                          {sprint.completed}/{sprint.tasks} tasks
                        </span>
                        <span className={`px-2 py-1 rounded font-semibold capitalize ${
                          sprint.status === 'Active' ? 'bg-emerald-500/20' : 'bg-slate-200/50 dark:bg-white/5'
                        }`}>
                          {sprint.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-sm text-slate-500 py-8">No sprints created</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Add/Edit Form */}
        <motion.section
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="metric-label">{editing ? 'Edit sprint' : 'Add sprint'}</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              {editing ? 'Update sprint' : 'Create sprint'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Sprint Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Sprint name"
                  className="premium-input mt-2 w-full"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="premium-input mt-2 w-full"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Start Date</span>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="premium-input mt-2 w-full"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">End Date</span>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="premium-input mt-2 w-full"
                />
              </label>

              <button
                type="submit"
                className="w-full premium-button bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
              >
                {editing ? 'Update Sprint' : 'Create Sprint'}
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({ name: '', status: 'Planning', start_date: '', end_date: '' });
                  }}
                  className="w-full premium-button bg-slate-200 text-slate-950 hover:bg-slate-300 dark:bg-slate-700 dark:text-white"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
