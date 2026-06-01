import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import { getRoleHome, getRoleSlug, ROLES, slugToRole } from '../utils/auth';
import { useAuth } from '../context/AuthContext';

const RoleDashboardPage = lazy(() => import('../pages/RoleDashboardPage'));
const EnterpriseFeaturePage = lazy(() => import('../pages/EnterpriseFeaturePage'));
const EnterpriseCrudPage = lazy(() => import('../pages/EnterpriseCrudPage'));
const ResumeBuilderPage = lazy(() => import('../pages/ResumeBuilderPage'));
const ResumeScreeningPage = lazy(() => import('../pages/ResumeScreeningPage'));
const AtsPipelinePage = lazy(() => import('../pages/AtsPipelinePage'));
const EmployeesPage = lazy(() => import('../pages/EmployeesPage'));
const CandidatesPage = lazy(() => import('../pages/CandidatesPage'));
const AttendancePage = lazy(() => import('../pages/AttendancePage'));
const LeavePage = lazy(() => import('../pages/LeavePage'));
const InterviewsPage = lazy(() => import('../pages/InterviewsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const CandidateJobsPage = lazy(() => import('../pages/CandidateJobsPage'));
const VoiceAIPage = lazy(() => import('../pages/VoiceAIPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const VideoInterviewsPage = lazy(() => import('../pages/VideoInterviewsPage'));
const AIChatbotPage = lazy(() => import('../pages/AIChatbotPage'));
const AIPerformancePage = lazy(() => import('../pages/AIPerformancePage'));
const AIJobDescriptionPage = lazy(() => import('../pages/AIJobDescriptionPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const LandingPage = lazy(() => import('../pages/LandingPage'));
const PublicResumePage = lazy(() => import('../pages/PublicResumePage'));
const RolesPage = lazy(() => import('../pages/admin/RolesPage'));
const PermissionsPage = lazy(() => import('../pages/admin/PermissionsPage'));
const DepartmentsPage = lazy(() => import('../pages/admin/DepartmentsPage'));
const PayrollPage = lazy(() => import('../pages/admin/PayrollPage'));
const AuditLogsPage = lazy(() => import('../pages/admin/AuditLogsPage'));
const SecurityPage = lazy(() => import('../pages/admin/SecurityPage'));
const ProjectBoardPage = lazy(() => import('../pages/admin/ProjectBoardPage'));
const SprintsPage = lazy(() => import('../pages/admin/SprintsPage'));
const TasksPage = lazy(() => import('../pages/admin/TasksPage'));

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={getRoleHome(user?.role)} replace />;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-bold text-blue-700">
      Loading...
    </div>
  );
}

export default function AppRouter() {
  const roleRoutes = Object.values(ROLES).map((role) => ({ role, slug: getRoleSlug(role) }));

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/resume/:shareId" element={<PublicResumePage />} />
          </Route>

          <Route element={<PublicLayout guestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
          </Route>

          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />

          {roleRoutes.map(({ role, slug }) => (
            <Route
              key={role}
              path={`/${slug}/dashboard/*`}
              element={
                <RoleProtectedRoute allowedRoles={[role]}>
                  <DashboardLayout />
                </RoleProtectedRoute>
              }
            >
              <Route index element={<RoleDashboardPage role={role} />} />
              <Route path="builder" element={<RoleProtectedRoute permission="resume:own"><ResumeBuilderPage /></RoleProtectedRoute>} />
              <Route path="screening" element={<RoleProtectedRoute permission={role === ROLES.candidate ? 'ai:candidate' : 'ai:screen'}><ResumeScreeningPage /></RoleProtectedRoute>} />
              <Route path="ats" element={<RoleProtectedRoute permission="ats:manage"><AtsPipelinePage /></RoleProtectedRoute>} />
              <Route path="employees" element={<RoleProtectedRoute permission="employees:read"><EmployeesPage /></RoleProtectedRoute>} />
              <Route path="candidates" element={<RoleProtectedRoute permission={role === ROLES.candidate ? 'applications:own' : 'candidates:manage'}><CandidatesPage /></RoleProtectedRoute>} />
              <Route path="attendance" element={<RoleProtectedRoute permission={role === ROLES.employee ? 'attendance:own' : role === ROLES.seniorManager ? 'attendance:team' : 'attendance:all'}><AttendancePage /></RoleProtectedRoute>} />
              <Route path="leave" element={<RoleProtectedRoute permission={role === ROLES.employee ? 'leave:own' : 'leave:approve'}><LeavePage /></RoleProtectedRoute>} />
              <Route path="interviews" element={<RoleProtectedRoute permission={role === ROLES.candidate ? 'interviews:own' : 'interviews:manage'}>{role === ROLES.candidate ? <EnterpriseFeaturePage type="candidateInterviews" /> : <InterviewsPage />}</RoleProtectedRoute>} />
              <Route path="video-interviews" element={<RoleProtectedRoute permission={role === ROLES.candidate ? 'interviews:own' : 'interviews:manage'}><VideoInterviewsPage /></RoleProtectedRoute>} />
              <Route path="notifications" element={<RoleProtectedRoute permission="notifications:read"><EnterpriseCrudPage type="notificationsCrud" /></RoleProtectedRoute>} />
              <Route path="analytics" element={<RoleProtectedRoute permission={role === ROLES.superAdmin || role === ROLES.managementAdmin ? 'analytics:all' : role === ROLES.seniorManager ? 'analytics:team' : 'analytics:recruiting'}><AnalyticsPage /></RoleProtectedRoute>} />
              <Route path="hiring" element={<RoleProtectedRoute permission="analytics:recruiting"><AnalyticsPage /></RoleProtectedRoute>} />
              <Route path="reports" element={<RoleProtectedRoute permission="analytics:all"><AnalyticsPage /></RoleProtectedRoute>} />
              <Route path="settings" element={<RoleProtectedRoute permission={role === ROLES.superAdmin ? 'system:manage' : 'profile:own'}>{role === ROLES.superAdmin ? <EnterpriseCrudPage type="settings" /> : <SettingsPage />}</RoleProtectedRoute>} />
              <Route path="organization" element={<RoleProtectedRoute permission="organization:manage"><EnterpriseCrudPage type="organization" /></RoleProtectedRoute>} />
              <Route path="users" element={<RoleProtectedRoute permission="users:manage"><EnterpriseCrudPage type="users" /></RoleProtectedRoute>} />
              <Route path="team" element={<RoleProtectedRoute permission="team:manage"><EnterpriseCrudPage type="teams" /></RoleProtectedRoute>} />
              <Route path="workforce-planning" element={<RoleProtectedRoute permission="workforce:plan"><EnterpriseCrudPage type="workforce" /></RoleProtectedRoute>} />
              <Route path="performance" element={<RoleProtectedRoute permission={role === ROLES.seniorManager ? 'performance:team' : 'performance:own'}><EnterpriseCrudPage type="performance" /></RoleProtectedRoute>} />
              <Route path="goals" element={<RoleProtectedRoute permission={role === ROLES.seniorManager ? 'goals:team' : 'goals:own'}><EnterpriseCrudPage type="goals" /></RoleProtectedRoute>} />
              <Route path="resources" element={<RoleProtectedRoute permission="resources:allocate"><EnterpriseCrudPage type="resources" /></RoleProtectedRoute>} />
              <Route path="budgets" element={<RoleProtectedRoute permission="budget:manage"><EnterpriseCrudPage type="budgets" /></RoleProtectedRoute>} />
              <Route path="hiring-requests" element={<RoleProtectedRoute permission="hiring_requests:create"><EnterpriseFeaturePage type="hiringRequests" /></RoleProtectedRoute>} />
              <Route path="jobs" element={<RoleProtectedRoute permission={role === ROLES.candidate ? 'jobs:match' : 'jobs:manage'}>{role === ROLES.candidate ? <CandidateJobsPage /> : <EnterpriseCrudPage type="jobs" />}</RoleProtectedRoute>} />
              <Route path="offers" element={<RoleProtectedRoute permission="offers:manage"><EnterpriseCrudPage type="offers" /></RoleProtectedRoute>} />
              <Route path="profile" element={<RoleProtectedRoute permission="profile:own"><EnterpriseCrudPage type="profile" /></RoleProtectedRoute>} />
              <Route path="attendance-corrections" element={<RoleProtectedRoute permission="attendance:own"><EnterpriseCrudPage type="attendanceCorrections" /></RoleProtectedRoute>} />
              <Route path="leave-balances" element={<RoleProtectedRoute permission="leave:own"><EnterpriseCrudPage type="leaveBalances" /></RoleProtectedRoute>} />
              <Route path="payslips" element={<RoleProtectedRoute permission="payroll:own"><EnterpriseCrudPage type="payslips" /></RoleProtectedRoute>} />
              <Route path="training" element={<RoleProtectedRoute permission="training:own"><EnterpriseCrudPage type="training" /></RoleProtectedRoute>} />
              <Route path="onboarding" element={<RoleProtectedRoute permission={role === ROLES.employee ? 'onboarding:own' : 'onboarding:manage'}>{role === ROLES.employee ? <EnterpriseFeaturePage type="onboarding" /> : <OnboardingPage />}</RoleProtectedRoute>} />
              <Route path="announcements" element={<RoleProtectedRoute permission="announcements:read"><EnterpriseFeaturePage type="announcements" /></RoleProtectedRoute>} />
              <Route path="saved-jobs" element={<RoleProtectedRoute permission="jobs:saved"><EnterpriseFeaturePage type="savedJobs" /></RoleProtectedRoute>} />
              <Route path="career" element={<RoleProtectedRoute permission="career:own"><EnterpriseFeaturePage type="career" /></RoleProtectedRoute>} />
              <Route path="voice-ai" element={<RoleProtectedRoute permission={role === ROLES.candidate ? 'ai:candidate' : 'ai:screen'}><VoiceAIPage /></RoleProtectedRoute>} />
              <Route path="chatbot" element={<RoleProtectedRoute permission="notifications:read"><AIChatbotPage /></RoleProtectedRoute>} />
              <Route path="ai-performance" element={<RoleProtectedRoute permission="analytics:workforce"><AIPerformancePage /></RoleProtectedRoute>} />
              <Route path="ai-jd" element={<RoleProtectedRoute permission="jobs:manage"><AIJobDescriptionPage /></RoleProtectedRoute>} />
              <Route path="roles" element={<RoleProtectedRoute permission="roles:manage"><RolesPage /></RoleProtectedRoute>} />
              <Route path="permissions" element={<RoleProtectedRoute permission="permissions:manage"><PermissionsPage /></RoleProtectedRoute>} />
              <Route path="departments" element={<RoleProtectedRoute permission="departments:manage"><DepartmentsPage /></RoleProtectedRoute>} />
              <Route path="payroll" element={<RoleProtectedRoute permission={role === ROLES.superAdmin ? 'payroll:manage' : 'payroll:own'}><PayrollPage /></RoleProtectedRoute>} />
              <Route path="audit-logs" element={<RoleProtectedRoute permission="audit:read"><AuditLogsPage /></RoleProtectedRoute>} />
              <Route path="security" element={<RoleProtectedRoute permission="security:manage"><SecurityPage /></RoleProtectedRoute>} />
              <Route path="projects" element={<RoleProtectedRoute permission={role === ROLES.employee ? 'projects:own' : 'projects:manage'}><EnterpriseFeaturePage type="projects" /></RoleProtectedRoute>} />
              <Route path="projects/board" element={<RoleProtectedRoute permission={role === ROLES.employee ? 'projects:own' : 'projects:manage'}><ProjectBoardPage /></RoleProtectedRoute>} />
              <Route path="projects/sprints" element={<RoleProtectedRoute permission={role === ROLES.employee ? 'projects:own' : 'projects:manage'}><SprintsPage /></RoleProtectedRoute>} />
              <Route path="projects/tasks" element={<RoleProtectedRoute permission={role === ROLES.employee ? 'projects:own' : 'projects:manage'}><TasksPage /></RoleProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          ))}

          <Route path="/admin/dashboard/*" element={<Navigate to={getRoleHome(ROLES.superAdmin)} replace />} />
          <Route path="/hr/dashboard/*" element={<Navigate to={getRoleHome(ROLES.hrRecruiter)} replace />} />
          <Route path="/:role/dashboard" element={<Navigate to={getRoleHome(slugToRole(window.location.pathname.split('/')[1]))} replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
