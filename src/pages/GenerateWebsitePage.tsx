import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Eye, Loader2, Download, ExternalLink, Sparkles, Brain, Cpu, FileCode, Code, CheckCircle2, Circle, Send, RotateCcw, Paperclip, X, Image, Monitor, Smartphone, Tablet, PanelLeft, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CodeEditor from "@/components/CodeEditor";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JSZip from "jszip";

interface GeneratedWebsite {
  html: string;
  css: string;
  js: string;
  sections: Array<{ type: string; title: string; content: string }>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  attachments?: string[];
}

const generationSteps = [
  { id: "connect", label: "Connecting to AI", icon: Brain },
  { id: "analyze", label: "Analyzing requirements", icon: Cpu },
  { id: "html", label: "Writing HTML structure", icon: FileCode },
  { id: "css", label: "Crafting CSS styles", icon: Sparkles },
  { id: "js", label: "Adding JavaScript", icon: Code },
  { id: "save", label: "Saving website", icon: CheckCircle2 },
];

const quickEdits = [
  "Make it dark mode",
  "Add animations",
  "Change colors to blue",
  "Add testimonials section",
  "Make text larger",
  "Add a gallery",
  "Add pricing section",
  "Add backend with Python Flask",
  "Add MySQL database setup",
  "Add contact form with PHP",
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
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedWebsite | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState(false);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [activeCodeTab, setActiveCodeTab] = useState("html");
  const [editableHtml, setEditableHtml] = useState("");
  const [editableCss, setEditableCss] = useState("");
  const [editableJs, setEditableJs] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showSidebar, setShowSidebar] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Fetch AI providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase.from("ai_providers") as any).select("id, display_name, models, is_default").eq("is_active", true).order("sort_order");
      if (data?.length) {
        setAiProviders(data);
        const defaultProv = data.find((p: any) => p.is_default) || data[0];
        setSelectedProvider(defaultProv.id);
        const models = defaultProv.models || [];
        if (models.length) setSelectedModel(models[0].id);
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setProgress((prev) => prev >= 95 ? prev : prev + Math.random() * 3 + 0.5);
    }, 500);
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    if (generated) {
      setEditableHtml(generated.html);
      setEditableCss(generated.css);
      setEditableJs(generated.js);
    }
  }, [generated]);

  const addChatMessage = (role: ChatMessage["role"], content: string, attachments?: string[]) => {
    setChatHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      attachments,
    }]);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: string[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          newAttachments.push(reader.result as string);
          setAttachments(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(prev => [...prev, `[File: ${file.name}]`]);
        };
        reader.readAsText(file);
      }
    });
    e.target.value = "";
  };

  const handleSend = async () => {
    if (!prompt.trim() && attachments.length === 0) return;
    const userMessage = prompt.trim();
    const userAttachments = [...attachments];
    setPrompt("");
    setAttachments([]);

    addChatMessage("user", userMessage, userAttachments);

    if (!generated) {
      await handleGenerate(userMessage);
    } else {
      await handleEditWithPrompt(userMessage);
    }
  };

  const handleGenerate = async (userPrompt: string) => {
    setGenerating(true);
    setGenerated(null);
    setCurrentStep(0);
    setProgress(0);
    setWebsiteId(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      setCurrentStep(1);
      setProgress(10);

      // Extract details from the prompt
      // Simulate progress steps during non-streaming request
      const progressInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < 4) return prev + 1;
          return prev;
        });
      }, 2500);

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-website`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: userPrompt.split(" ").slice(0, 3).join(" "),
          category: "General",
          description: userPrompt,
          theme: "modern",
          providerId: selectedProvider || undefined,
          modelId: selectedModel || undefined,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          throw new Error("⚡ AI credits exhausted. The service is temporarily unavailable. Please try again later or contact the admin.");
        }
        if (response.status === 429) {
          throw new Error("🕐 Too many requests. Please wait a moment and try again.");
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setCurrentStep(5);
      setProgress(90);

      const result = await response.json();
      const websiteData = result.generated || result;
      const parsed: GeneratedWebsite = {
        html: websiteData.html || "",
        css: websiteData.css || "",
        js: websiteData.js || "",
        sections: websiteData.sections || [],
      };
      setGenerated(parsed);
      setProgress(100);

      const { data: latestSite } = await supabase
        .from("websites")
        .select("id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (latestSite) setWebsiteId(latestSite.id);

      addChatMessage("assistant", "✅ Website generated successfully! You can now preview it, edit the code, or describe more changes.");
      toast.success("Website generated! 🎉");
    } catch (err: any) {
      console.error("Generation error:", err);
      addChatMessage("assistant", `❌ Error: ${err.message}`);
      toast.error(err.message || "Failed to generate website");
    } finally {
      setGenerating(false);
    }
  };

  const handleEditWithPrompt = async (userPrompt: string) => {
    if (!generated) return;
    setEditing(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
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
          websiteId,
          prompt: userPrompt,
          currentHtml: editableHtml,
          currentCss: editableCss,
          currentJs: editableJs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          throw new Error("⚡ AI credits exhausted. The service is temporarily unavailable. Please try again later.");
        }
        if (response.status === 429) {
          throw new Error("🕐 Too many requests. Please wait a moment and try again.");
        }
        throw new Error(errorData.error || `Edit failed`);
      }

      const result = await response.json();
      if (result.updated) {
        setGenerated({
          html: result.updated.html,
          css: result.updated.css,
          js: result.updated.js,
          sections: generated.sections,
        });
        addChatMessage("assistant", "✅ Changes applied successfully! Check the preview.");
        toast.success("Website updated! ✨");
      }
    } catch (err: any) {
      console.error("Edit error:", err);
      addChatMessage("assistant", `❌ Error: ${err.message}`);
      toast.error(err.message || "Failed to edit website");
    } finally {
      setEditing(false);
    }
  };

  const getFullHTML = () => {
    if (!generated) return "";
    const html = editableHtml || "";
    const css = editableCss || "";
    const js = editableJs || "";
    if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
      let full = html;
      if (css && !html.includes(css.substring(0, 50))) full = full.replace(/<\/head>/i, `<style>${css}</style></head>`);
      if (js && !html.includes(js.substring(0, 50))) full = full.replace(/<\/body>/i, `<script>${js}<\/script></body>`);
      return full;
    }
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Preview</title><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
  };

  const handleDownloadZip = async () => {
    if (!generated) return;
    const zip = new JSZip();
    const slug = "website";
    const indexHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Website</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n${editableHtml || ""}\n<script src="script.js"><\/script>\n</body>\n</html>`;
    zip.file("index.html", indexHtml);
    zip.file("style.css", editableCss || "/* No styles */");
    zip.file("script.js", editableJs || "// No scripts");
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Zip downloaded!");
  };

  const handleStartOver = () => {
    setGenerated(null);
    setWebsiteId(null);
    setCurrentStep(-1);
    setProgress(0);
    setChatHistory([]);
    setViewMode("preview");
    setEditableHtml("");
    setEditableCss("");
    setEditableJs("");
  };

  const previewWidth = previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%";

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col relative -m-4 md:-m-8">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)} className="md:hidden">
            <PanelLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-bg">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">AI Website Builder</span>
          </div>
        </div>
        
        {generated && (
          <div className="flex items-center gap-1">
            {/* View mode toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Eye className="h-3 w-3 inline mr-1" />Preview
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Code className="h-3 w-3 inline mr-1" />Code
              </button>
            </div>

            {/* Device toggle */}
            {viewMode === "preview" && (
              <div className="flex items-center gap-0.5 mr-2">
                <Button variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("desktop")}>
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button variant={previewDevice === "tablet" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("tablet")}>
                  <Tablet className="h-3.5 w-3.5" />
                </Button>
                <Button variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("mobile")}>
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={handleStartOver}>
              <RotateCcw className="h-3 w-3 mr-1" /> New
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat sidebar */}
        <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0`}>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && !generating && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-bg flex items-center justify-center">
                  <Wand2 className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">Build anything with AI</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  Describe the website you want to create. Include details about design, features, and content.
                </p>
                <div className="space-y-2 text-left max-w-xs mx-auto">
                  {[
                    "Build a portfolio website for a photographer with dark theme",
                    "Create a restaurant website with menu and reservation form",
                    "Make an e-commerce landing page for a tech startup",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setPrompt(suggestion)}
                      className="w-full text-left text-xs p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {msg.attachments?.map((att, i) => (
                    att.startsWith("data:image") ? (
                      <img key={i} src={att} alt="attachment" className="max-w-full rounded-lg mb-2 max-h-32 object-cover" />
                    ) : (
                      <span key={i} className="text-xs opacity-70 block mb-1">{att}</span>
                    )
                  ))}
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Inline mini preview after generation/edit success */}
                  {msg.role === "assistant" && (msg.content.includes("generated successfully") || msg.content.includes("Changes applied")) && generated && (
                    <div className="mt-3">
                      <div className="rounded-lg border border-border overflow-hidden bg-white">
                        <iframe
                          srcDoc={getFullHTML()}
                          className="w-full h-40 pointer-events-none"
                          sandbox="allow-scripts"
                          title="Mini Preview"
                        />
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] opacity-50 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Generation progress */}
            {generating && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-sm font-medium">Generating website...</span>
                </div>
                <Progress value={progress} className="h-1.5 mb-3" />
                <div className="space-y-1.5">
                  {generationSteps.map((step, i) => {
                    const isActive = i === currentStep;
                    const isDone = i < currentStep;
                    if (!isDone && !isActive) return null;
                    return (
                      <div key={step.id} className="flex items-center gap-2 text-xs">
                        {isDone ? <CheckCircle2 className="h-3 w-3 text-accent" /> : <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                        <span className={isDone ? "text-muted-foreground" : "text-foreground font-medium"}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {editing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-sm font-medium">Applying changes...</span>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick edits */}
          {generated && !generating && !editing && (
            <div className="px-4 py-2 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Quick edits</p>
              <div className="flex flex-wrap gap-1">
                {quickEdits.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    className="text-[10px] px-2 py-1 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-3 border-t border-border bg-card">
            {/* Model selector */}
            {aiProviders.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <Select value={selectedProvider} onValueChange={(v) => {
                  setSelectedProvider(v);
                  const prov = aiProviders.find((p: any) => p.id === v);
                  const models = prov?.models || [];
                  if (models.length) setSelectedModel(models[0].id);
                }}>
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[120px] bg-muted/50 border-border">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiProviders.map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.display_name}{p.is_default ? " ⭐" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const prov = aiProviders.find((p: any) => p.id === selectedProvider);
                  const models = prov?.models || [];
                  if (!models.length) return null;
                  return (
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[130px] bg-muted/50 border-border">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m: any) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group">
                    {att.startsWith("data:image") ? (
                      <img src={att} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="h-12 px-3 rounded-lg border border-border bg-muted flex items-center text-xs text-muted-foreground">{att}</div>
                    )}
                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={generated ? "Describe changes you want..." : "Describe the website you want to build..."}
                  rows={2}
                  className="text-sm resize-none pr-10 min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 bottom-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.html,.css,.js,.py,.c,.cpp,.sql,.txt,.json" className="hidden" onChange={handleFileAttach} />
              </div>
              <Button
                onClick={handleSend}
                disabled={generating || editing || (!prompt.trim() && attachments.length === 0)}
                className="gradient-bg border-0 text-primary-foreground h-[60px] w-[60px] p-0 rounded-xl"
              >
                {generating || editing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 bg-muted/30">
          {!generated && !generating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground px-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                  <Wand2 className="h-8 w-8 opacity-30" />
                </div>
                <p className="font-display font-semibold text-lg">Your website will appear here</p>
                <p className="text-sm mt-1">Start by describing what you want to build</p>
              </div>
            </div>
          ) : generating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="relative mx-auto w-20 h-20 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <div className="absolute inset-3 rounded-full gradient-bg flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <p className="font-display font-semibold">Building your website...</p>
                <p className="text-sm text-muted-foreground mt-1">{Math.round(progress)}% complete</p>
              </div>
            </div>
          ) : viewMode === "preview" ? (
            <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
              <div className="transition-all duration-300" style={{ width: previewWidth, maxWidth: "100%" }}>
                <div className="rounded-xl border border-border overflow-hidden bg-white shadow-lg">
                  <div className="px-3 py-2 bg-muted border-b border-border flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                    </div>
                    <div className="flex-1 mx-8">
                      <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center truncate">
                        website-preview.local
                      </div>
                    </div>
                  </div>
                  <iframe
                    srcDoc={getFullHTML()}
                    className="w-full bg-white"
                    style={{ height: "calc(100vh - 16rem)" }}
                    sandbox="allow-scripts"
                    title="Website Preview"
                  />
                </div>
                {/* Action buttons below preview */}
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleDownloadZip}>
                    <Download className="h-3.5 w-3.5" /> Download ZIP
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => window.open(URL.createObjectURL(new Blob([getFullHTML()], { type: "text/html" })), "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Code view */
            <div className="flex-1 flex flex-col min-h-0">
              <Tabs value={activeCodeTab} onValueChange={setActiveCodeTab} className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[#181825]">
                  <TabsList className="bg-[#313244] h-8 border-0">
                    <TabsTrigger value="html" className="text-xs h-6 px-3 gap-1 data-[state=active]:bg-[#1e1e2e] data-[state=active]:text-[#89b4fa] text-[#6c7086]">
                      <FileCode className="h-3 w-3" /> index.html
                    </TabsTrigger>
                    <TabsTrigger value="css" className="text-xs h-6 px-3 gap-1 data-[state=active]:bg-[#1e1e2e] data-[state=active]:text-[#cba6f7] text-[#6c7086]">
                      <Sparkles className="h-3 w-3" /> style.css
                    </TabsTrigger>
                    <TabsTrigger value="js" className="text-xs h-6 px-3 gap-1 data-[state=active]:bg-[#1e1e2e] data-[state=active]:text-[#f9e2af] text-[#6c7086]">
                      <Code className="h-3 w-3" /> script.js
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-1 text-xs text-[#a6adc8]">
                    <div className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse" />
                    Editable
                  </div>
                </div>
                <TabsContent value="html" className="flex-1 m-0 min-h-0">
                  <CodeEditor value={editableHtml} onChange={setEditableHtml} language="html" />
                </TabsContent>
                <TabsContent value="css" className="flex-1 m-0 min-h-0">
                  <CodeEditor value={editableCss} onChange={setEditableCss} language="css" />
                </TabsContent>
                <TabsContent value="js" className="flex-1 m-0 min-h-0">
                  <CodeEditor value={editableJs} onChange={setEditableJs} language="js" />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
