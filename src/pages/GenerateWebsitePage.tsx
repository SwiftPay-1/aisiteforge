import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Eye, Loader2, Code, Download, ExternalLink, Sparkles, Brain, Cpu, FileCode } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const themes = ["modern", "minimal", "startup", "dark"];
const categories = ["Technology", "Restaurant", "E-commerce", "Portfolio", "Agency", "Healthcare", "Education", "Real Estate"];

interface GeneratedWebsite {
  html: string;
  css: string;
  js: string;
  sections: Array<{ type: string; title: string; content: string }>;
}

const thinkingSteps = [
  { icon: Brain, text: "Analyzing your requirements..." },
  { icon: Cpu, text: "Designing layout structure..." },
  { icon: FileCode, text: "Writing HTML markup..." },
  { icon: Sparkles, text: "Crafting CSS styles..." },
  { icon: Code, text: "Adding JavaScript interactivity..." },
];

/** Robust JSON parser that handles markdown fences, truncation, and malformed output */
function cleanAndParseAIOutput(raw: string): GeneratedWebsite {
  // Strip markdown fences
  let cleaned = raw
    .replace(/^```(?:json)?\s*/gim, "")
    .replace(/```\s*$/gim, "")
    .trim();

  // Find outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1) {
    return { html: raw, css: "", js: "", sections: [] };
  }

  if (lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    cleaned = cleaned.substring(firstBrace);
    cleaned = repairTruncatedJSON(cleaned);
  }

  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  try {
    const obj = JSON.parse(cleaned);
    return {
      html: obj.html || "",
      css: obj.css || "",
      js: obj.js || "",
      sections: obj.sections || [],
    };
  } catch {
    // Try repair
    try {
      const repaired = repairTruncatedJSON(cleaned);
      const obj = JSON.parse(repaired);
      return {
        html: obj.html || "",
        css: obj.css || "",
        js: obj.js || "",
        sections: obj.sections || [],
      };
    } catch {
      return { html: raw, css: "", js: "", sections: [] };
    }
  }
}

function repairTruncatedJSON(json: string): string {
  let result = json.replace(/,\s*$/, "");
  let inString = false;
  let escape = false;
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
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [streamedContent, setStreamedContent] = useState("");
  const [thinkingStep, setThinkingStep] = useState(0);
  const [aiStatus, setAiStatus] = useState("");
  const codeRef = useRef<HTMLPreElement>(null);

  // Auto-scroll code view during streaming
  useEffect(() => {
    if (codeRef.current && generating) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [streamedContent, generating]);

  // Rotate thinking steps
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % thinkingSteps.length);
    }, 3000);
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
    setStreamedContent("");
    setActiveTab("code");
    setAiStatus("Connecting to AI...");

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      setAiStatus("AI is thinking...");

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

      setAiStatus("AI is writing code...");

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
                setStreamedContent(fullContent);
                // Update status based on content
                if (fullContent.includes('"css"')) setAiStatus("Writing CSS styles...");
                else if (fullContent.includes('"js"')) setAiStatus("Adding JavaScript...");
                else if (fullContent.includes('"html"')) setAiStatus("Writing HTML structure...");
              }
            } catch {
              // skip parse errors
            }
          }
        }
      }

      // Parse the final content with robust cleaning
      let parsed: GeneratedWebsite;
      try {
        parsed = cleanAndParseAIOutput(fullContent);
      } catch {
        parsed = { html: fullContent, css: "", js: "", sections: [] };
      }

      setGenerated(parsed);
      setActiveTab("preview");
      setAiStatus("");
      toast.success("Website generated successfully! 🎉");
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate website");
      setAiStatus("");
    } finally {
      setGenerating(false);
    }
  };

  const getFullHTML = () => {
    if (!generated) return "";
    const html = generated.html || "";
    // If AI returned a complete HTML document, use it as-is (just inject missing CSS/JS)
    if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
      // Inject CSS before </head> and JS before </body> if not already inline
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

  const CurrentThinkingIcon = thinkingSteps[thinkingStep].icon;

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* Decorative background */}
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
          Describe your business and AI will build a complete website with HTML, CSS & JS.
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

        {/* Preview - 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          {generated || generating ? (
            <div className="rounded-2xl border border-border overflow-hidden bg-card card-shadow">
              {/* Browser chrome */}
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
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeTab === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    disabled={generating && !generated}
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

              {/* AI Status Bar */}
              <AnimatePresence>
                {generating && aiStatus && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center gap-3"
                  >
                    <div className="relative">
                      <CurrentThinkingIcon className="h-4 w-4 text-primary animate-pulse" />
                      <div className="absolute -inset-1 bg-primary/20 rounded-full animate-ping" />
                    </div>
                    <span className="text-xs font-medium text-primary">{aiStatus}</span>
                    <div className="flex-1" />
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {activeTab === "preview" && generated ? (
                <div className="relative">
                  <iframe
                    srcDoc={getFullHTML()}
                    className="w-full h-[500px] bg-white"
                    sandbox="allow-scripts"
                    title="Website Preview"
                  />
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto p-4 bg-muted/30" ref={codeRef as any}>
                  <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
                    {generating ? (
                      <>
                        {streamedContent}
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                      </>
                    ) : generated ? (
                      getFullHTML()
                    ) : null}
                  </pre>
                </div>
              )}

              {generated && (
                <div className="flex gap-2 p-3 border-t border-border bg-muted/50">
                  <Button size="sm" variant="outline" onClick={handleDownload}>
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePreviewInNewTab}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Full Preview
                  </Button>
                </div>
              )}
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
