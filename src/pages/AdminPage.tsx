import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Globe, CreditCard, Check, X, Search, Shield, Crown, Edit, Code2, Upload, ArrowUpDown, UserCheck, UserX, Package, Plus, Trash2, ToggleLeft, Bot } from "lucide-react";
import AIProvidersTab from "@/components/admin/AIProvidersTab";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AdminPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newPlan, setNewPlan] = useState("");

  // Plan editing
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ name: "", duration_days: 0, price: 0, features: "", is_active: true, sort_order: 0 });

  // Developer settings
  const [devSettings, setDevSettings] = useState({
    id: "", name: "", bio: "", avatar_url: "", email: "", website_url: "", github_url: "", twitter_url: "",
  });
  const [devDialogOpen, setDevDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingDev, setSavingDev] = useState(false);

  useEffect(() => { checkAdminAndFetch(); }, [user]);

  const checkAdminAndFetch = async () => {
    if (!user) return;
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) { setIsAdmin(false); setLoading(false); return; }
    setIsAdmin(true);

    const [{ data: p }, { data: w }, { data: pay }, { data: devData }, { data: plansData }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("websites").select("*"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("developer_settings").select("*").limit(1).single(),
      supabase.from("subscription_plans").select("*").order("sort_order"),
    ]);

    setProfiles(p || []);
    setWebsites(w || []);
    setPayments(pay || []);
    setPlans(plansData || []);
    if (devData) setDevSettings(devData as any);
    setLoading(false);
  };

  const handlePaymentAction = async (paymentId: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("payments").update({ status: action }).eq("id", paymentId);
    if (error) { toast.error("Failed to update payment"); return; }
    if (action === "approved") {
      const payment = payments.find((p) => p.id === paymentId);
      if (payment) {
        const plan = plans.find(pl => pl.id === payment.plan_id);
        const expiresAt = plan ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null;
        await supabase.from("profiles").update({ plan: "pro", plan_id: payment.plan_id, plan_expires_at: expiresAt }).eq("user_id", payment.user_id);
        setProfiles((prev) => prev.map((p) => p.user_id === payment.user_id ? { ...p, plan: "pro", plan_id: payment.plan_id, plan_expires_at: expiresAt } : p));
      }
    }
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: action } : p)));
    toast.success(`Payment ${action}`);
  };

  const handleUpdatePlan = async () => {
    if (!editingUser || !newPlan) return;
    const { error } = await supabase.from("profiles").update({ plan: newPlan }).eq("user_id", editingUser.user_id);
    if (error) { toast.error("Failed to update plan"); return; }
    setProfiles((prev) => prev.map((p) => p.user_id === editingUser.user_id ? { ...p, plan: newPlan } : p));
    toast.success(`Plan updated to ${newPlan}`);
    setEditingUser(null);
  };

  const handleQuickPlanToggle = async (profile: any) => {
    const targetPlan = profile.plan === "pro" ? "free" : "pro";
    const updates: any = { plan: targetPlan };
    if (targetPlan === "free") { updates.plan_id = null; updates.plan_expires_at = null; }
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", profile.user_id);
    if (error) { toast.error("Failed to update plan"); return; }
    setProfiles((prev) => prev.map((p) => p.user_id === profile.user_id ? { ...p, ...updates } : p));
    toast.success(`${profile.full_name || "User"} → ${targetPlan === "pro" ? "Pro" : "Free"}`);
  };

  // Plan CRUD
  const openPlanEditor = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({ name: plan.name, duration_days: plan.duration_days, price: Number(plan.price), features: (plan.features || []).join("\n"), is_active: plan.is_active, sort_order: plan.sort_order });
    } else {
      setEditingPlan("new");
      setPlanForm({ name: "", duration_days: 7, price: 0, features: "", is_active: true, sort_order: plans.length + 1 });
    }
  };

  const handleSavePlan = async () => {
    const featuresArr = planForm.features.split("\n").map(f => f.trim()).filter(Boolean);
    const payload = { name: planForm.name, duration_days: planForm.duration_days, price: planForm.price, features: featuresArr, is_active: planForm.is_active, sort_order: planForm.sort_order, updated_at: new Date().toISOString() };

    if (editingPlan === "new") {
      const { data, error } = await supabase.from("subscription_plans").insert(payload).select().single();
      if (error) { toast.error("Failed to create plan"); return; }
      setPlans(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      toast.success("Plan created!");
    } else {
      const { error } = await supabase.from("subscription_plans").update(payload).eq("id", editingPlan.id);
      if (error) { toast.error("Failed to update plan"); return; }
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...payload, features: featuresArr } : p).sort((a, b) => a.sort_order - b.sort_order));
      toast.success("Plan updated!");
    }
    setEditingPlan(null);
  };

  const handleDeletePlan = async (planId: string) => {
    const { error } = await supabase.from("subscription_plans").delete().eq("id", planId);
    if (error) { toast.error("Failed to delete plan"); return; }
    setPlans(prev => prev.filter(p => p.id !== planId));
    toast.success("Plan deleted");
  };

  const handleTogglePlanActive = async (plan: any) => {
    const { error } = await supabase.from("subscription_plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
    if (error) { toast.error("Failed"); return; }
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `developer/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setDevSettings((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Avatar uploaded");
  };

  const handleSaveDevSettings = async () => {
    setSavingDev(true);
    const { id, ...rest } = devSettings;
    const { error } = await supabase.from("developer_settings").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Failed to save");
    else { toast.success("Developer info updated!"); setDevDialogOpen(false); }
    setSavingDev(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="h-16 w-16 mx-auto mb-4 text-destructive/30" />
        <h2 className="font-display text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
      </div>
    );
  }

  const proCount = profiles.filter((p) => p.plan === "pro").length;
  const freeCount = profiles.filter((p) => p.plan !== "pro").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  const stats = [
    { label: "Total Users", value: String(profiles.length), icon: Users, color: "text-primary" },
    { label: "Pro Users", value: String(proCount), icon: Crown, color: "text-yellow-500" },
    { label: "Free Users", value: String(freeCount), icon: Users, color: "text-muted-foreground" },
    { label: "Total Websites", value: String(websites.length), icon: Globe, color: "text-accent" },
    { label: "Pending Payments", value: String(pendingCount), icon: CreditCard, color: pendingCount > 0 ? "text-yellow-500" : "text-muted-foreground" },
  ];

  const filtered = (arr: any[], keys: string[]) =>
    arr.filter((item) => keys.some((k) => item[k]?.toString().toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setDevDialogOpen(true)}>
            <Code2 className="h-4 w-4" /> Edit Developer Info
          </Button>
        </div>
        <p className="text-muted-foreground mb-6">Manage users, subscriptions, websites, and payments.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-4 rounded-2xl bg-card border border-border card-shadow">
            <stat.icon className={`h-5 w-5 mb-1.5 ${stat.color}`} />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-muted flex-wrap">
          <TabsTrigger value="users" className="gap-1"><Users className="h-3 w-3" /> Users</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1"><Bot className="h-3 w-3" /> AI Providers</TabsTrigger>
          <TabsTrigger value="plans" className="gap-1"><Package className="h-3 w-3" /> Plans</TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1"><Crown className="h-3 w-3" /> Subscriptions</TabsTrigger>
          <TabsTrigger value="websites" className="gap-1"><Globe className="h-3 w-3" /> Websites</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1"><CreditCard className="h-3 w-3" /> Payments</TabsTrigger>
        </TabsList>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {/* Users tab */}
        <TabsContent value="users">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Plan</th>
                  <th className="p-3 text-left font-medium">Joined</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered(profiles, ["full_name", "plan"]).map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{u.full_name || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.plan === "pro" ? "gradient-bg text-primary-foreground" : "bg-muted"}`}>
                        {u.plan === "pro" ? "⭐ Pro" : "Free"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={() => { setEditingUser(u); setNewPlan(u.plan || "free"); }}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* AI Providers tab */}
        <TabsContent value="ai">
          <AIProvidersTab />
        </TabsContent>

        {/* Plans tab - NEW */}
        <TabsContent value="plans">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Subscription Plans</h3>
              <Button size="sm" className="gradient-bg border-0 text-primary-foreground gap-1" onClick={() => openPlanEditor()}>
                <Plus className="h-3.5 w-3.5" /> Add Plan
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`relative p-5 rounded-2xl border-2 bg-card transition-all ${plan.is_active ? "border-border" : "border-destructive/20 opacity-60"}`}>
                  {!plan.is_active && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive">Inactive</span>
                  )}
                  <h4 className="font-display font-bold mb-1">{plan.name}</h4>
                  <p className="text-2xl font-display font-bold text-primary">৳{plan.price}</p>
                  <p className="text-xs text-muted-foreground mb-3">{plan.duration_days} days</p>
                  <ul className="space-y-1 mb-4">
                    {(plan.features || []).map((f: string) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-accent flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openPlanEditor(plan)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleTogglePlanActive(plan)}>
                      <ToggleLeft className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeletePlan(plan.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Subscriptions tab */}
        <TabsContent value="subscriptions">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-card border border-border card-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-display font-semibold text-sm">Pro Users ({proCount})</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Click to downgrade to Free</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {profiles.filter(p => p.plan === "pro").map(p => (
                    <button key={p.id} onClick={() => handleQuickPlanToggle(p)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all">
                      <Crown className="h-3 w-3" />
                      {p.full_name || "Unnamed"}
                      <X className="h-3 w-3 opacity-50" />
                    </button>
                  ))}
                  {proCount === 0 && <p className="text-xs text-muted-foreground">No pro users yet</p>}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border card-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <UserX className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-display font-semibold text-sm">Free Users ({freeCount})</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Click to upgrade to Pro</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {profiles.filter(p => p.plan !== "pro").map(p => (
                    <button key={p.id} onClick={() => handleQuickPlanToggle(p)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-accent/10 hover:text-accent hover:border-accent/20 transition-all">
                      {p.full_name || "Unnamed"}
                      <Crown className="h-3 w-3 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-3 text-left font-medium">User</th>
                    <th className="p-3 text-left font-medium">Plan</th>
                    <th className="p-3 text-left font-medium">Expires</th>
                    <th className="p-3 text-left font-medium">Quick Switch</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered(profiles, ["full_name", "plan"]).map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{u.full_name || "—"}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.plan === "pro" ? "gradient-bg text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {u.plan === "pro" ? "⭐ Pro" : "Free"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
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
        </TabsContent>

        {/* Websites tab */}
        <TabsContent value="websites">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium">Website</th>
                  <th className="p-3 text-left font-medium">Category</th>
                  <th className="p-3 text-left font-medium">Theme</th>
                  <th className="p-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered(websites, ["name", "category"]).map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{w.name}</td>
                    <td className="p-3 text-muted-foreground">{w.category}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{w.theme}</span></td>
                    <td className="p-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Payments tab */}
        <TabsContent value="payments">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium">TXN ID</th>
                  <th className="p-3 text-left font-medium">Sender</th>
                  <th className="p-3 text-left font-medium">Amount</th>
                  <th className="p-3 text-left font-medium">Plan</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered(payments, ["transaction_id", "sender_number"]).map((p) => {
                  const planName = plans.find(pl => pl.id === p.plan_id)?.name || "—";
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{p.transaction_id}</td>
                      <td className="p-3 text-muted-foreground">{p.sender_number}</td>
                      <td className="p-3 font-medium">৳{p.amount}</td>
                      <td className="p-3 text-xs">{planName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === "approved" ? "bg-accent/10 text-accent" :
                          p.status === "rejected" ? "bg-destructive/10 text-destructive" :
                          "bg-yellow-500/10 text-yellow-600"
                        }`}>{p.status}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="p-3 flex gap-1">
                        {p.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" className="text-accent" onClick={() => handlePaymentAction(p.id, "approved")}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handlePaymentAction(p.id, "rejected")}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Plan Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">User: <strong>{editingUser?.full_name || "—"}</strong></p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Plan</label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">⭐ Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdatePlan}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingPlan === "new" ? "Create Plan" : "Edit Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Plan Name</Label>
              <Input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="e.g. 7 Days Starter" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Duration (days)</Label>
                <Input type="number" value={planForm.duration_days} onChange={e => setPlanForm(p => ({ ...p, duration_days: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Price (৳)</Label>
                <Input type="number" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Features (one per line)</Label>
              <Textarea value={planForm.features} onChange={e => setPlanForm(p => ({ ...p, features: e.target.value }))} className="mt-1" rows={4} placeholder={"AI Website Generation\nAll Themes\nUnlimited Websites"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Sort Order</Label>
                <Input type="number" value={planForm.sort_order} onChange={e => setPlanForm(p => ({ ...p, sort_order: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={planForm.is_active} onCheckedChange={v => setPlanForm(p => ({ ...p, is_active: v }))} />
                <Label className="text-xs text-muted-foreground">{planForm.is_active ? "Active" : "Inactive"}</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
              <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleSavePlan}>
                {editingPlan === "new" ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Developer Info Dialog */}
      <Dialog open={devDialogOpen} onOpenChange={setDevDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Developer Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {devSettings.avatar_url ? (
                <img src={devSettings.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary/30" />
              ) : (
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-xl font-display font-bold text-primary-foreground">
                  {devSettings.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Profile Picture</Label>
                <div className="mt-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-sm transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>
            <div className="grid gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <Input value={devSettings.name} onChange={(e) => setDevSettings((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bio</Label>
                <Textarea value={devSettings.bio || ""} onChange={(e) => setDevSettings((p) => ({ ...p, bio: e.target.value }))} className="mt-1" rows={3} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={devSettings.email || ""} onChange={(e) => setDevSettings((p) => ({ ...p, email: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Website URL</Label>
                <Input value={devSettings.website_url || ""} onChange={(e) => setDevSettings((p) => ({ ...p, website_url: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">GitHub URL</Label>
                <Input value={devSettings.github_url || ""} onChange={(e) => setDevSettings((p) => ({ ...p, github_url: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Twitter/X URL</Label>
                <Input value={devSettings.twitter_url || ""} onChange={(e) => setDevSettings((p) => ({ ...p, twitter_url: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDevDialogOpen(false)}>Cancel</Button>
              <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleSaveDevSettings} disabled={savingDev}>
                {savingDev ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
