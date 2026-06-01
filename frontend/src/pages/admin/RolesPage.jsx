import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Shield, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const loadRoles = async () => {
    try {
      const response = await api.get('/api/admin/roles');
      setRoles(response.data || []);
    } catch (error) {
      toast.error('Failed to load roles');
      console.error(error);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Role name required');
      return;
    }
    
    setLoading(true);
    try {
      if (editing) {
        // Update role
        await api.put(`/api/admin/roles/${editing._id || editing.id}`, form);
        toast.success('Role updated');
      } else {
        // Create role
        await api.post('/api/admin/roles', form);
        toast.success('Role created');
      }
      setForm({ name: '', description: '' });
      setEditing(null);
      await loadRoles();
    } catch (error) {
      toast.error('Operation failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await api.delete(`/api/admin/roles/${id}`);
      toast.success('Role deleted');
      await loadRoles();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (role) => {
    setEditing(role);
    setForm({ name: role.name || '', description: role.description || '' });
  };

  const handleCancel = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <Topbar title="Role Management" icon={Shield} />
      
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Enterprise Roles</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Configure system roles and permissions</p>
            
            <div className="mt-6 space-y-3">
              {roles.length > 0 ? (
                roles.map((role, idx) => (
                  <motion.div
                    key={role._id || role.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white p-4 dark:border-white/5 dark:bg-white/[0.02]"
                  >
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">{role.name}</p>
                      <p className="text-xs text-slate-500">{role.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(role)}
                        className="rounded-lg bg-blue-500/10 p-2 text-blue-600 hover:bg-blue-500/20 dark:text-blue-300"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(role._id || role.id)}
                        className="rounded-lg bg-rose-500/10 p-2 text-rose-600 hover:bg-rose-500/20 dark:text-rose-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-sm text-slate-500 py-8">No roles configured</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="premium-panel"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="metric-label">{editing ? 'Edit role' : 'Add role'}</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              {editing ? 'Update role details' : 'Create new role'}
            </h3>
            
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Role Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Manager"
                  className="premium-input mt-2 w-full"
                  required
                />
              </label>
              
              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Role description..."
                  className="premium-input mt-2 w-full"
                  rows="3"
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
