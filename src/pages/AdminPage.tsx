import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Globe, CreditCard, BarChart3, Check, X, Search, Shield, Crown, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newPlan, setNewPlan] = useState("");

  useEffect(() => {
    checkAdminAndFetch();
  }, [user]);

  const checkAdminAndFetch = async () => {
    if (!user) return;
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);

    const [{ data: p }, { data: w }, { data: pay }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("websites").select("*"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);

    setProfiles(p || []);
    setWebsites(w || []);
    setPayments(pay || []);
    setLoading(false);
  };

  const handlePaymentAction = async (paymentId: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("payments").update({ status: action }).eq("id", paymentId);
    if (error) { toast.error("Failed to update payment"); return; }

    if (action === "approved") {
      const payment = payments.find((p) => p.id === paymentId);
      if (payment) {
        await supabase.from("profiles").update({ plan: "pro" }).eq("user_id", payment.user_id);
        setProfiles((prev) => prev.map((p) => p.user_id === payment.user_id ? { ...p, plan: "pro" } : p));
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

  const stats = [
    { label: "Total Users", value: String(profiles.length), icon: Users },
    { label: "Total Websites", value: String(websites.length), icon: Globe },
    { label: "Pro Users", value: String(profiles.filter((p) => p.plan === "pro").length), icon: Crown },
    { label: "Pending Payments", value: String(payments.filter((p) => p.status === "pending").length), icon: BarChart3 },
  ];

  const filtered = (arr: any[], keys: string[]) =>
    arr.filter((item) =>
      keys.some((k) => item[k]?.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-muted-foreground mb-8">Manage users, websites, and payments.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-2xl bg-card border border-border card-shadow"
          >
            <stat.icon className="h-6 w-6 mb-2 text-primary" />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

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
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{u.full_name || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.plan === "pro" ? "gradient-bg text-primary-foreground" : "bg-muted"}`}>
                        {u.plan === "pro" ? "Pro" : "Free"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingUser(u); setNewPlan(u.plan || "free"); }}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Edit Plan
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

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
                  <tr key={w.id} className="border-b border-border last:border-0">
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

        <TabsContent value="payments">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium">TXN ID</th>
                  <th className="p-3 text-left font-medium">Sender</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered(payments, ["transaction_id", "sender_number"]).map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{p.transaction_id}</td>
                    <td className="p-3 text-muted-foreground">{p.sender_number}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">User: <strong>{editingUser?.full_name || "—"}</strong></p>
              <p className="text-sm text-muted-foreground">Current: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${editingUser?.plan === "pro" ? "gradient-bg text-primary-foreground" : "bg-muted"}`}>{editingUser?.plan || "free"}</span></p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Plan</label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
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
    </div>
  );
}
