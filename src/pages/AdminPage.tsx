import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Globe, CreditCard, Shield, Crown, Code2, Package, Bot, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, pro: 0, free: 0, websites: 0, pending: 0 });

  // Developer settings
  const [devSettings, setDevSettings] = useState({
    id: "", name: "", bio: "", avatar_url: "", email: "", website_url: "", github_url: "", twitter_url: "",
  });
  const [devDialogOpen, setDevDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingDev, setSavingDev] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
      if (!roleData) { setIsAdmin(false); setLoading(false); return; }
      setIsAdmin(true);
      const [{ data: p }, { data: w }, { data: pay }, { data: devData }] = await Promise.all([
        supabase.from("profiles").select("plan"),
        supabase.from("websites").select("id"),
        supabase.from("payments").select("status"),
        supabase.from("developer_settings").select("*").limit(1).single(),
      ]);
      const profiles = p || [];
      const proCount = profiles.filter((pr: any) => pr.plan === "pro").length;
      setStats({
        users: profiles.length,
        pro: proCount,
        free: profiles.length - proCount,
        websites: (w || []).length,
        pending: (pay || []).filter((pm: any) => pm.status === "pending").length,
      });
      if (devData) setDevSettings(devData as any);
      setLoading(false);
    })();
  }, [user]);

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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!isAdmin) return (
    <div className="text-center py-20">
      <Shield className="h-16 w-16 mx-auto mb-4 text-destructive/30" />
      <h2 className="font-display text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground">You don't have admin privileges.</p>
    </div>
  );

  const sections = [
    { label: "Users", desc: `${stats.users} total users`, icon: Users, color: "from-blue-500 to-blue-600", route: "users" },
    { label: "AI Providers", desc: "Manage API keys & models", icon: Bot, color: "from-purple-500 to-purple-600", route: "ai-providers" },
    { label: "System Prompts", desc: "Manage AI generation prompts", icon: FileText, color: "from-violet-500 to-violet-600", route: "system-prompts" },
    { label: "Plans", desc: `${stats.pro + stats.free > 0 ? "Manage" : "Create"} subscription plans`, icon: Package, color: "from-emerald-500 to-emerald-600", route: "plans" },
    { label: "Subscriptions", desc: `${stats.pro} Pro, ${stats.free} Free`, icon: Crown, color: "from-yellow-500 to-yellow-600", route: "subscriptions" },
    { label: "Websites", desc: `${stats.websites} total websites`, icon: Globe, color: "from-cyan-500 to-cyan-600", route: "websites" },
    { label: "Payments", desc: `${stats.pending} pending`, icon: CreditCard, color: stats.pending > 0 ? "from-red-500 to-red-600" : "from-gray-500 to-gray-600", route: "payments" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Admin Panel</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setDevDialogOpen(true)}>
            <Code2 className="h-4 w-4" /> Developer Info
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Manage your platform from here.</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Users", value: stats.users, icon: Users },
          { label: "Pro", value: stats.pro, icon: Crown },
          { label: "Free", value: stats.free, icon: Users },
          { label: "Sites", value: stats.websites, icon: Globe },
          { label: "Pending", value: stats.pending, icon: CreditCard },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            className="p-3 sm:p-4 rounded-2xl bg-card border border-border card-shadow text-center">
            <s.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl sm:text-2xl font-display font-bold">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {sections.map((section, i) => (
          <motion.button
            key={section.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            onClick={() => navigate(`/dashboard/admin/${section.route}`)}
            className="group relative p-5 sm:p-6 rounded-2xl bg-card border-2 border-border hover:border-primary/30 card-shadow hover:shadow-lg transition-all text-left"
          >
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${section.color} mb-4`}>
              <section.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-display font-bold text-sm sm:text-base mb-1">{section.label}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{section.desc}</p>
            <div className="absolute top-4 right-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Developer Info Dialog */}
      <Dialog open={devDialogOpen} onOpenChange={setDevDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Developer Info</DialogTitle></DialogHeader>
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
              <div><Label className="text-xs text-muted-foreground">Display Name</Label><Input value={devSettings.name} onChange={(e) => setDevSettings((p) => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Bio</Label><Textarea value={devSettings.bio || ""} onChange={(e) => setDevSettings((p) => ({ ...p, bio: e.target.value }))} className="mt-1" rows={3} /></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={devSettings.email || ""} onChange={(e) => setDevSettings((p) => ({ ...p, email: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Website URL</Label><Input value={devSettings.website_url || ""} onChange={(e) => setDevSettings((p) => ({ ...p, website_url: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">GitHub URL</Label><Input value={devSettings.github_url || ""} onChange={(e) => setDevSettings((p) => ({ ...p, github_url: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Twitter/X URL</Label><Input value={devSettings.twitter_url || ""} onChange={(e) => setDevSettings((p) => ({ ...p, twitter_url: e.target.value }))} className="mt-1" /></div>
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
