import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import WorkspaceCharts from "@/pages/WorkspaceCharts";
import EmbedChart from "@/pages/EmbedChart";
import NotFound from "@/pages/NotFound";
import NotionCallback from "@/pages/NotionCallback";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated } = useAppStore();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/notion/callback" element={<NotionCallback />} />
      <Route path="/embed/:chartId" element={<EmbedChart />} />

      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspace/:workspaceId/charts" element={<WorkspaceCharts />} />
          <Route path="/charts" element={<Dashboard />} />
          <Route path="/settings" element={<Dashboard />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
