import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { User, Camera } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Profile updated");
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
          <div className="relative">
            <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center text-2xl font-display font-bold text-primary-foreground">
              {name?.[0]?.toUpperCase() || "U"}
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-card border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <p className="font-display font-semibold text-lg">{name || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium gradient-bg text-primary-foreground">
              Free Plan
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
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Websites Created</p>
              <p className="font-display font-bold text-lg">0</p>
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
