import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Eye, Trash2, Plus, Download, Code, Save, Send, Wand2, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
  const [editSite, setEditSite] = useState<Website | null>(null);
  const [editHtml, setEditHtml] = useState("");
  const [editCss, setEditCss] = useState("");
  const [editJs, setEditJs] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiEditing, setAiEditing] = useState(false);

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
    if (error) { toast.error("Failed to delete"); return; }
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    toast.success("Website deleted");
  };

  const getFullHTML = (site: Website) => {
    const html = site.html_content || "";
    const css = site.css_content || "";
    const js = site.js_content || "";
    if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
      let full = html;
      if (css && (!html.includes("<style>") || (css.length > 50 && !html.includes(css.substring(0, 50))))) {
        full = full.replace(/<\/head>/i, `<style>${css}</style></head>`);
      }
      if (js && (!html.includes("<script>") || (js.length > 50 && !html.includes(js.substring(0, 50))))) {
        full = full.replace(/<\/body>/i, `<script>${js}<\/script></body>`);
      }
      return full;
    }
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${site.name}</title><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
  };

  const getEditPreviewHTML = () => {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Preview</title><style>${editCss}</style></head><body>${editHtml}<script>${editJs}<\/script></body></html>`;
  };

  const handleDownloadZip = async (site: Website) => {
    const zip = new JSZip();
    const slug = site.name.toLowerCase().replace(/\s+/g, "-");
    const indexHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${site.name}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n${site.html_content || ""}\n<script src="script.js"><\/script>\n</body>\n</html>`;
    zip.file("index.html", indexHtml);
    zip.file("style.css", site.css_content || "/* No styles */");
    zip.file("script.js", site.js_content || "// No scripts");
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Zip downloaded!");
  };

  const openEditor = (site: Website) => {
    setEditSite(site);
    setEditHtml(site.html_content || "");
    setEditCss(site.css_content || "");
    setEditJs(site.js_content || "");
    setAiPrompt("");
  };

  const handleSaveEdit = async () => {
    if (!editSite) return;
    setSaving(true);
    const { error } = await supabase
      .from("websites")
      .update({ html_content: editHtml, css_content: editCss, js_content: editJs })
      .eq("id", editSite.id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    setWebsites((prev) =>
      prev.map((w) => w.id === editSite.id ? { ...w, html_content: editHtml, css_content: editCss, js_content: editJs } : w)
    );
    toast.success("Website updated!");
    setEditSite(null);
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim() || !editSite) return;
    setAiEditing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${supabaseUrl}/functions/v1/edit-website`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteId: editSite.id,
          prompt: aiPrompt,
          currentHtml: editHtml,
          currentCss: editCss,
          currentJs: editJs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Edit failed");
      }

      const result = await response.json();
      if (result.updated) {
        setEditHtml(result.updated.html);
        setEditCss(result.updated.css);
        setEditJs(result.updated.js);
        setWebsites((prev) =>
          prev.map((w) => w.id === editSite.id
            ? { ...w, html_content: result.updated.html, css_content: result.updated.css, js_content: result.updated.js }
            : w
          )
        );
        setAiPrompt("");
        toast.success("Website updated with AI! ✨");
      }
    } catch (err: any) {
      console.error("AI edit error:", err);
      toast.error(err.message || "Failed to edit with AI");
    } finally {
      setAiEditing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-center py-20 rounded-2xl border-2 border-dashed border-border">
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
            <motion.div key={site.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card border border-border card-shadow group overflow-hidden">
              <div className="h-36 bg-muted relative overflow-hidden">
                <iframe srcDoc={getFullHTML(site)} className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none" sandbox="" title={site.name} />
              </div>
              <div className="p-4">
                <h3 className="font-display font-semibold mb-0.5">{site.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{site.theme}</span>
                  <span className="text-xs text-muted-foreground">{site.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{new Date(site.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setPreviewSite(site)}><Eye className="h-3 w-3 mr-1" /> View</Button>
                  <Button size="sm" variant="outline" onClick={() => openEditor(site)}><Code className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadZip(site)}><Download className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(site.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewSite} onOpenChange={() => setPreviewSite(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="font-display">{previewSite?.name}</DialogTitle></DialogHeader>
          {previewSite && (
            <iframe srcDoc={getFullHTML(previewSite)} className="w-full h-[70vh] rounded-lg border border-border bg-white" sandbox="allow-scripts" title={previewSite.name} />
          )}
        </DialogContent>
      </Dialog>

      {/* Code Editor Dialog with AI Edit */}
      <Dialog open={!!editSite} onOpenChange={() => setEditSite(null)}>
        <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Edit: {editSite?.name}
            </DialogTitle>
          </DialogHeader>

          {/* AI Edit Prompt Bar */}
          <div className="flex gap-2 p-3 rounded-xl bg-muted/50 border border-border">
            <Wand2 className="h-4 w-4 text-primary mt-2.5 flex-shrink-0" />
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe changes... e.g. 'Add a testimonials section' or 'Change colors to blue'"
              rows={2}
              className="text-sm min-h-0 resize-none border-0 bg-transparent focus-visible:ring-0 p-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAiEdit();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleAiEdit}
              disabled={aiEditing || !aiPrompt.trim()}
              className="gradient-bg border-0 text-primary-foreground self-end flex-shrink-0"
            >
              {aiEditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-col min-h-0">
              <Tabs defaultValue="html" className="flex flex-col flex-1 min-h-0">
                <TabsList className="bg-muted w-fit">
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="js">JS</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="flex-1 min-h-0 mt-2">
                  <Textarea value={editHtml} onChange={(e) => setEditHtml(e.target.value)} className="font-mono text-xs h-full min-h-[350px] resize-none" spellCheck={false} />
                </TabsContent>
                <TabsContent value="css" className="flex-1 min-h-0 mt-2">
                  <Textarea value={editCss} onChange={(e) => setEditCss(e.target.value)} className="font-mono text-xs h-full min-h-[350px] resize-none" spellCheck={false} />
                </TabsContent>
                <TabsContent value="js" className="flex-1 min-h-0 mt-2">
                  <Textarea value={editJs} onChange={(e) => setEditJs(e.target.value)} className="font-mono text-xs h-full min-h-[350px] resize-none" spellCheck={false} />
                </TabsContent>
              </Tabs>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-white min-h-[350px]">
              <div className="px-3 py-2 bg-muted border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                </div>
                <span className="text-xs text-muted-foreground">Live Preview</span>
              </div>
              <iframe srcDoc={getEditPreviewHTML()} className="w-full h-[400px]" sandbox="allow-scripts" title="Live Preview" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setEditSite(null)}>Cancel</Button>
            <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
