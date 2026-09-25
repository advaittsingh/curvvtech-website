import PortalShell from "@/components/PortalShell";
import { WorkspaceProvider } from "@/lib/workspace";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <PortalShell>{children}</PortalShell>
    </WorkspaceProvider>
  );
}
