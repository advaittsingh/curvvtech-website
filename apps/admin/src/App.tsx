import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/app/providers";
import { NotificationProvider } from "@/app/providers/NotificationProvider";
import { AppRoutes } from "@/app/router/AppRoutes";

function App() {
  return (
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <AppRoutes />
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HashRouter>
  );
}

export default App;
