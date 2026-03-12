import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newPlan, setNewPlan] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("*").then(({ data }) => {
      setProfiles(data || []);
      setLoading(false);
    });
  }, []);

  const handleUpdatePlan = async () => {
    if (!editingUser || !newPlan) return;
    const { error } = await supabase.from("profiles").update({ plan: newPlan }).eq("user_id", editingUser.user_id);
    if (error) { toast.error("Failed to update plan"); return; }
    setProfiles((prev) => prev.map((p) => p.user_id === editingUser.user_id ? { ...p, plan: newPlan } : p));
    toast.success(`Plan updated to ${newPlan}`);
    setEditingUser(null);
  };

  const filtered = profiles.filter((p) =>
    (p.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.plan || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <span className="text-sm text-muted-foreground">({profiles.length})</span>
        </div>
      </motion.div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left font-medium">Name</th>
                <th className="p-4 text-left font-medium">Plan</th>
                <th className="p-4 text-left font-medium hidden sm:table-cell">Joined</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{u.full_name || "—"}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.plan === "pro" ? "gradient-bg text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {u.plan === "pro" ? "⭐ Pro" : "Free"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditingUser(u); setNewPlan(u.plan || "free"); }}>
                      <Edit className="h-3 w-3" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Edit User Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">User: <strong>{editingUser?.full_name || "—"}</strong></p>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</label>
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
    </div>
  );
}
