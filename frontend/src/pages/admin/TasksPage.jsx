import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { CheckSquare, Plus, Edit2, Trash2, Clock, User } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

const statusColors = {
  Backlog: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  'In Progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  Review: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  Done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
};

const priorityColors = {
  High: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  Low: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', status: 'Backlog', priority: 'Medium', owner: '', due_date: '' });

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await api.get('/api/projects/tasks');
        setTasks(response.data || []);
      } catch (error) {
        console.error(error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('Task title required');
      return;
    }

    try {
      if (editing) {
        await api.put(`/api/projects/tasks/${editing._id}`, form);
        toast.success('Task updated');
      } else {
        await api.post('/api/projects/tasks', form);
        toast.success('Task created');
      }
      setForm({ title: '', status: 'Backlog', priority: 'Medium', owner: '', due_date: '' });
      setEditing(null);
      const response = await api.get('/api/projects/tasks');
      setTasks(response.data || []);
    } catch (error) {
      toast.error('Operation failed');
      console.error(error);
    }
  };

  const handleEdit = (task) => {
    setEditing(task);
    setForm({
      title: task.title,
      status: task.status,
      priority: task.priority,
      owner: task.owner,
      due_date: task.due_date,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/api/projects/tasks/${id}`);
      toast.success('Task deleted');
      setTasks(tasks.filter(t => t._id !== id));
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const filtered = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.owner?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || task.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: tasks.length,
    Backlog: tasks.filter(t => t.status === 'Backlog').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    Review: tasks.filter(t => t.status === 'Review').length,
    Done: tasks.filter(t => t.status === 'Done').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Topbar title="Task Management" icon={CheckSquare} />
        <p className="text-center text-slate-500">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar title="Task Management" icon={CheckSquare} />

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Tasks List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="premium-input w-full"
              />
              <div className="flex gap-2 flex-wrap">
                {['all', 'Backlog', 'In Progress', 'Review', 'Done'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`premium-chip capitalize transition-all ${
                      filter === status
                        ? 'bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950'
                        : 'border-slate-200/50 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02]'
                    }`}
                  >
                    {status} ({statusCounts[status]})
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-white/10">
                    <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Title</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Priority</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Owner</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Due</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-950 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((task, idx) => (
                      <motion.tr
                        key={task._id}
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-slate-200/30 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{task.title}</td>
                        <td className="px-4 py-3">
                          <span className={`premium-chip capitalize ${statusColors[task.status]}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`premium-chip capitalize ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            {task.owner.split('@')[0]}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(task)}
                              className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-500/10 dark:text-blue-300"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(task._id)}
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            <p className="metric-label">{editing ? 'Edit task' : 'Add task'}</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              {editing ? 'Update task' : 'Create task'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Task title"
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
                  <option value="Backlog">Backlog</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Priority</span>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="premium-input mt-2 w-full"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Owner</span>
                <input
                  type="email"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  placeholder="owner@company.com"
                  className="premium-input mt-2 w-full"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Due Date</span>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="premium-input mt-2 w-full"
                />
              </label>

              <button
                type="submit"
                className="w-full premium-button bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
              >
                {editing ? 'Update Task' : 'Create Task'}
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({ title: '', status: 'Backlog', priority: 'Medium', owner: '', due_date: '' });
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
