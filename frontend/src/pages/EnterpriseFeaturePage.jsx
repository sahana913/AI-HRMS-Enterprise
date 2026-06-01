import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GitBranch,
  KeyRound,
  Mail,
  Palette,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Upload,
  UserCog,
  Users,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import EnterpriseDataTable from '../components/EnterpriseDataTable';
import api from '../services/api';

const featureConfig = {
  users: { title: 'User Management', subtitle: 'Identity and role administration', icon: UserCog, actions: [[Plus, 'Create user'], [Upload, 'Bulk import'], [KeyRound, 'Reset passwords']], columns: ['name', 'email', 'role', 'status', 'lastLogin'] },
  organization: { title: 'Organization Management', subtitle: 'Departments, branches, teams, and structure', icon: Building2, actions: [[Plus, 'Add department'], [Building2, 'Add branch'], [Users, 'Create team']], columns: ['name', 'type', 'leader', 'headcount', 'status'] },
  security: { title: 'Security Center', subtitle: 'Audit logs, login activity, and permission monitoring', icon: ShieldAlert, actions: [[KeyRound, 'Review permissions'], [ShieldAlert, 'Investigate alerts'], [Download, 'Export audit log']], columns: ['event', 'actor', 'risk', 'location', 'time'] },
  reports: { title: 'Reports Center', subtitle: 'PDF reports, Excel analytics, hiring and attendance exports', icon: FileSpreadsheet, actions: [[Download, 'Export PDF'], [FileSpreadsheet, 'Export Excel'], [Mail, 'Schedule email']], columns: ['name', 'category', 'format', 'owner', 'updated'] },
  jobs: { title: 'Job Management', subtitle: 'Role planning, requisitions, departments, and hiring priorities', icon: Building2, actions: [[Plus, 'Create job'], [Bot, 'AI job brief'], [Upload, 'Import openings']], columns: ['role', 'department', 'location', 'pipeline', 'status'] },
  onboarding: { title: 'Employee Onboarding', subtitle: 'New hire workflows, tasks, documents, and HR notifications', icon: CheckCircle2, actions: [[Plus, 'Create workflow'], [Bell, 'Send reminders'], [Palette, 'Customize portal']], columns: ['employee', 'role', 'startDate', 'progress', 'owner'] },
  payroll: { title: 'Payroll Dashboard', subtitle: 'Salary slips, tax details, bonuses, and deductions', icon: FileSpreadsheet, actions: [[Download, 'Download slip'], [Mail, 'Email payroll'], [FileSpreadsheet, 'Tax statement']], columns: ['period', 'gross', 'deductions', 'bonus', 'status'] },
  career: { title: 'AI Career Assistant', subtitle: 'Roadmap, learning recommendations, skill gaps, and promotion readiness', icon: Sparkles, actions: [[Bot, 'Generate roadmap'], [Target, 'Analyze gaps'], [CheckCircle2, 'Promotion readiness']], columns: ['area', 'recommendation', 'priority', 'timeline', 'impact'] },
  documents: { title: 'Document Management', subtitle: 'Employment documents, policies, tax forms, and verification files', icon: FileSpreadsheet, actions: [[Upload, 'Upload document'], [Download, 'Download pack'], [CheckCircle2, 'Request verification']], columns: ['document', 'category', 'status', 'owner', 'updated'] },
  communication: { title: 'Internal Communication', subtitle: 'Announcements, manager messages, HR broadcasts, and action items', icon: Send, actions: [[Send, 'Send update'], [Bell, 'Announcement'], [Mail, 'Message HR']], columns: ['thread', 'sender', 'type', 'status', 'time'] },
  candidateJobs: { title: 'AI Job Matching', subtitle: 'Recommended jobs, skills, and hiring probability', icon: Sparkles, actions: [[Bot, 'Refresh matches'], [CheckCircle2, 'Save jobs'], [Target, 'Skill plan']], columns: ['role', 'company', 'match', 'missingSkill', 'status'] },
  savedJobs: { title: 'Saved Jobs', subtitle: 'Saved roles, application intent, deadlines, and follow-up reminders', icon: CheckCircle2, actions: [[CheckCircle2, 'Apply now'], [Bell, 'Set reminders'], [Download, 'Export list']], columns: ['role', 'company', 'deadline', 'match', 'status'] },
  candidateInterviews: { title: 'Interview Tracking', subtitle: 'Schedules, status, feedback, and AI preparation tips', icon: Mail, actions: [[Bot, 'Prep me'], [Bell, 'Reminder'], [Mail, 'Message recruiter']], columns: ['role', 'company', 'round', 'status', 'tip'] },
  roles: { title: 'Role Management', subtitle: 'Enterprise RBAC roles and workspace boundaries', icon: UserCog, actions: [[Plus, 'Create role'], [KeyRound, 'Clone role'], [Download, 'Export matrix']], columns: ['role', 'dashboard', 'apiScope', 'users', 'status'] },
  permissions: { title: 'Permission Management', subtitle: 'Feature-level access policies and API controls', icon: KeyRound, actions: [[Plus, 'Add permission'], [ShieldAlert, 'Run audit'], [Download, 'Export policy']], columns: ['permission', 'roles', 'api', 'risk', 'status'] },
  departments: { title: 'Department Management', subtitle: 'Departments, managers, budgets, and performance signals', icon: Building2, actions: [[Plus, 'Add department'], [Users, 'Assign manager'], [FileSpreadsheet, 'Budget report']], columns: ['department', 'leader', 'headcount', 'budget', 'performance'] },
  auditLogs: { title: 'Audit Logs', subtitle: 'Security, role, payroll, and data access events', icon: ShieldAlert, actions: [[Download, 'Export logs'], [ShieldAlert, 'Investigate'], [KeyRound, 'Review roles']], columns: ['event', 'actor', 'scope', 'risk', 'time'] },
  team: { title: 'Team Management', subtitle: 'Direct reports, capacity, ownership, and working status', icon: Users, actions: [[Plus, 'Add teammate'], [Target, 'Assign goal'], [Bell, 'Send update']], columns: ['employee', 'role', 'capacity', 'performance', 'status'] },
  performance: { title: 'Performance Reviews', subtitle: 'Review cycles, scores, feedback, and trend analysis', icon: Target, actions: [[Plus, 'Create review'], [Bot, 'AI summary'], [Download, 'Export reviews']], columns: ['person', 'cycle', 'score', 'manager', 'status'] },
  goals: { title: 'Goal Tracking', subtitle: 'OKRs, milestones, ownership, and progress', icon: Target, actions: [[Plus, 'Create goal'], [CheckCircle2, 'Update progress'], [Bot, 'Predict risk']], columns: ['goal', 'owner', 'progress', 'due', 'risk'] },
  resources: { title: 'Resource Allocation', subtitle: 'Capacity planning, workload balance, and staffing requests', icon: GitBranch, actions: [[Plus, 'Allocate work'], [Users, 'Request capacity'], [Bot, 'Balance load']], columns: ['team', 'capacity', 'allocation', 'need', 'status'] },
  projects: { title: 'Project Management', subtitle: 'Kanban, sprint tracking, task management, and progress', icon: GitBranch, actions: [[Plus, 'Create task'], [CheckCircle2, 'Start sprint'], [Users, 'Allocate work']], columns: ['task', 'board', 'owner', 'status', 'priority'] },
  hiringRequests: { title: 'Hiring Requests', subtitle: 'Manager-submitted requisitions and workforce demand', icon: BriefcaseBusiness, actions: [[Plus, 'Request role'], [Send, 'Send to HR'], [Bot, 'Forecast demand']], columns: ['role', 'team', 'reason', 'priority', 'status'] },
  offers: { title: 'Offer Management', subtitle: 'Offer approvals, compensation bands, and acceptance tracking', icon: CheckCircle2, actions: [[Plus, 'Create offer'], [Send, 'Send offer'], [Download, 'Export packet']], columns: ['candidate', 'role', 'package', 'stage', 'owner'] },
  announcements: { title: 'Company Announcements', subtitle: 'Policy updates, company news, and employee communication', icon: Bell, actions: [[Bell, 'Mark read'], [Mail, 'Message HR'], [Download, 'Download policy']], columns: ['announcement', 'category', 'owner', 'status', 'date'] },
};

const emptyCards = [['Records', 0], ['Active', 0], ['Pending', 0], ['Completed', 0]];

export default function EnterpriseFeaturePage({ type }) {
  const config = featureConfig[type] || featureConfig.users;
  const Icon = config.icon;
  const [projectBoard, setProjectBoard] = useState(null);
  const [featureData, setFeatureData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        if (type === 'projects') {
          const response = await api.get('/api/projects/board');
          if (mounted) setProjectBoard(response.data);
        } else {
          const response = await api.get(`/api/features/${type}`);
          if (mounted) setFeatureData(response.data);
        }
      } catch (error) {
        console.error('Feature data failed', error);
        if (mounted) {
          setProjectBoard({ columns: [], tasks: [], summary: {} });
          setFeatureData({ cards: emptyCards, rows: [] });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [type]);

  const columns = useMemo(
    () => config.columns.map((key) => ({ key, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()) })),
    [config.columns]
  );

  const rows = useMemo(() => {
    if (type !== 'projects') return featureData?.rows || [];
    return (projectBoard?.tasks || []).map((task) => ({
      id: task.id || task._id,
      task: task.title || task.task || 'Untitled task',
      board: task.board || task.sprint || 'Project board',
      owner: task.owner || task.created_by || '',
      status: task.status || 'Backlog',
      priority: task.priority || 'Medium',
    }));
  }, [featureData, projectBoard, type]);

  const cards = useMemo(() => {
    if (type !== 'projects') return featureData?.cards || emptyCards;
    const summary = projectBoard?.summary || {};
    const tasks = projectBoard?.tasks || [];
    const blocked = tasks.filter((task) => String(task.status || '').toLowerCase() === 'blocked').length;
    return [
      ['Sprint progress', `${summary.progress || 0}%`],
      ['Open tasks', summary.open_tasks || 0],
      ['Blocked', blocked],
      ['Sprints', summary.sprints || 0],
    ];
  }, [featureData, projectBoard, type]);

  const kanbanColumns = useMemo(() => {
    const columnsFromApi = projectBoard?.columns?.length ? projectBoard.columns : [
      { id: 'backlog', title: 'Backlog' },
      { id: 'in_progress', title: 'In Progress' },
      { id: 'review', title: 'Review' },
      { id: 'done', title: 'Done' },
    ];
    const tasks = projectBoard?.tasks || [];
    return columnsFromApi.map((column) => {
      const title = column.title || column.name || column.id;
      const normalized = String(title || '').toLowerCase().replace(/\s+/g, '_');
      return {
        ...column,
        title,
        tasks: tasks.filter((task) => String(task.status || '').toLowerCase().replace(/\s+/g, '_') === normalized),
      };
    });
  }, [projectBoard]);

  return (
    <div className="space-y-6">
      <Topbar title={config.title} />
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.09)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600 text-white"><Icon size={24} /></div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-blue-600">{config.subtitle}</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight">{config.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.actions.map(([ActionIcon, label]) => (
              <button key={label} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-950 px-3.5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700">
                <ActionIcon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="premium-panel p-4">
            <p className="text-3xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{label}</p>
          </div>
        ))}
      </section>

      {type === 'projects' && (
        <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="premium-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="metric-label">Kanban board</p>
                <h2 className="text-lg font-black text-slate-950">Sprint execution</h2>
              </div>
              <span className="premium-chip">Jira / Asana / Trello style</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              {kanbanColumns.map((column) => (
                <div key={column.id || column.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{column.title}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-500">{column.tasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {column.tasks.map((task) => (
                      <div key={task.id || task._id || task.title} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-sm font-black text-slate-950">{task.title || 'Untitled task'}</p>
                        <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>{task.owner || 'Unassigned'}</span>
                          <span>{task.priority || 'Medium'}</span>
                        </div>
                      </div>
                    ))}
                    {!column.tasks.length && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs font-semibold text-slate-400">No tasks</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="premium-panel p-5">
            <p className="metric-label">Sprint tracking</p>
            <div className="mt-4 space-y-4">
              {cards.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <EnterpriseDataTable title={config.title} subtitle={loading ? 'Loading real workspace data' : config.subtitle} columns={columns} rows={rows} />
    </div>
  );
}
