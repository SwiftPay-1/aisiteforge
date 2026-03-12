import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminNetlifyPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load current key from site_settings or show placeholder
    const load = async () => {
      const { data } = await supabase.from("site_settings" as any).select("value").eq("key", "netlify_api_key").single();
      if (data) setApiKey((data as any).value || "");
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert to site_settings
      const { error } = await supabase.from("site_settings" as any).upsert(
        { key: "netlify_api_key", value: apiKey, updated_at: new Date().toISOString() } as any,
        { onConflict: "key" }
      );
      if (error) throw error;
      toast.success("Netlify API key saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">Netlify Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage Netlify deployment API key for user website hosting.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-card border border-border card-shadow max-w-lg">
        <h3 className="font-display font-semibold mb-4">Netlify API Key</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Personal Access Token</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="nfp_xxxxxxxxxx"
                className="font-mono text-sm"
              />
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Get your token from <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Netlify Dashboard → Personal Access Tokens</a>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong> Users can deploy their generated websites to Netlify with a custom subdomain. 
              The URL format is: <span className="font-mono text-foreground">projectname-faith.netlify.app</span>
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !apiKey.trim()} className="gradient-bg border-0 text-primary-foreground gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save API Key"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
