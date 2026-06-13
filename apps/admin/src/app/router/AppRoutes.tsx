import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { RequirePermission } from "./RequirePermission";
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import NotFound from "@/pages/not-found";

const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
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
const PaymentsPage = lazy(() => import("@/features/finance/pages/PaymentsPage"));
const TasksPage = lazy(() => import("@/features/delivery/pages/TasksPage"));
const FilesPage = lazy(() => import("@/features/delivery/pages/FilesPage"));
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const ChatDashboard = lazy(() => import("@/pages/chat-dashboard"));
const DemoRequests = lazy(() => import("@/pages/demo-requests"));
const AiAgent = lazy(() => import("@/pages/ai-agent"));
const Documentation = lazy(() => import("@/pages/documentation"));

function PageLoader() {
  return (
    <div className="p-8 text-center text-sm text-stone-500">Loading…</div>
  );
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
          <Route path="blogs" element={<P permission="content.view"><BlogsPage /></P>} />
          <Route path="content/services" element={<P permission="content.view"><ServicesPage /></P>} />
          <Route path="content/portfolio" element={<P permission="content.view"><PortfolioPage /></P>} />
          <Route path="team" element={<P permission="team.manage"><TeamPage /></P>} />
          <Route path="team/roles" element={<P permission="team.manage"><RolesPage /></P>} />
          <Route path="settings" element={<P permission="settings.manage"><SettingsPage /></P>} />
          <Route path="chat-dashboard" element={<P permission="leads.view"><ChatDashboard /></P>} />
          <Route path="demo-requests" element={<P permission="leads.view"><DemoRequests /></P>} />
          <Route path="dashboard/ai-agent" element={<P permission="leads.edit"><AiAgent /></P>} />
          <Route path="documentation" element={<Documentation />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
