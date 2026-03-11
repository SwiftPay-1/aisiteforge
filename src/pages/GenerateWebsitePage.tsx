import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Wand2, Eye, Loader2, Code, Download, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const themes = ["modern", "minimal", "startup", "dark"];
const categories = ["Technology", "Restaurant", "E-commerce", "Portfolio", "Agency", "Healthcare", "Education", "Real Estate"];

interface GeneratedWebsite {
  html: string;
  css: string;
  js: string;
  sections: Array<{ type: string; title: string; content: string }>;
}

export default function GenerateWebsitePage() {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedWebsite | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !category || !description || !theme) {
      toast.error("Please fill all fields");
      return;
    }
    setGenerating(true);
    setGenerated(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-website", {
        body: { businessName, category, description, theme },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setGenerated(data.generated);
      toast.success("Website generated successfully! 🎉");
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate website");
    } finally {
      setGenerating(false);
    }
  };

  const getFullHTML = () => {
    if (!generated) return "";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <style>${generated.css}</style>
</head>
<body>
${generated.html}
<script>${generated.js}</script>
</body>
</html>`;
  };

  const handleDownload = () => {
    const html = getFullHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Website downloaded!");
  };

  const handlePreviewInNewTab = () => {
    const html = getFullHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl gradient-bg">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">AI Website Generator</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-12">
          Describe your business and AI will build a complete website with HTML, CSS & JS.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form - 2 cols */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleGenerate}
          className="lg:col-span-2 space-y-4 p-5 rounded-2xl bg-card border border-border card-shadow h-fit"
        >
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business Name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. TechFlow" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of your business..." rows={3} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme Style</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {themes.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                    theme === t
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full gradient-bg border-0 text-primary-foreground" disabled={generating}>
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating with AI...</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" /> Generate Website</>
            )}
          </Button>
          {generating && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              AI is crafting your website... This may take 15-30 seconds.
            </p>
          )}
        </motion.form>

        {/* Preview - 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          {generated ? (
            <div className="rounded-2xl border border-border overflow-hidden bg-card card-shadow">
              <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-accent/60" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">{businessName}.html</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeTab === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3 w-3 inline mr-1" /> Preview
                  </button>
                  <button
                    onClick={() => setActiveTab("code")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeTab === "code" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Code className="h-3 w-3 inline mr-1" /> Code
                  </button>
                </div>
              </div>

              {activeTab === "preview" ? (
                <div className="relative">
                  <iframe
                    srcDoc={getFullHTML()}
                    className="w-full h-[500px] bg-white"
                    sandbox="allow-scripts"
                    title="Website Preview"
                  />
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto p-4">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                    {getFullHTML()}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 p-3 border-t border-border bg-muted/50">
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
                <Button size="sm" variant="outline" onClick={handlePreviewInNewTab}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Full Preview
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground px-6">
                {generating ? (
                  <>
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="font-display font-semibold text-lg mb-1">Building your website...</p>
                    <p className="text-sm">AI is writing HTML, CSS, and JavaScript for you</p>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Your website preview will appear here</p>
                    <p className="text-sm">Fill the form and click generate</p>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
