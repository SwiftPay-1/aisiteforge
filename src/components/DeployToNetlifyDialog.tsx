import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DeployToNetlifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  css: string;
  js: string;
  defaultName?: string;
}

export default function DeployToNetlifyDialog({ open, onOpenChange, html, css, js, defaultName }: DeployToNetlifyDialogProps) {
  const [projectName, setProjectName] = useState(defaultName?.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") || "");
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!projectName.trim()) { toast.error("Enter a project name"); return; }
    setDeploying(true);
    setDeployedUrl(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/deploy-to-netlify`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectName: projectName.trim(), html, css, js }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deploy failed");

      setDeployedUrl(result.url);
      toast.success("🚀 Website deployed to Netlify!");
    } catch (err: any) {
      console.error("Deploy error:", err);
      toast.error(err.message || "Failed to deploy");
    } finally {
      setDeploying(false);
    }
  };

  const previewSlug = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Deploy to Netlify
          </DialogTitle>
        </DialogHeader>

        {deployedUrl ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">Deployed Successfully! 🎉</h3>
            <p className="text-sm text-muted-foreground mb-4">Your website is now live at:</p>
            <a href={deployedUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <ExternalLink className="h-4 w-4" />
              {deployedUrl}
            </a>
            <div className="mt-6">
              <Button variant="outline" onClick={() => { setDeployedUrl(null); onOpenChange(false); }}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="my-awesome-site"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Your site URL: <span className="font-mono text-foreground">{previewSlug || "your-project"}-faith.netlify.app</span>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleDeploy} disabled={deploying || !projectName.trim()} className="gradient-bg border-0 text-primary-foreground gap-2">
                {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {deploying ? "Deploying..." : "Deploy"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
