import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileUp, Send, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import api from '../services/api';

const emptyForm = {
  employee_name: '',
  employee_email: '',
  role: '',
  department: '',
  start_date: '',
  documents_required: 3,
};

const statusClass = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200',
  completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200',
};

export default function OnboardingPage() {
  const [workflows, setWorkflows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/onboarding');
      setWorkflows(response.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to load onboarding workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWorkflows(); }, []);

  const summary = useMemo(() => {
    const completed = workflows.filter((item) => ['approved', 'completed'].includes(String(item.status || '').toLowerCase())).length;
    const pendingDocs = workflows.reduce((sum, item) => sum + Math.max(Number(item.documents_required || 0) - Number(item.documents_submitted || 0), 0), 0);
    const avgProgress = workflows.length
      ? Math.round(workflows.reduce((sum, item) => sum + Number(item.profile_completion || 0), 0) / workflows.length)
      : 0;
    return { total: workflows.length, completed, pendingDocs, avgProgress };
  }, [workflows]);

  const createWorkflow = async (event) => {
    event.preventDefault();
    try {
      await api.post('/api/admin/onboarding', form);
      toast.success('Onboarding workflow created');
      setForm(emptyForm);
      loadWorkflows();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to create onboarding workflow');
    }
  };

  const updateWorkflow = async (id, patch) => {
    try {
      await api.patch(`/api/admin/onboarding/${id}`, patch);
      toast.success('Workflow updated');
      loadWorkflows();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to update workflow');
    }
  };

  const addDocument = async (id) => {
    try {
      await api.post(`/api/admin/onboarding/${id}/documents`, { name: 'Submitted onboarding file', category: 'Employment' });
      toast.success('Document submission recorded');
      loadWorkflows();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to record document');
    }
  };

  return (
    <div className="space-y-6">
      <Topbar title="Employee Onboarding" />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Workflows', summary.total],
          ['Completed', summary.completed],
          ['Pending docs', summary.pendingDocs],
          ['Avg progress', `${summary.avgProgress}%`],
        ].map(([label, value]) => (
          <div key={label} className="premium-panel p-5">
            <p className="metric-label">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <form onSubmit={createWorkflow} className="premium-panel-strong space-y-4 p-5">
          <div>
            <p className="metric-label">Create workflow</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">New hire lifecycle</h2>
          </div>
          {[
            ['employee_name', 'Employee name', 'text'],
            ['employee_email', 'Employee email', 'email'],
            ['role', 'Role', 'text'],
            ['department', 'Department', 'text'],
            ['start_date', 'Start date', 'date'],
            ['documents_required', 'Documents required', 'number'],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-sm font-semibold text-slate-500">
              {label}
              <input
                className="premium-input mt-2 w-full"
                type={type}
                value={form[key]}
                min={type === 'number' ? 1 : undefined}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                required={['employee_name', 'employee_email', 'role'].includes(key)}
              />
            </label>
          ))}
          <button className="premium-button w-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <UserPlus size={16} /> Create onboarding
          </button>
        </form>

        <div className="premium-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="metric-label">HR approval queue</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Profile, documents, welcome process</h2>
            </div>
            <span className="premium-chip">{loading ? 'Loading' : `${workflows.length} records`}</span>
          </div>

          <div className="mt-5 space-y-3">
            {!loading && workflows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10">
                No onboarding workflows found in MongoDB.
              </div>
            )}
            {workflows.map((item) => {
              const id = item.id || item._id;
              const status = String(item.status || 'pending').toLowerCase();
              return (
                <div key={id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950 dark:text-white">{item.employee_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.role} {item.department ? `- ${item.department}` : ''}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{item.employee_email}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass[status] || statusClass.pending}`}>{status}</span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(Number(item.profile_completion || 0), 100)}%` }} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <span className="premium-chip">Docs {item.documents_submitted || 0}/{item.documents_required || 0}</span>
                    <span className="premium-chip">{item.hr_approved ? 'HR approved' : 'Approval pending'}</span>
                    <span className="premium-chip">{item.welcome_sent ? 'Welcome sent' : 'Welcome pending'}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => addDocument(id)} className="premium-button bg-blue-600 text-white"><FileUp size={16} /> Record document</button>
                    <button type="button" onClick={() => updateWorkflow(id, { hr_approved: true, status: 'approved', profile_completion: 90 })} className="premium-button bg-emerald-500 text-white"><CheckCircle2 size={16} /> Approve</button>
                    <button type="button" onClick={() => updateWorkflow(id, { welcome_sent: true, status: 'completed', profile_completion: 100 })} className="premium-button bg-cyan-400 text-slate-950"><Send size={16} /> Send welcome</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
