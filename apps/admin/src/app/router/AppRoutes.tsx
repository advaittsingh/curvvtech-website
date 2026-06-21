import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { RequirePermission } from "./RequirePermission";
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import NotFound from "@/pages/not-found";

const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const CeoCommandCenterPage = lazy(() => import("@/features/ceo/pages/CeoCommandCenterPage"));
const AiCommandCenterPage = lazy(() => import("@/features/ai/pages/AiCommandCenterPage"));
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
const FilesPage = lazy(() => import("@/features/delivery/pages/FilesPage"));
const SopsPage = lazy(() => import("@/features/operations/pages/SopsPage"));
const KnowledgePage = lazy(() => import("@/features/operations/pages/KnowledgePage"));
const AssetsPage = lazy(() => import("@/features/operations/pages/AssetsPage"));
const WorkflowsPage = lazy(() => import("@/features/automations/pages/WorkflowsPage"));
const CompanySettingsPage = lazy(() => import("@/features/settings/pages/CompanySettingsPage"));
const SecuritySettingsPage = lazy(() => import("@/features/settings/pages/SecuritySettingsPage"));
const IntegrationsSettingsPage = lazy(() => import("@/features/settings/pages/IntegrationsSettingsPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const ChatConversationsPage = lazy(() => import("@/features/ai/pages/ChatConversationsPage"));
const DemoRequestsPage = lazy(() => import("@/features/leads/pages/DemoRequestsPage"));
const AiAgent = lazy(() => import("@/pages/ai-agent"));
const DocumentationPage = lazy(() => import("@/features/settings/pages/DocumentationPage"));

function PageLoader() {
  return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
}

function P({ permission, children }: { permission?: import("@/types/auth").Permission; children: React.ReactNode }) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth/sign-in" element={<SignIn />} />
        <Route path="/auth/sign-up" element={<SignUp />} />

        <Route element={<AdminLayout />}>
          <Route index element={<P permission="dashboard.view"><DashboardPage /></P>} />
          <Route path="ceo" element={<P permission="dashboard.view"><CeoCommandCenterPage /></P>} />
          <Route path="ai" element={<P permission="dashboard.view"><AiCommandCenterPage /></P>} />
          <Route path="ai/conversations" element={<P permission="leads.view"><ChatConversationsPage /></P>} />
          <Route path="ai/campaigns" element={<P permission="leads.edit"><AiAgent /></P>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="leads" element={<P permission="leads.view"><LeadsListPage /></P>} />
          <Route path="leads/:id" element={<P permission="leads.view"><LeadDetailPage /></P>} />
          <Route path="clients" element={<P permission="clients.view"><ClientsListPage /></P>} />
          <Route path="clients/:id" element={<P permission="clients.view"><ClientDetailPage /></P>} />
          <Route path="proposals" element={<P permission="proposals.view"><ProposalsListPage /></P>} />
          <Route path="proposals/:id" element={<P permission="proposals.view"><ProposalBuilderPage /></P>} />
          <Route path="projects" element={<P permission="projects.view"><ProjectsListPage /></P>} />
          <Route path="projects/:id" element={<P permission="projects.view"><ProjectDetailPage /></P>} />
          <Route path="tasks" element={<P permission="projects.view"><TasksPage /></P>} />
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
          <Route path="operations/sops" element={<P permission="settings.manage"><SopsPage /></P>} />
          <Route path="operations/knowledge" element={<P permission="settings.manage"><KnowledgePage /></P>} />
          <Route path="operations/assets" element={<P permission="projects.view"><AssetsPage /></P>} />
          <Route path="operations/automations" element={<P permission="settings.manage"><WorkflowsPage /></P>} />
          <Route path="automations" element={<Navigate to="/operations/automations" replace />} />
          <Route path="settings" element={<Navigate to="/settings/company" replace />} />
          <Route path="settings/company" element={<P permission="settings.manage"><CompanySettingsPage /></P>} />
          <Route path="settings/integrations" element={<P permission="settings.manage"><IntegrationsSettingsPage /></P>} />
          <Route path="settings/security" element={<P permission="settings.manage"><SecuritySettingsPage /></P>} />
          <Route path="chat-dashboard" element={<Navigate to="/ai/conversations" replace />} />
          <Route path="demo-requests" element={<P permission="leads.view"><DemoRequestsPage /></P>} />
          <Route path="dashboard/ai-agent" element={<Navigate to="/ai/campaigns" replace />} />
          <Route path="documentation" element={<DocumentationPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
