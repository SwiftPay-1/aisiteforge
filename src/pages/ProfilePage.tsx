import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { User, Camera } from "lucide-react";
import ProBadge from "@/components/ProBadge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [plan, setPlan] = useState("free");
  const [websiteCount, setWebsiteCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("websites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (profile) {
        setName(profile.full_name || "");
        setPhone(profile.phone || "");
        setCompany(profile.company || "");
        setBio(profile.bio || "");
        setPlan(profile.plan || "free");
      }
      setWebsiteCount(count || 0);
    };
    fetch();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, phone, company, bio, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else toast.success("Profile updated");
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Profile</h1>
        <p className="text-muted-foreground mb-8">Manage your account settings.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-card border border-border card-shadow"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center text-2xl font-display font-bold text-primary-foreground">
            {name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-display font-semibold text-lg">{name || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${plan === "pro" ? "gradient-bg text-primary-foreground" : "bg-muted"}`}>
              {plan === "pro" ? "Pro Plan" : "Free Plan"}
            </span>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="opacity-60" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880..." />
          </div>
          <div>
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Websites</p>
              <p className="font-display font-bold text-lg">{websiteCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Joined</p>
              <p className="font-display font-bold text-lg">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
            </div>
          </div>
          <Button type="submit" className="gradient-bg border-0 text-primary-foreground" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
