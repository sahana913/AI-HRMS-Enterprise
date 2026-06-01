import {
  AreaChart,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  FileText,
  GitBranch,
  Home,
  LockKeyhole,
  MessageSquareText,
  Mic,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserCog,
  UserPlus,
  Users,
  Video,
  Wand2,
} from 'lucide-react';

export const ROLES = {
  superAdmin: 'super_admin',
  managementAdmin: 'management_admin',
  seniorManager: 'senior_manager',
  hrRecruiter: 'hr_recruiter',
  employee: 'employee',
  candidate: 'candidate',
};

export const ROLE_SLUGS = {
  [ROLES.superAdmin]: 'super-admin',
  [ROLES.managementAdmin]: 'management-admin',
  [ROLES.seniorManager]: 'senior-manager',
  [ROLES.hrRecruiter]: 'hr-recruiter',
  [ROLES.employee]: 'employee',
  [ROLES.candidate]: 'candidate',
};

export const slugToRole = (slug) => {
  const normalized = String(slug || '').trim().toLowerCase().replace(/_/g, '-');
  return Object.entries(ROLE_SLUGS).find(([, value]) => value === normalized)?.[0] || normalizeRole(slug);
};

export const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase().replace(/-/g, '_');
  const aliases = {
    administrator: ROLES.superAdmin,
    admin: ROLES.superAdmin,
    superadmin: ROLES.superAdmin,
    super_admin: ROLES.superAdmin,
    'super admin': ROLES.superAdmin,
    management_admin: ROLES.managementAdmin,
    'management admin': ROLES.managementAdmin,
    managementadmin: ROLES.managementAdmin,
    'management administrator': ROLES.managementAdmin,
    senior_manager: ROLES.seniorManager,
    'senior manager': ROLES.seniorManager,
    manager: ROLES.seniorManager,
    hr_admin: ROLES.hrRecruiter,
    hr_manager: ROLES.hrRecruiter,
    'hr manager': ROLES.hrRecruiter,
    hr: ROLES.hrRecruiter,
    recruiter: ROLES.hrRecruiter,
    hr_recruiter: ROLES.hrRecruiter,
    'hr recruiter': ROLES.hrRecruiter,
    employee: ROLES.employee,
    candidate: ROLES.candidate,
  };
  return aliases[value] || aliases[String(role || '').trim().toLowerCase()] || value || ROLES.employee;
};

export const ROLE_GROUPS = {
  all: Object.values(ROLES),
  executives: [ROLES.superAdmin, ROLES.managementAdmin, ROLES.seniorManager],
  peopleOps: [ROLES.superAdmin, ROLES.managementAdmin, ROLES.hrRecruiter],
  recruiting: [ROLES.superAdmin, ROLES.managementAdmin, ROLES.hrRecruiter],
  workforce: [ROLES.superAdmin, ROLES.managementAdmin, ROLES.seniorManager, ROLES.hrRecruiter, ROLES.employee],
  project: [ROLES.superAdmin, ROLES.managementAdmin, ROLES.seniorManager, ROLES.employee],
  candidate: [ROLES.candidate],
};

export const ROLE_HOME = Object.fromEntries(
  Object.entries(ROLE_SLUGS).map(([role, slug]) => [role, `/${slug}/dashboard`])
);

export const getRoleHome = (role) => ROLE_HOME[normalizeRole(role)] || ROLE_HOME[ROLES.employee];
export const getRoleSlug = (role) => ROLE_SLUGS[normalizeRole(role)] || ROLE_SLUGS[ROLES.employee];

export const ROLE_META = {
  [ROLES.managementAdmin]: {
    label: 'Management Admin',
    title: 'Executive Analytics Command',
    subtitle: 'View company performance, employee analytics, hiring analytics, approve budgets, and access executive reports.',
    icon: BarChart3,
  },
  [ROLES.superAdmin]: {
    label: 'Super Admin',
    title: 'Enterprise Command Center',
    subtitle: 'Govern company structure, roles, permissions, payroll, audit logs, workforce intelligence, and security monitoring.',
    icon: ShieldCheck,
  },
  [ROLES.seniorManager]: {
    label: 'Senior Manager',
    title: 'Leadership Operating System',
    subtitle: 'Run team performance, goals, resource allocation, leave approvals, hiring requests, and project execution.',
    icon: Target,
  },
  [ROLES.hrRecruiter]: {
    label: 'HR Recruiter',
    title: 'Recruiting Command Workspace',
    subtitle: 'Manage jobs, candidates, interviews, ATS screening, offers, candidate ranking, and hiring analytics.',
    icon: BriefcaseBusiness,
  },
  [ROLES.employee]: {
    label: 'Employee',
    title: 'Employee Self-Service Hub',
    subtitle: 'Access attendance, leave, payroll, performance reviews, goals, tasks, notifications, and announcements.',
    icon: User,
  },
  [ROLES.candidate]: {
    label: 'Candidate',
    title: 'Candidate Career Portal',
    subtitle: 'Build resumes, review ATS score, match jobs, track applications, prepare interviews, and get AI suggestions.',
    icon: Sparkles,
  },
};

const pathFor = (role, suffix = '') => `${getRoleHome(role)}${suffix}`;

export const ROLE_NAVIGATION = {
  [ROLES.superAdmin]: [
    {
      label: 'Company Control',
      items: [
        { label: 'Overview', path: pathFor(ROLES.superAdmin), icon: Home, permission: 'dashboard:super_admin' },
        { label: 'Organization', path: pathFor(ROLES.superAdmin, '/organization'), icon: Building2, permission: 'organization:manage' },
        { label: 'Users', path: pathFor(ROLES.superAdmin, '/users'), icon: UserCog, permission: 'users:manage' },
        { label: 'Employees', path: pathFor(ROLES.superAdmin, '/employees'), icon: Users, permission: 'employees:manage' },
        { label: 'Roles', path: pathFor(ROLES.superAdmin, '/roles'), icon: UserCog, permission: 'roles:manage' },
        { label: 'Permissions', path: pathFor(ROLES.superAdmin, '/permissions'), icon: LockKeyhole, permission: 'permissions:manage' },
        { label: 'Departments', path: pathFor(ROLES.superAdmin, '/departments'), icon: Building2, permission: 'departments:manage' },
        { label: 'Payroll', path: pathFor(ROLES.superAdmin, '/payroll'), icon: FileBarChart, permission: 'payroll:manage' },
        { label: 'Onboarding', path: pathFor(ROLES.superAdmin, '/onboarding'), icon: UserPlus, permission: 'onboarding:manage' },
      ],
    },
    {
      label: 'Analytics & Security',
      items: [
        { label: 'Workforce Analytics', path: pathFor(ROLES.superAdmin, '/analytics'), icon: AreaChart, permission: 'analytics:workforce' },
        { label: 'Attendance Analytics', path: pathFor(ROLES.superAdmin, '/attendance'), icon: CalendarClock, permission: 'attendance:all' },
        { label: 'Leave Analytics', path: pathFor(ROLES.superAdmin, '/leave'), icon: ClipboardList, permission: 'leave:analytics' },
        { label: 'Audit Logs', path: pathFor(ROLES.superAdmin, '/audit-logs'), icon: FileText, permission: 'audit:read' },
        { label: 'Security Monitoring', path: pathFor(ROLES.superAdmin, '/security'), icon: ShieldCheck, permission: 'security:manage' },
        { label: 'System Settings', path: pathFor(ROLES.superAdmin, '/settings'), icon: Settings, permission: 'system:manage' },
      ],
    },
  ],
  [ROLES.seniorManager]: [
    {
      label: 'Team Leadership',
      items: [
        { label: 'Manager Dashboard', path: pathFor(ROLES.seniorManager), icon: Home, permission: 'dashboard:senior_manager' },
        { label: 'Team Management', path: pathFor(ROLES.seniorManager, '/team'), icon: Users, permission: 'team:manage' },
        { label: 'Workforce Planning', path: pathFor(ROLES.seniorManager, '/workforce-planning'), icon: AreaChart, permission: 'workforce:plan' },
        { label: 'Performance', path: pathFor(ROLES.seniorManager, '/performance'), icon: BarChart3, permission: 'performance:team' },
        { label: 'AI Performance', path: pathFor(ROLES.seniorManager, '/ai-performance'), icon: TrendingUp, permission: 'performance:team' },
        { label: 'Goal Tracking', path: pathFor(ROLES.seniorManager, '/goals'), icon: Target, permission: 'goals:team' },
        { label: 'Resource Allocation', path: pathFor(ROLES.seniorManager, '/resources'), icon: GitBranch, permission: 'resources:allocate' },
        { label: 'Budget Tracking', path: pathFor(ROLES.seniorManager, '/budgets'), icon: FileBarChart, permission: 'budget:manage' },
        { label: 'Leave Approvals', path: pathFor(ROLES.seniorManager, '/leave'), icon: ClipboardList, permission: 'leave:approve' },
      ],
    },
    {
      label: 'Delivery',
      items: [
        { label: 'Projects', path: pathFor(ROLES.seniorManager, '/projects'), icon: GitBranch, permission: 'projects:manage' },
        { label: 'Team Analytics', path: pathFor(ROLES.seniorManager, '/analytics'), icon: AreaChart, permission: 'analytics:team' },
        { label: 'Hiring Requests', path: pathFor(ROLES.seniorManager, '/hiring-requests'), icon: BriefcaseBusiness, permission: 'hiring_requests:create' },
        { label: 'Notifications', path: pathFor(ROLES.seniorManager, '/notifications'), icon: Bell, permission: 'notifications:read' },
      ],
    },
  ],
  [ROLES.managementAdmin]: [
    {
      label: 'Executive Overview',
      items: [
        { label: 'Executive Dashboard', path: pathFor(ROLES.managementAdmin), icon: Home, permission: 'dashboard:management_admin' },
        { label: 'Company Analytics', path: pathFor(ROLES.managementAdmin, '/analytics'), icon: AreaChart, permission: 'analytics:all' },
        { label: 'Employee Analytics', path: pathFor(ROLES.managementAdmin, '/employees'), icon: Users, permission: 'employees:read' },
        { label: 'Hiring Analytics', path: pathFor(ROLES.managementAdmin, '/hiring'), icon: BriefcaseBusiness, permission: 'analytics:recruiting' },
        { label: 'AI Performance', path: pathFor(ROLES.managementAdmin, '/ai-performance'), icon: TrendingUp, permission: 'analytics:workforce' },
        { label: 'Budget Approval', path: pathFor(ROLES.managementAdmin, '/budgets'), icon: FileBarChart, permission: 'budget:manage' },
        { label: 'Reports', path: pathFor(ROLES.managementAdmin, '/reports'), icon: FileText, permission: 'analytics:all' },
        { label: 'Notifications', path: pathFor(ROLES.managementAdmin, '/notifications'), icon: Bell, permission: 'notifications:read' },
      ],
    },
  ],
  [ROLES.hrRecruiter]: [
    {
      label: 'Recruiting',
      items: [
        { label: 'Recruiter Dashboard', path: pathFor(ROLES.hrRecruiter), icon: Home, permission: 'dashboard:hr_recruiter' },
        { label: 'Job Posting', path: pathFor(ROLES.hrRecruiter, '/jobs'), icon: FileText, permission: 'jobs:manage' },
        { label: 'Candidates', path: pathFor(ROLES.hrRecruiter, '/candidates'), icon: BriefcaseBusiness, permission: 'candidates:manage' },
        { label: 'Interview Scheduling', path: pathFor(ROLES.hrRecruiter, '/interviews'), icon: MessageSquareText, permission: 'interviews:manage' },
        { label: 'Video Interviews', path: pathFor(ROLES.hrRecruiter, '/video-interviews'), icon: Video, permission: 'interviews:manage' },
        { label: 'ATS Screening', path: pathFor(ROLES.hrRecruiter, '/screening'), icon: Bot, permission: 'ai:screen' },
        { label: 'Candidate Ranking', path: pathFor(ROLES.hrRecruiter, '/ats'), icon: ShieldCheck, permission: 'ats:manage' },
        { label: 'AI Job Description', path: pathFor(ROLES.hrRecruiter, '/ai-jd'), icon: Wand2, permission: 'jobs:manage' },
        { label: 'Offer Management', path: pathFor(ROLES.hrRecruiter, '/offers'), icon: CheckCircle2, permission: 'offers:manage' },
        { label: 'Onboarding', path: pathFor(ROLES.hrRecruiter, '/onboarding'), icon: UserPlus, permission: 'onboarding:manage' },
        { label: 'Recruitment Analytics', path: pathFor(ROLES.hrRecruiter, '/analytics'), icon: FileBarChart, permission: 'analytics:recruiting' },
        { label: 'Voice AI', path: pathFor(ROLES.hrRecruiter, '/voice-ai'), icon: Mic, permission: 'ai:screen' },
        { label: 'HR Chatbot', path: pathFor(ROLES.hrRecruiter, '/chatbot'), icon: Bot, permission: 'ai:screen' },
      ],
    },
  ],
  [ROLES.employee]: [
    {
      label: 'Self-Service',
      items: [
        { label: 'Employee Dashboard', path: pathFor(ROLES.employee), icon: Home, permission: 'dashboard:employee' },
        { label: 'HR Chatbot', path: pathFor(ROLES.employee, '/chatbot'), icon: Bot, permission: 'notifications:read' },
        { label: 'Employee Profile', path: pathFor(ROLES.employee, '/profile'), icon: User, permission: 'profile:own' },
        { label: 'Attendance', path: pathFor(ROLES.employee, '/attendance'), icon: CalendarClock, permission: 'attendance:own' },
        { label: 'Attendance Corrections', path: pathFor(ROLES.employee, '/attendance-corrections'), icon: CalendarClock, permission: 'attendance:own' },
        { label: 'Leave Requests', path: pathFor(ROLES.employee, '/leave'), icon: ClipboardList, permission: 'leave:own' },
        { label: 'Leave Balances', path: pathFor(ROLES.employee, '/leave-balances'), icon: ClipboardList, permission: 'leave:own' },
        { label: 'Payroll', path: pathFor(ROLES.employee, '/payroll'), icon: FileBarChart, permission: 'payroll:own' },
        { label: 'Payslips', path: pathFor(ROLES.employee, '/payslips'), icon: FileBarChart, permission: 'payroll:own' },
        { label: 'Performance Reviews', path: pathFor(ROLES.employee, '/performance'), icon: BarChart3, permission: 'performance:own' },
        { label: 'Goals', path: pathFor(ROLES.employee, '/goals'), icon: Target, permission: 'goals:own' },
        { label: 'Training Portal', path: pathFor(ROLES.employee, '/training'), icon: Sparkles, permission: 'training:own' },
        { label: 'Projects', path: pathFor(ROLES.employee, '/projects'), icon: GitBranch, permission: 'projects:own' },
        { label: 'Onboarding', path: pathFor(ROLES.employee, '/onboarding'), icon: UserPlus, permission: 'onboarding:own' },
        { label: 'Announcements', path: pathFor(ROLES.employee, '/announcements'), icon: Bell, permission: 'announcements:read' },
        { label: 'Notifications', path: pathFor(ROLES.employee, '/notifications'), icon: Bell, permission: 'notifications:read' },
      ],
    },
  ],
  [ROLES.candidate]: [
    {
      label: 'Career Portal',
      items: [
        { label: 'Candidate Dashboard', path: pathFor(ROLES.candidate), icon: Home, permission: 'dashboard:candidate' },
        { label: 'Resume Builder', path: pathFor(ROLES.candidate, '/builder'), icon: FileText, permission: 'resume:own' },
        { label: 'ATS Score', path: pathFor(ROLES.candidate, '/screening'), icon: ClipboardList, permission: 'ai:candidate' },
        { label: 'Job Applications', path: pathFor(ROLES.candidate, '/candidates'), icon: BriefcaseBusiness, permission: 'applications:own' },
        { label: 'Saved Jobs', path: pathFor(ROLES.candidate, '/saved-jobs'), icon: CheckCircle2, permission: 'jobs:saved' },
        { label: 'Job Matching', path: pathFor(ROLES.candidate, '/jobs'), icon: Sparkles, permission: 'jobs:match' },
        { label: 'Interview Prep', path: pathFor(ROLES.candidate, '/interviews'), icon: MessageSquareText, permission: 'interviews:own' },
        { label: 'Video Interview', path: pathFor(ROLES.candidate, '/video-interviews'), icon: Video, permission: 'interviews:own' },
        { label: 'Career Assistant', path: pathFor(ROLES.candidate, '/career'), icon: AreaChart, permission: 'career:own' },
        { label: 'Voice Prep', path: pathFor(ROLES.candidate, '/voice-ai'), icon: Mic, permission: 'ai:candidate' },
        { label: 'AI Chatbot', path: pathFor(ROLES.candidate, '/chatbot'), icon: Bot, permission: 'notifications:read' },
        { label: 'Notifications', path: pathFor(ROLES.candidate, '/notifications'), icon: Bell, permission: 'notifications:read' },
      ],
    },
  ],
};

export const ROLE_PERMISSIONS = {
  [ROLES.managementAdmin]: [
    'dashboard:management_admin', 'analytics:all', 'analytics:workforce', 'analytics:recruiting',
    'analytics:team', 'employees:read', 'budget:manage', 'notifications:read', 'notifications:manage',
    'reports:read', 'performance:manage', 'hiring_requests:create',
  ],
  [ROLES.superAdmin]: [
    'dashboard:super_admin', 'employees:manage', 'employees:read', 'roles:manage', 'permissions:manage',
    'departments:manage', 'organization:manage', 'users:manage', 'payroll:manage', 'payroll:own', 'attendance:all', 'leave:analytics',
    'leave:approve', 'analytics:workforce', 'analytics:all', 'audit:read', 'system:manage',
    'security:manage', 'notifications:manage', 'notifications:read', 'projects:manage', 'projects:own',
    'candidates:manage', 'ats:manage', 'ai:screen', 'interviews:manage', 'jobs:manage',
    'offers:manage', 'budget:manage', 'workforce:plan', 'performance:manage', 'training:manage',
    'attendance:own', 'leave:own', 'profile:own', 'performance:own', 'performance:team', 'goals:own', 'goals:team',
    'ai:candidate', 'interviews:own', 'analytics:team', 'analytics:recruiting', 'resources:allocate',
    'resume:own', 'career:own', 'applications:own', 'jobs:saved', 'jobs:match',
    'onboarding:manage', 'training:own',
  ],
  [ROLES.seniorManager]: [
    'dashboard:senior_manager', 'team:manage', 'workforce:plan', 'performance:team', 'performance:manage',
    'goals:team', 'resources:allocate', 'budget:manage',
    'leave:approve', 'analytics:team', 'hiring_requests:create', 'projects:manage', 'projects:own',
    'notifications:manage', 'notifications:read', 'attendance:team', 'employees:read', 'applications:own',
  ],
  [ROLES.hrRecruiter]: [
    'dashboard:hr_recruiter', 'jobs:manage', 'candidates:manage', 'interviews:manage', 'ats:manage',
    'ai:screen', 'offers:manage', 'training:manage', 'analytics:recruiting', 'notifications:manage', 'notifications:read',
    'resume:own', 'applications:own', 'onboarding:manage',
  ],
  [ROLES.employee]: [
    'dashboard:employee', 'attendance:own', 'leave:own', 'payroll:own', 'performance:own',
    'goals:own', 'projects:own', 'announcements:read', 'notifications:read', 'profile:own',
    'career:own', 'resume:own', 'applications:own', 'onboarding:own', 'training:own',
  ],
  [ROLES.candidate]: [
    'dashboard:candidate', 'resume:own', 'ai:candidate', 'applications:own', 'jobs:saved',
    'jobs:match', 'interviews:own', 'career:own', 'notifications:read', 'profile:own',
  ],
};

export const hasPermission = (role, permission) => {
  if (!permission) return true;
  return ROLE_PERMISSIONS[normalizeRole(role)]?.includes(permission) || false;
};

export const ROLE_DASHBOARD_CARDS = {
  [ROLES.managementAdmin]: [
    ['Company employees', 'employees', Users, 'Total workforce headcount', 'employees:read'],
    ['Hiring pipeline', 'candidates', BriefcaseBusiness, 'Active candidates', 'analytics:recruiting'],
    ['Attrition risk', 'attrition_rate', BarChart3, 'Workforce risk signal', 'analytics:workforce'],
    ['Budget status', 'payroll', FileBarChart, 'Monthly payroll overview', 'budget:manage'],
  ],
  [ROLES.superAdmin]: [
    ['Total employees', 'employees', Users, 'Company-wide headcount', 'employees:read'],
    ['Hiring pipeline', 'candidates', BriefcaseBusiness, 'Active candidate volume', 'candidates:manage'],
    ['Payroll health', 'payroll', FileBarChart, 'Monthly payroll overview', 'payroll:manage'],
    ['AI forecast', 'forecast', Bot, 'Workforce demand prediction', 'analytics:workforce'],
  ],
  [ROLES.seniorManager]: [
    ['Team productivity', 'productivity', BarChart3, 'Delivery velocity index', 'analytics:team'],
    ['Team attendance', 'attendance_today', CalendarClock, 'Today presence signal', 'attendance:team'],
    ['Open tasks', 'open_tasks', ClipboardList, 'Assigned delivery work', 'projects:manage'],
    ['AI prediction', 'forecast', Bot, 'Productivity risk signal', 'analytics:team'],
  ],
  [ROLES.hrRecruiter]: [
    ['Open jobs', 'open_jobs', FileText, 'Published requisitions', 'jobs:manage'],
    ['Pipeline', 'candidates', BriefcaseBusiness, 'Candidates in process', 'candidates:manage'],
    ['Interviews', 'interviews', MessageSquareText, 'Scheduled interviews', 'interviews:manage'],
    ['Shortlisted', 'shortlisted', CheckCircle2, 'Ranked candidates', 'ats:manage'],
  ],
  [ROLES.employee]: [
    ['Attendance', 'attendance_today', CalendarClock, 'Today attendance state', 'attendance:own'],
    ['Leave balance', 'leave_balance', ClipboardList, 'Available days', 'leave:own'],
    ['Salary summary', 'salary', FileBarChart, 'Current payroll state', 'payroll:own'],
    ['Performance score', 'performance', Target, 'Latest review signal', 'performance:own'],
  ],
  [ROLES.candidate]: [
    ['ATS score', 'ats_average', Target, 'Latest resume score', 'ai:candidate'],
    ['Job matches', 'job_matches', Sparkles, 'AI recommended roles', 'jobs:match'],
    ['Applications', 'candidates', BriefcaseBusiness, 'Submitted records', 'applications:own'],
    ['Resume strength', 'resume_strength', FileText, 'Profile completeness', 'resume:own'],
  ],
};
