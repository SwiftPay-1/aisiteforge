import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import GenerateWebsitePage from "./pages/GenerateWebsitePage";
import MyWebsitesPage from "./pages/MyWebsitesPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentPage from "./pages/PaymentPage";
import AdminPage from "./pages/AdminPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAIProvidersPage from "./pages/admin/AdminAIProvidersPage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import AdminWebsitesPage from "./pages/admin/AdminWebsitesPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminSystemPromptsPage from "./pages/admin/AdminSystemPromptsPage";
import ProjectPage from "./pages/ProjectPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || "/"}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="generate" element={<GenerateWebsitePage />} />
              <Route path="websites" element={<MyWebsitesPage />} />
              <Route path="project/:id" element={<ProjectPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="payment" element={<PaymentPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/ai-providers" element={<AdminAIProvidersPage />} />
              <Route path="admin/plans" element={<AdminPlansPage />} />
              <Route path="admin/subscriptions" element={<AdminSubscriptionsPage />} />
              <Route path="admin/websites" element={<AdminWebsitesPage />} />
              <Route path="admin/payments" element={<AdminPaymentsPage />} />
              <Route path="admin/system-prompts" element={<AdminSystemPromptsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
