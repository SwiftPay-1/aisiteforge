import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Eye, Loader2, Download, ExternalLink, Sparkles, Brain, Cpu, FileCode, Code, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import JSZip from "jszip";

const themes = ["modern", "minimal", "startup", "dark"];
const categories = ["Technology", "Restaurant", "E-commerce", "Portfolio", "Agency", "Healthcare", "Education", "Real Estate"];

interface GeneratedWebsite {
  html: string;
  css: string;
  js: string;
  sections: Array<{ type: string; title: string; content: string }>;
}

const generationSteps = [
  { id: "connect", label: "Connecting to AI", icon: Brain },
  { id: "analyze", label: "Analyzing requirements", icon: Cpu },
  { id: "html", label: "Writing HTML structure", icon: FileCode },
  { id: "css", label: "Crafting CSS styles", icon: Sparkles },
  { id: "js", label: "Adding JavaScript", icon: Code },
  { id: "save", label: "Saving website", icon: CheckCircle2 },
];

function cleanAndParseAIOutput(raw: string): GeneratedWebsite {
  let cleaned = raw.replace(/^```(?:json)?\s*/gim, "").replace(/```\s*$/gim, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return { html: raw, css: "", js: "", sections: [] };
  if (lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    cleaned = cleaned.substring(firstBrace);
    cleaned = repairTruncatedJSON(cleaned);
  }
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try {
    const obj = JSON.parse(cleaned);
    return { html: obj.html || "", css: obj.css || "", js: obj.js || "", sections: obj.sections || [] };
  } catch {
    try {
      const obj = JSON.parse(repairTruncatedJSON(cleaned));
      return { html: obj.html || "", css: obj.css || "", js: obj.js || "", sections: obj.sections || [] };
    } catch {
      return { html: raw, css: "", js: "", sections: [] };
    }
  }
}

function repairTruncatedJSON(json: string): string {
  let result = json.replace(/,\s*$/, "");
  let inString = false, escape = false;
  const stack: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) result += '"';
  while (stack.length > 0) result += stack.pop();
  return result;
}

export default function GenerateWebsitePage() {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedWebsite | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [progress, setProgress] = useState(0);

  // Progress animation during generation
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3 + 0.5;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !category || !description || !theme) {
      toast.error("Please fill all fields");
      return;
    }
    setGenerating(true);
    setGenerated(null);
    setCurrentStep(0);
    setProgress(0);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      setCurrentStep(1);
      setProgress(10);

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-website`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessName, category, description, theme, stream: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setCurrentStep(2);
      setProgress(25);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                // Update step based on content progress
                if (fullContent.includes('"js"')) {
                  setCurrentStep(4);
                  setProgress(75);
                } else if (fullContent.includes('"css"')) {
                  setCurrentStep(3);
                  setProgress(55);
                } else if (fullContent.includes('"html"')) {
                  setCurrentStep(2);
                  setProgress(35);
                }
              }
            } catch {
              // skip
            }
          }
        }
      }

      setCurrentStep(5);
      setProgress(90);

      const parsed = cleanAndParseAIOutput(fullContent);
      setGenerated(parsed);
      setProgress(100);
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
    const html = generated.html || "";
    if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
      let full = html;
      if (generated.css && !html.includes(generated.css.substring(0, 50))) {
        full = full.replace(/<\/head>/i, `<style>${generated.css}</style></head>`);
      }
      if (generated.js && !html.includes(generated.js.substring(0, 50))) {
        full = full.replace(/<\/body>/i, `<script>${generated.js}<\/script></body>`);
      }
      return full;
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <style>${generated.css || ""}</style>
</head>
<body>
${html}
<script>${generated.js || ""}<\/script>
</body>
</html>`;
  };

  const handleDownloadZip = async () => {
    if (!generated) return;
    const zip = new JSZip();
    const slug = businessName.toLowerCase().replace(/\s+/g, "-");

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${generated.html || ""}
<script src="script.js"><\/script>
</body>
</html>`;

    zip.file("index.html", indexHtml);
    zip.file("style.css", generated.css || "/* No styles */");
    zip.file("script.js", generated.js || "// No scripts");

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Zip downloaded!");
  };

  const handlePreviewInNewTab = () => {
    const html = getFullHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl gradient-bg">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">AI Website Generator</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-12">
          Describe your business and AI will build a complete website.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6 relative">
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
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" /> Generate Website</>
            )}
          </Button>
        </motion.form>

        {/* Result area - 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          {generating ? (
            /* Progress Steps UI */
            <div className="rounded-2xl border border-border bg-card card-shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <div className="absolute -inset-1 bg-primary/20 rounded-full animate-ping opacity-30" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Generating your website...</h3>
                  <p className="text-xs text-muted-foreground">AI is building {businessName}</p>
                </div>
              </div>

              <Progress value={progress} className="h-2 mb-6" />

              <div className="space-y-3">
                {generationSteps.map((step, i) => {
                  const StepIcon = step.icon;
                  const isActive = i === currentStep;
                  const isDone = i < currentStep;
                  const isPending = i > currentStep;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive
                          ? "bg-primary/10 border border-primary/20"
                          : isDone
                          ? "bg-accent/5"
                          : "opacity-40"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                      ) : isActive ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${
                        isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                      {isDone && (
                        <span className="ml-auto text-xs text-accent font-medium">Done</span>
                      )}
                      {isActive && (
                        <div className="ml-auto flex gap-1">
                          {[0, 1, 2].map((d) => (
                            <div
                              key={d}
                              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                              style={{ animationDelay: `${d * 0.15}s` }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6">
                This usually takes 15-30 seconds
              </p>
            </div>
          ) : generated ? (
            /* Preview */
            <div className="rounded-2xl border border-border overflow-hidden bg-card card-shadow">
              <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-accent/60" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">{businessName || "website"}.html</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-accent mr-1" />
                  <span className="text-xs text-accent font-medium">Generated</span>
                </div>
              </div>

              <iframe
                srcDoc={getFullHTML()}
                className="w-full h-[500px] bg-white"
                sandbox="allow-scripts"
                title="Website Preview"
              />

              <div className="flex gap-2 p-3 border-t border-border bg-muted/50">
                <Button size="sm" variant="outline" onClick={handleDownloadZip}>
                  <Download className="h-3 w-3 mr-1" /> Download ZIP
                </Button>
                <Button size="sm" variant="outline" onClick={handlePreviewInNewTab}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Full Preview
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-card/50">
              <div className="text-center text-muted-foreground px-6">
                <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Your website preview will appear here</p>
                <p className="text-sm">Fill the form and click generate</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
