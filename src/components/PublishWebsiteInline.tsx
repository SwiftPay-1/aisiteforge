import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, ExternalLink, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PublishWebsiteInlineProps {
  html: string;
  css: string;
  js: string;
  defaultName?: string;
  websiteId?: string | null;
}

export default function PublishWebsiteInline({ html, css, js, defaultName, websiteId }: PublishWebsiteInlineProps) {
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

      // Use the edge function URL for serving
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/functions/v1/serve-website?path=${encodeURIComponent(fileName)}`;
      setPublishedUrl(publicUrl);

      // Update website record
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

  if (publishedUrl) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-foreground">Published Live! 🎉</span>
        </div>
        <div className="flex items-center gap-1.5">
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition-colors truncate">
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">Open Live Site</span>
          </a>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={copyUrl}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-xl bg-muted/80 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-3.5 w-3.5 text-accent" />
        <span className="text-[11px] font-semibold">Publish to Web (Free)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          placeholder="project-name"
          className="h-7 text-[11px] flex-1"
        />
        <Button 
          onClick={handlePublish} 
          disabled={publishing || !projectName.trim()} 
          size="sm"
          className="h-7 text-[10px] gradient-bg border-0 text-primary-foreground gap-1 px-3"
        >
          {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
          {publishing ? "..." : "Publish"}
        </Button>
      </div>
    </div>
  );
}
