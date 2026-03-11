import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Eye, Trash2, Plus, Download, Code, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Website {
  id: string;
  name: string;
  category: string;
  theme: string;
  html_content: string;
  css_content: string;
  js_content: string;
  created_at: string;
}

export default function MyWebsitesPage() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewSite, setPreviewSite] = useState<Website | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchWebsites = async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setWebsites(data as Website[]);
      setLoading(false);
    };
    fetchWebsites();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("websites").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    toast.success("Website deleted");
  };

  const getFullHTML = (site: Website) => {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${site.name}</title><style>${site.css_content || ""}</style></head><body>${site.html_content || ""}<script>${site.js_content || ""}</script></body></html>`;
  };

  const handleDownload = (site: Website) => {
    const blob = new Blob([getFullHTML(site)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${site.name.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">My Websites</h1>
          <p className="text-muted-foreground">Manage your AI-generated websites.</p>
        </div>
        <Button className="gradient-bg border-0 text-primary-foreground" asChild>
          <Link to="/dashboard/generate"><Plus className="h-4 w-4 mr-2" /> New Website</Link>
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : websites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center py-20 rounded-2xl border-2 border-dashed border-border"
        >
          <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="font-display text-xl font-semibold mb-2">No websites yet</h2>
          <p className="text-muted-foreground mb-4">Create your first website with AI</p>
          <Button className="gradient-bg border-0 text-primary-foreground" asChild>
            <Link to="/dashboard/generate">Generate Website</Link>
          </Button>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site, i) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card border border-border card-shadow group overflow-hidden"
            >
              <div className="h-36 bg-muted relative overflow-hidden">
                <iframe
                  srcDoc={getFullHTML(site)}
                  className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                  sandbox=""
                  title={site.name}
                />
              </div>
              <div className="p-4">
                <h3 className="font-display font-semibold mb-0.5">{site.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{site.theme}</span>
                  <span className="text-xs text-muted-foreground">{site.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {new Date(site.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPreviewSite(site)}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(site)}>
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(site.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!previewSite} onOpenChange={() => setPreviewSite(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display">{previewSite?.name}</DialogTitle>
          </DialogHeader>
          {previewSite && (
            <iframe
              srcDoc={getFullHTML(previewSite)}
              className="w-full h-[70vh] rounded-lg border border-border bg-white"
              sandbox="allow-scripts"
              title={previewSite.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
