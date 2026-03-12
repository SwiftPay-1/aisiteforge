import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Eye, Loader2, Download, ExternalLink, Sparkles, Code, Send, RotateCcw, Paperclip, X, Monitor, Smartphone, Tablet, PanelLeft, Wand2, FileCode, ArrowLeft, Rocket } from "lucide-react";
import DeployToNetlifyDialog from "@/components/DeployToNetlifyDialog";
import CodeEditor from "@/components/CodeEditor";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  attachments?: string[];
}

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

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [websiteName, setWebsiteName] = useState("");
  const [editableHtml, setEditableHtml] = useState("");
  const [editableCss, setEditableCss] = useState("");
  const [editableJs, setEditableJs] = useState("");
  const [prompt, setPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [activeCodeTab, setActiveCodeTab] = useState("html");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showSidebar, setShowSidebar] = useState(true);
  const [attachments, setAttachments] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        toast.error("Project not found");
        navigate("/dashboard/websites");
        return;
      }
      setWebsiteName(data.name);
      setEditableHtml(data.html_content || "");
      setEditableCss(data.css_content || "");
      setEditableJs(data.js_content || "");
      setChatHistory([{
        id: crypto.randomUUID(),
        role: "assistant",
        content: `📂 Project "${data.name}" loaded. Describe any changes you'd like to make.`,
        timestamp: new Date(),
      }]);
      setLoading(false);
    };
    load();
  }, [user, id, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

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
    Array.from(files).forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setAttachments(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, `[File: ${file.name}]`]);
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
    await handleEditWithPrompt(userMessage);
  };

  const handleEditWithPrompt = async (userPrompt: string) => {
    setEditing(true);
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
          websiteId: id,
          prompt: userPrompt,
          currentHtml: editableHtml,
          currentCss: editableCss,
          currentJs: editableJs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Edit failed");
      }

      const result = await response.json();
      if (result.updated) {
        setEditableHtml(result.updated.html);
        setEditableCss(result.updated.css);
        setEditableJs(result.updated.js);
        addChatMessage("assistant", "✅ Changes applied successfully! Check the preview.");
        toast.success("Website updated! ✨");
      }
    } catch (err: any) {
      console.error("Edit error:", err);
      addChatMessage("assistant", `❌ Error: ${err.message}`);
      toast.error(err.message || "Failed to edit");
    } finally {
      setEditing(false);
    }
  };

  const getFullHTML = () => {
    const html = editableHtml || "";
    const css = editableCss || "";
    const js = editableJs || "";
    if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
      let full = html;
      if (css && css.length > 50 && !html.includes(css.substring(0, 50))) full = full.replace(/<\/head>/i, `<style>${css}</style></head>`);
      if (js && js.length > 50 && !html.includes(js.substring(0, 50))) full = full.replace(/<\/body>/i, `<script>${js}<\/script></body>`);
      return full;
    }
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Preview</title><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const indexHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${websiteName}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n${editableHtml}\n<script src="script.js"><\/script>\n</body>\n</html>`;
    zip.file("index.html", indexHtml);
    zip.file("style.css", editableCss || "/* No styles */");
    zip.file("script.js", editableJs || "// No scripts");
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${websiteName.toLowerCase().replace(/\s+/g, "-")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Zip downloaded!");
  };

  const previewWidth = previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col relative -m-4 md:-m-8">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/websites")} className="gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Projects</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-bg">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm truncate max-w-[200px]">{websiteName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
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

          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDownloadZip}>
            <Download className="h-3 w-3 mr-1" /> ZIP
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(URL.createObjectURL(new Blob([getFullHTML()], { type: "text/html" })), "_blank")}>
            <ExternalLink className="h-3 w-3 mr-1" /> Open
          </Button>
          <Button size="sm" className="h-7 text-xs gradient-bg border-0 text-primary-foreground gap-1" onClick={() => setDeployDialogOpen(true)}>
            <Rocket className="h-3 w-3" /> Deploy
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat sidebar */}
        <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  <span className="text-[10px] opacity-50 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

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
          {!editing && (
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
                  placeholder="Describe changes you want..."
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
                <input ref={fileInputRef} type="file" multiple accept="image/*,.html,.css,.js,.txt,.json" className="hidden" onChange={handleFileAttach} />
              </div>
              <Button
                onClick={handleSend}
                disabled={editing || (!prompt.trim() && attachments.length === 0)}
                className="gradient-bg border-0 text-primary-foreground h-[60px] w-[60px] p-0 rounded-xl"
              >
                {editing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 bg-muted/30">
          {viewMode === "preview" ? (
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
                        {websiteName.toLowerCase().replace(/\s+/g, "-")}.local
                      </div>
                    </div>
                  </div>
                  <iframe
                    srcDoc={getFullHTML()}
                    className="w-full bg-white"
                    style={{ height: "calc(100vh - 12rem)" }}
                    sandbox="allow-scripts"
                    title="Website Preview"
                  />
                </div>
              </div>
            </div>
          ) : (
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

      <DeployToNetlifyDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        html={editableHtml}
        css={editableCss}
        js={editableJs}
        defaultName={websiteName}
      />
    </div>
  );
}
