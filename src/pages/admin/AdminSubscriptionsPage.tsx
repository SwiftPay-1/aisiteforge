import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, UserCheck, UserX, ArrowUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("subscription_plans").select("*").order("sort_order"),
    ]).then(([{ data: p }, { data: pl }]) => {
      setProfiles(p || []);
      setPlans(pl || []);
      setLoading(false);
    });
  }, []);

  const handleQuickPlanToggle = async (profile: any) => {
    const targetPlan = profile.plan === "pro" ? "free" : "pro";
    const updates: any = { plan: targetPlan };
    if (targetPlan === "free") { updates.plan_id = null; updates.plan_expires_at = null; }
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", profile.user_id);
    if (error) { toast.error("Failed"); return; }
    setProfiles(prev => prev.map(p => p.user_id === profile.user_id ? { ...p, ...updates } : p));
    toast.success(`${profile.full_name || "User"} → ${targetPlan === "pro" ? "Pro" : "Free"}`);
  };

  const proUsers = profiles.filter(p => p.plan === "pro");
  const freeUsers = profiles.filter(p => p.plan !== "pro");
  const filtered = profiles.filter(p => (p.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">Subscriptions</h1>
        </div>
      </motion.div>

      {/* Quick toggle cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="p-5 rounded-2xl bg-card border border-border card-shadow">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-5 w-5 text-yellow-500" />
            <h3 className="font-display font-semibold">Pro Users ({proUsers.length})</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Click to downgrade</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {proUsers.map(p => (
              <button key={p.id} onClick={() => handleQuickPlanToggle(p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all">
                <Crown className="h-3 w-3" /> {p.full_name || "Unnamed"} <X className="h-3 w-3 opacity-50" />
              </button>
            ))}
            {proUsers.length === 0 && <p className="text-xs text-muted-foreground">No pro users</p>}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border card-shadow">
          <div className="flex items-center gap-2 mb-3">
            <UserX className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-display font-semibold">Free Users ({freeUsers.length})</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Click to upgrade</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {freeUsers.map(p => (
              <button key={p.id} onClick={() => handleQuickPlanToggle(p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-accent/10 hover:text-accent hover:border-accent/20 transition-all">
                {p.full_name || "Unnamed"} <Crown className="h-3 w-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left font-medium">User</th>
                <th className="p-4 text-left font-medium">Plan</th>
                <th className="p-4 text-left font-medium hidden sm:table-cell">Expires</th>
                <th className="p-4 text-left font-medium">Switch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{u.full_name || "—"}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.plan === "pro" ? "gradient-bg text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {u.plan === "pro" ? "⭐ Pro" : "Free"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground text-xs hidden sm:table-cell">
                    {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant={u.plan === "pro" ? "outline" : "default"}
                      className={u.plan === "pro" ? "text-destructive border-destructive/30 hover:bg-destructive/10" : "gradient-bg border-0 text-primary-foreground"}
                      onClick={() => handleQuickPlanToggle(u)}>
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      {u.plan === "pro" ? "→ Free" : "→ Pro"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
