import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Building2, Plus, Edit2, Trash2, Check, X, Users } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', head: '', employees: '', budget: '' });

  const loadDepartments = async () => {
    try {
      const response = await api.get('/api/admin/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error(error);
      setDepartments([]);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.head.trim()) {
      toast.error('Department name and head are required');
      return;
    }

    setLoading(true);
    try {
      if (editing) {
        await api.put(`/api/admin/departments/${editing._id || editing.id}`, form);
        toast.success('Department updated');
      } else {
        await api.post('/api/admin/departments', form);
        toast.success('Department created');
      }
      setForm({ name: '', head: '', employees: '', budget: '' });
      setEditing(null);
      await loadDepartments();
    } catch (error) {
      toast.error('Operation failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept) => {
    setEditing(dept);
    setForm({
      name: dept.name,
      head: dept.head,
      employees: dept.employees,
      budget: dept.budget,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await api.delete(`/api/admin/departments/${id}`);
      toast.success('Department deleted');
      await loadDepartments();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setForm({ name: '', head: '', employees: '', budget: '' });
  };

  const totalEmployees = departments.reduce((sum, dept) => sum + (dept.employees || 0), 0);
  const totalBudget = departments.reduce((sum, dept) => sum + (dept.budget || 0), 0);

  return (
    <div className="space-y-6">
      <Topbar title="Department Management" icon={Building2} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Departments</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{departments.length}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Employees</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{totalEmployees}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Budget</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              ${(totalBudget / 1000000).toFixed(1)}M
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Departments List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">All Departments</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage organizational departments</p>

            <div className="mt-6 space-y-3">
              {departments.length > 0 ? (
                departments.map((dept, idx) => (
                  <motion.div
                    key={dept._id || dept.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white p-4 dark:border-white/5 dark:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-300">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-950 dark:text-white">{dept.name}</p>
                        <div className="mt-1 flex gap-4 text-xs text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {dept.employees} emp
                          </span>
                          <span>Head: {dept.head}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="rounded-lg bg-blue-500/10 p-2 text-blue-600 hover:bg-blue-500/20 dark:text-blue-300"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(dept._id || dept.id)}
                        className="rounded-lg bg-rose-500/10 p-2 text-rose-600 hover:bg-rose-500/20 dark:text-rose-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-sm text-slate-500 py-8">No departments configured</p>
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
            <p className="metric-label">{editing ? 'Edit dept' : 'Add dept'}</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              {editing ? 'Update department' : 'Create department'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Department Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Engineering"
                  className="premium-input mt-2 w-full"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Department Head</span>
                <input
                  type="text"
                  value={form.head}
                  onChange={(e) => setForm({ ...form, head: e.target.value })}
                  placeholder="e.g., Rajesh Kumar"
                  className="premium-input mt-2 w-full"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Employees</span>
                <input
                  type="number"
                  value={form.employees}
                  onChange={(e) => setForm({ ...form, employees: parseInt(e.target.value) || '' })}
                  placeholder="0"
                  className="premium-input mt-2 w-full"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Budget</span>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || '' })}
                  placeholder="0"
                  className="premium-input mt-2 w-full"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 premium-button flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
                >
                  <Check size={16} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 premium-button flex items-center justify-center gap-2 bg-slate-200 text-slate-950 hover:bg-slate-300 dark:bg-slate-700 dark:text-white"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
