import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, LayoutDashboard, Globe, User, CreditCard, LogOut, Wand2, Shield, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import ProBadge from "@/components/ProBadge";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Generate Website", icon: Wand2, path: "/dashboard/generate" },
  { label: "My Websites", icon: Globe, path: "/dashboard/websites" },
  { label: "Projects", icon: FolderOpen, path: "/dashboard/websites" },
  { label: "Profile", icon: User, path: "/dashboard/profile" },
  { label: "Payment", icon: CreditCard, path: "/dashboard/payment" },
];

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single(),
        supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
      ]);
      setIsAdmin(!!roleData);
      setPlan(profileData?.plan || "free");
    };
    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        {/* Floating dots */}
        <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-primary/10 animate-float" />
        <div className="absolute top-[60%] right-[20%] w-3 h-3 rounded-full bg-accent/10 animate-float-delay" />
        <div className="absolute top-[40%] right-[35%] w-1.5 h-1.5 rounded-full bg-primary/15 animate-float" />
        <div className="absolute bottom-[25%] left-[40%] w-2.5 h-2.5 rounded-full bg-accent/10 animate-float-delay" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/80 backdrop-blur-sm hidden md:flex flex-col relative z-10">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="gradient-bg rounded-lg p-1.5">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">SiteForge AI</span>
            {plan === "pro" && <ProBadge />}
          </Link>
          <NotificationBell />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/dashboard/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith("/dashboard/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Log out
          </Button>
        </div>
      </aside>
      {/* Mobile header */}
      <div className="flex-1 flex flex-col relative z-10">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm">
          <Link to="/" className="flex items-center gap-2">
            <div className="gradient-bg rounded-lg p-1.5">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">SiteForge AI</span>
            {plan === "pro" && <ProBadge />}
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border flex justify-around py-2 z-50">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 text-xs px-2 py-1 ${
                location.pathname === item.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
