import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { RequirePermission } from "./RequirePermission";
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import NotFound from "@/pages/not-found";
import StaffInvitePage from "@/pages/auth/staff-invite";
import { useAuth } from "@/app/providers";
import { defaultRouteForRole, isRestrictedProjectRole } from "@/lib/permissions";

const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const CeoCommandCenterPage = lazy(() => import("@/features/ceo/pages/CeoCommandCenterPage"));
const LeadsListPage = lazy(() => import("@/features/leads/pages/LeadsListPage"));
const LeadDetailPage = lazy(() => import("@/features/leads/pages/LeadDetailPage"));
const ClientsListPage = lazy(() => import("@/features/clients/pages/ClientsListPage"));
const ClientDetailPage = lazy(() => import("@/features/clients/pages/ClientDetailPage"));
const ProjectsListPage = lazy(() => import("@/features/projects/pages/ProjectsListPage"));
const ProjectDetailPage = lazy(() => import("@/features/projects/pages/ProjectDetailPage"));
const InvoicesListPage = lazy(() => import("@/features/invoices/pages/InvoicesListPage"));
const InvoiceDetailPage = lazy(() => import("@/features/invoices/pages/InvoiceDetailPage"));
const ProposalsListPage = lazy(() => import("@/features/proposals/pages/ProposalsListPage"));
const ProposalBuilderPage = lazy(() => import("@/features/proposals/pages/ProposalBuilderPage"));
const TeamPage = lazy(() => import("@/features/team/pages/TeamPage"));
const RolesPage = lazy(() => import("@/features/team/pages/RolesPage"));
const ServicesPage = lazy(() => import("@/features/content/pages/ServicesPage"));
const PortfolioPage = lazy(() => import("@/features/content/pages/PortfolioPage"));
const BlogsPage = lazy(() => import("@/features/content/pages/BlogsPage"));
const TestimonialsPage = lazy(() => import("@/features/content/pages/TestimonialsPage"));
const TeamCmsPage = lazy(() => import("@/features/content/pages/TeamCmsPage"));
const PaymentsPage = lazy(() => import("@/features/finance/pages/PaymentsPage"));
const ExpensesPage = lazy(() => import("@/features/finance/pages/ExpensesPage"));
const PayrollPage = lazy(() => import("@/features/finance/pages/PayrollPage"));
const TasksPage = lazy(() => import("@/features/delivery/pages/TasksPage"));
const MyWorkPage = lazy(() => import("@/features/delivery/pages/MyWorkPage"));
const FilesPage = lazy(() => import("@/features/delivery/pages/FilesPage"));
const WorkflowsPage = lazy(() => import("@/features/automations/pages/WorkflowsPage"));
const CompanySettingsPage = lazy(() => import("@/features/settings/pages/CompanySettingsPage"));
const SecuritySettingsPage = lazy(() => import("@/features/settings/pages/SecuritySettingsPage"));
const IntegrationsSettingsPage = lazy(() => import("@/features/settings/pages/IntegrationsSettingsPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const InboxPage = lazy(() => import("@/features/inbox/pages/InboxPage"));
const DemoRequestsPage = lazy(() => import("@/features/leads/pages/DemoRequestsPage"));
const DocumentationPage = lazy(() => import("@/features/settings/pages/DocumentationPage"));
const CareersRolesPage = lazy(() => import("@/features/careers/pages/CareersRolesPage"));
const CareersRolePage = lazy(() => import("@/features/careers/pages/CareersRolePage"));
const CareersApplicationPage = lazy(() => import("@/features/careers/pages/CareersApplicationPage"));

function PageLoader() {
  return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
}

function P({ permission, children }: { permission?: import("@/types/auth").Permission; children: React.ReactNode }) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>;
}

function LandingRoute() {
  const { role } = useAuth();
  const target = defaultRouteForRole(role);
  return target === "/" ? <P permission="dashboard.view"><DashboardPage /></P> : <Navigate to={target} replace />;
}

function TasksRoute() {
  const { role } = useAuth();
  return isRestrictedProjectRole(role)
    ? <Navigate to="/my-work" replace />
    : <P permission="projects.view"><TasksPage /></P>;
}

function ExecutiveRoute() {
  const { role } = useAuth();
  return role === "designer" || role === "developer"
    ? <Navigate to="/my-work" replace />
    : <P permission="dashboard.view"><CeoCommandCenterPage /></P>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth/sign-in" element={<SignIn />} />
        <Route path="/auth/sign-up" element={<SignUp />} />
        <Route path="/auth/staff-invite/:token" element={<StaffInvitePage />} />

        <Route element={<AdminLayout />}>
          <Route index element={<LandingRoute />} />
          <Route path="ceo" element={<ExecutiveRoute />} />
          <Route path="inbox" element={<P permission="leads.view"><InboxPage /></P>} />
          <Route path="ai" element={<Navigate to="/inbox" replace />} />
          <Route path="ai/conversations" element={<Navigate to="/inbox" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="leads" element={<P permission="leads.view"><LeadsListPage /></P>} />
          <Route path="leads/:id" element={<P permission="leads.view"><LeadDetailPage /></P>} />
          <Route path="clients" element={<P permission="clients.view"><ClientsListPage /></P>} />
          <Route path="clients/:id" element={<P permission="clients.view"><ClientDetailPage /></P>} />
          <Route path="proposals" element={<P permission="proposals.view"><ProposalsListPage /></P>} />
          <Route path="proposals/:id" element={<P permission="proposals.view"><ProposalBuilderPage /></P>} />
          <Route path="projects" element={<P permission="projects.view"><ProjectsListPage /></P>} />
          <Route path="projects/:id" element={<P permission="projects.view"><ProjectDetailPage /></P>} />
          <Route path="tasks" element={<TasksRoute />} />
          <Route path="my-work" element={<P permission="projects.view"><MyWorkPage /></P>} />
          <Route path="files" element={<P permission="projects.view"><FilesPage /></P>} />
          <Route path="invoices" element={<P permission="invoices.view"><InvoicesListPage /></P>} />
          <Route path="invoices/:id" element={<P permission="invoices.view"><InvoiceDetailPage /></P>} />
          <Route path="payments" element={<P permission="invoices.view"><PaymentsPage /></P>} />
          <Route path="expenses" element={<P permission="invoices.view"><ExpensesPage /></P>} />
          <Route path="payroll" element={<P permission="invoices.view"><PayrollPage /></P>} />
          <Route path="blogs" element={<P permission="content.view"><BlogsPage /></P>} />
          <Route path="content/services" element={<P permission="content.view"><ServicesPage /></P>} />
          <Route path="content/portfolio" element={<P permission="content.view"><PortfolioPage /></P>} />
          <Route path="content/testimonials" element={<P permission="content.view"><TestimonialsPage /></P>} />
          <Route path="content/team-page" element={<P permission="content.view"><TeamCmsPage /></P>} />
          <Route path="team" element={<P permission="team.manage"><TeamPage /></P>} />
          <Route path="team/roles" element={<P permission="team.manage"><RolesPage /></P>} />
          <Route path="careers" element={<P permission="team.manage"><CareersRolesPage /></P>} />
          <Route path="careers/:slug" element={<P permission="team.manage"><CareersRolePage /></P>} />
          <Route path="careers/:slug/:id" element={<P permission="team.manage"><CareersApplicationPage /></P>} />
          <Route path="operations/automations" element={<P permission="settings.manage"><WorkflowsPage /></P>} />
          <Route path="automations" element={<Navigate to="/operations/automations" replace />} />
          <Route path="settings" element={<Navigate to="/settings/company" replace />} />
          <Route path="settings/company" element={<P permission="settings.manage"><CompanySettingsPage /></P>} />
          <Route path="settings/integrations" element={<P permission="settings.manage"><IntegrationsSettingsPage /></P>} />
          <Route path="settings/security" element={<P permission="settings.manage"><SecuritySettingsPage /></P>} />
          <Route path="chat-dashboard" element={<Navigate to="/inbox" replace />} />
          <Route path="demo-requests" element={<P permission="leads.view"><DemoRequestsPage /></P>} />
          <Route path="dashboard/ai-agent" element={<Navigate to="/inbox" replace />} />
          <Route path="ai/campaigns" element={<Navigate to="/inbox" replace />} />
          <Route path="documentation" element={<DocumentationPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
