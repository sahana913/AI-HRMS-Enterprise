import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import api from '../services/api';

const MODULES = {
  organization: { title: 'Organization Management', module: 'organization', fields: ['name', 'type', 'leader', 'headcount', 'location', 'status'] },
  users: { title: 'User Management', module: 'users', fields: ['name', 'email', 'role', 'status', 'password'] },
  permissions: { title: 'Permission Management', module: 'permissions', fields: ['key', 'name', 'category', 'description', 'status'] },
  settings: { title: 'System Settings', module: 'settings', fields: ['key', 'value', 'category', 'status'] },
  teams: { title: 'Team Management', module: 'teams', fields: ['name', 'manager_email', 'department', 'members', 'status'] },
  workforce: { title: 'Workforce Planning', module: 'workforce-plans', fields: ['title', 'department', 'period', 'headcount_plan', 'hiring_need', 'status'] },
  performance: { title: 'Performance Reviews', module: 'performance-reviews', fields: ['employee', 'manager', 'cycle', 'score', 'feedback', 'status'] },
  resources: { title: 'Resource Allocation', module: 'resource-allocations', fields: ['employee', 'project', 'allocation_percent', 'start_date', 'end_date', 'status'] },
  budgets: { title: 'Budget Tracking', module: 'budgets', fields: ['department', 'period', 'amount', 'spent', 'owner', 'status'] },
  jobs: { title: 'Job Posting', module: 'jobs', fields: ['title', 'department', 'location', 'employment_type', 'status', 'description'] },
  offers: { title: 'Offer Management', module: 'offers', fields: ['candidate', 'role', 'package', 'stage', 'owner', 'status'] },
  profile: { title: 'Employee Profile', module: 'employee-profile', fields: ['name', 'email', 'phone', 'location', 'emergency_contact', 'status'] },
  attendanceCorrections: { title: 'Attendance Corrections', module: 'attendance-corrections', fields: ['date', 'reason', 'requested_in', 'requested_out', 'status'] },
  leaveBalances: { title: 'Leave Balances', module: 'leave-balances', fields: ['leave_type', 'available', 'used', 'pending', 'status'] },
  payslips: { title: 'Payroll Access', module: 'payslips', fields: ['period', 'gross', 'deductions', 'net', 'status'] },
  goals: { title: 'Performance Goals', module: 'goals', fields: ['title', 'metric', 'progress', 'due_date', 'manager', 'status'] },
  training: { title: 'Training Portal', module: 'training', fields: ['title', 'category', 'duration', 'progress', 'score', 'status'] },
  notificationsCrud: { title: 'Notifications Management', module: 'notifications', fields: ['title', 'message', 'type', 'read', 'status'] },
};

const blankFor = (fields) => Object.fromEntries(fields.map((field) => [field, '']));
const labelFor = (field) => field.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function EnterpriseCrudPage({ type }) {
  const config = MODULES[type] || MODULES.organization;
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankFor(config.fields));
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setForm(blankFor(config.fields));
    setEditingId('');
  }, [config.fields.join('|')]);

  const visibleFields = useMemo(() => config.fields.filter((field) => field !== 'password' || !editingId), [config.fields, editingId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/enterprise/${config.module}`);
      setItems(response.data?.items || []);
    } catch (error) {
      setItems([]);
      toast.error(error?.response?.data?.detail || `Unable to load ${config.title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [config.module]);

  const saveItem = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/enterprise/${config.module}/${editingId}`, form);
        toast.success('Record updated');
      } else {
        await api.post(`/api/enterprise/${config.module}`, form);
        toast.success('Record created');
      }
      setForm(blankFor(config.fields));
      setEditingId('');
      loadItems();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to save record');
    }
  };

  const editItem = (item) => {
    setEditingId(item.id || item._id);
    setForm({ ...blankFor(config.fields), ...Object.fromEntries(config.fields.map((field) => [field, item[field] ?? ''])) });
  };

  const deleteItem = async (item) => {
    const id = item.id || item._id;
    if (!id) return;
    try {
      await api.delete(`/api/enterprise/${config.module}/${id}`);
      toast.success('Record deleted');
      loadItems();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to delete record');
    }
  };

  return (
    <div className="space-y-6">
      <Topbar title={config.title} />

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Records', items.length],
          ['Active', items.filter((item) => String(item.status || '').toLowerCase() === 'active').length],
          ['Pending', items.filter((item) => String(item.status || '').toLowerCase() === 'pending').length],
          ['Completed', items.filter((item) => ['completed', 'approved', 'done'].includes(String(item.status || '').toLowerCase())).length],
        ].map(([label, value]) => (
          <div key={label} className="premium-panel p-4">
            <p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <form onSubmit={saveItem} className="premium-panel-strong p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">{editingId ? 'Update record' : 'Create record'}</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{config.title}</h2>
            </div>
            {editingId ? <Pencil className="text-blue-500" /> : <Plus className="text-cyan-500" />}
          </div>

          <div className="mt-5 grid gap-3">
            {visibleFields.map((field) => (
              <label key={field} className="block text-sm font-semibold text-slate-500">
                {labelFor(field)}
                <input
                  className="premium-input mt-2 w-full"
                  type={field.includes('date') ? 'date' : field === 'password' ? 'password' : 'text'}
                  value={form[field] ?? ''}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                />
              </label>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button className="premium-button flex-1 bg-slate-950 text-white dark:bg-white dark:text-slate-950"><Save size={16} /> Save</button>
            {editingId && <button type="button" onClick={() => { setEditingId(''); setForm(blankFor(config.fields)); }} className="premium-button bg-slate-100 text-slate-700">Cancel</button>}
          </div>
        </form>

        <div className="premium-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">MongoDB records</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{config.title}</h2>
            </div>
            <span className="premium-chip">{loading ? 'Loading' : `${items.length} rows`}</span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs font-black uppercase text-slate-500">
                <tr>
                  {config.fields.filter((field) => field !== 'password').slice(0, 5).map((field) => <th key={field} className="px-3 py-3">{labelFor(field)}</th>)}
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id || item._id} className="border-t border-slate-200 dark:border-white/10">
                    {config.fields.filter((field) => field !== 'password').slice(0, 5).map((field) => (
                      <td key={field} className="max-w-[220px] truncate px-3 py-4 text-slate-600 dark:text-slate-300">{String(item[field] ?? '')}</td>
                    ))}
                    <td className="px-3 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editItem(item)} className="rounded-lg bg-blue-600 p-2 text-white"><Pencil size={15} /></button>
                        <button type="button" onClick={() => deleteItem(item)} className="rounded-lg bg-rose-500 p-2 text-white"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-sm text-slate-500">
                      {loading ? 'Loading records...' : 'No MongoDB records yet. Create the first record to activate this module.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
