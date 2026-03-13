import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, ExternalLink, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PublishWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  css: string;
  js: string;
  defaultName?: string;
  websiteId?: string | null;
}

export default function PublishWebsiteDialog({ open, onOpenChange, html, css, js, defaultName, websiteId }: PublishWebsiteDialogProps) {
  const [projectName, setProjectName] = useState(defaultName?.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "");
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!projectName.trim()) { toast.error("Enter a project name"); return; }
    setPublishing(true);
    setPublishedUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const sanitized = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const fileName = `${session.user.id}/${sanitized}.html`;

      // Build full HTML
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>${css || ""}</style>
</head>
<body>
${html}
<script>${js || ""}<\/script>
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: "text/html" });
      const file = new File([blob], `${sanitized}.html`, { type: "text/html" });

      const { error: uploadError } = await supabase.storage
        .from("hosted-websites")
        .upload(fileName, file, { upsert: true, contentType: "text/html" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("hosted-websites")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setPublishedUrl(publicUrl);

      // Update website record with deployed URL
      if (websiteId) {
        await supabase.from("websites").update({ deployed_url: publicUrl } as any).eq("id", websiteId);
      }

      toast.success("🌐 Website published successfully!");
    } catch (err: any) {
      console.error("Publish error:", err);
      toast.error(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const copyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      toast.success("URL copied!");
    }
  };

  const previewSlug = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" />
            Publish Website (Free)
          </DialogTitle>
        </DialogHeader>

        {publishedUrl ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">Published Successfully! 🎉</h3>
            <p className="text-sm text-muted-foreground mb-4">Your website is now live at:</p>
            <div className="flex items-center gap-2 justify-center">
              <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors max-w-[280px] truncate">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{publishedUrl}</span>
              </a>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={copyUrl}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">No API key required • Free hosting • Instant publish</p>
            <div className="mt-5">
              <Button variant="outline" onClick={() => { setPublishedUrl(null); onOpenChange(false); }}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-foreground font-medium">🆓 Free Hosting — No API Key Required!</p>
              <p className="text-[11px] text-muted-foreground mt-1">Your website will be published instantly with a public URL.</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="my-awesome-site"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                File: <span className="font-mono text-foreground">{previewSlug || "your-project"}.html</span>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handlePublish} disabled={publishing || !projectName.trim()} className="gradient-bg border-0 text-primary-foreground gap-2">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                {publishing ? "Publishing..." : "Publish Free"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
