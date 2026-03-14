import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Star, Key, Eye, EyeOff, Zap, Search, Bug, CheckCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIModel { id: string; name: string; supports_tools?: boolean; }
interface AIProvider { id: string; name: string; display_name: string; base_url: string; models: AIModel[]; is_active: boolean; is_default: boolean; sort_order: number; }
interface AIApiKey { id: string; provider_id: string; api_key: string; label: string; is_active: boolean; usage_count: number; last_used_at: string | null; }

interface PipelineStage {
  id: string; name: string; display_name: string; description: string; stage_order: number;
  is_active: boolean; providers: string[]; default_provider: string; default_model: string;
}

interface PipelinePrompt {
  id: string; stage_id: string; name: string; description: string; prompt_text: string;
  is_active: boolean; is_default: boolean; sort_order: number;
}

const stageIcons: Record<string, React.ElementType> = { breakdown: Search, code_generation: Zap, bug_finder: Bug, finalize: CheckCircle };
const stageColors: Record<string, string> = { breakdown: "from-blue-500 to-blue-600", code_generation: "from-emerald-500 to-emerald-600", bug_finder: "from-orange-500 to-red-500", finalize: "from-violet-500 to-purple-600" };

const PROVIDER_PRESETS: Record<string, { display_name: string; base_url: string; models: AIModel[] }> = {
  groq: { display_name: "Groq", base_url: "https://api.groq.com/openai/v1/chat/completions", models: [{ id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" }, { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" }, { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" }] },
  openai: { display_name: "OpenAI", base_url: "https://api.openai.com/v1/chat/completions", models: [{ id: "gpt-4o", name: "GPT-4o" }, { id: "gpt-4o-mini", name: "GPT-4o Mini" }] },
  google_ai: { display_name: "Google AI", base_url: "https://generativelanguage.googleapis.com/v1beta/chat/completions", models: [{ id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }, { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" }] },
  deepseek: { display_name: "DeepSeek", base_url: "https://api.deepseek.com/v1/chat/completions", models: [{ id: "deepseek-chat", name: "DeepSeek Chat" }, { id: "deepseek-coder", name: "DeepSeek Coder" }] },
  anthropic: { display_name: "Anthropic", base_url: "https://api.anthropic.com/v1/messages", models: [{ id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" }, { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" }] },
};

export default function PipelineStagesTab() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [prompts, setPrompts] = useState<PipelinePrompt[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [apiKeys, setApiKeys] = useState<AIApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<"providers" | "prompts" | null>(null);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PipelinePrompt | null>(null);
  const [createPromptForStage, setCreatePromptForStage] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({ name: "", description: "", prompt_text: "" });
  const [keyDialog, setKeyDialog] = useState<{ open: boolean; providerId: string; providerName: string }>({ open: false, providerId: "", providerName: "" });
  const [newKeyForm, setNewKeyForm] = useState({ api_key: "", label: "" });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [newModelForm, setNewModelForm] = useState({ id: "", name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [{ data: s }, { data: p }, { data: prov }, { data: k }] = await Promise.all([
      (supabase.from("pipeline_stages") as any).select("*").order("stage_order"),
      (supabase.from("pipeline_prompts") as any).select("*").order("sort_order"),
      supabase.from("ai_providers").select("*").order("sort_order") as any,
      supabase.from("ai_api_keys").select("*").order("created_at") as any,
    ]);
    setStages(s || []);
    setPrompts(p || []);
    setProviders((prov || []).map((pr: any) => ({ ...pr, models: pr.models || [] })));
    setApiKeys(k || []);
    setLoading(false);
  };

  const handleToggleStage = async (stage: PipelineStage) => {
    const { error } = await (supabase.from("pipeline_stages") as any).update({ is_active: !stage.is_active }).eq("id", stage.id);
    if (error) { toast.error("Failed"); return; }
    setStages(prev => prev.map(s => s.id === stage.id ? { ...s, is_active: !s.is_active } : s));
  };

  const handleUpdateStage = async () => {
    if (!editingStage) return;
    setSaving(true);
    const { error } = await (supabase.from("pipeline_stages") as any).update({
      display_name: editingStage.display_name, description: editingStage.description,
      providers: editingStage.providers, default_provider: editingStage.default_provider,
      default_model: editingStage.default_model, updated_at: new Date().toISOString(),
    }).eq("id", editingStage.id);
    if (error) { toast.error("Failed to update"); setSaving(false); return; }
    setStages(prev => prev.map(s => s.id === editingStage.id ? editingStage : s));
    setEditingStage(null); setSaving(false);
    toast.success("Stage updated!");
  };

  // Provider management
  const handleToggleProvider = async (provider: AIProvider) => {
    const { error } = await (supabase.from("ai_providers") as any).update({ is_active: !provider.is_active }).eq("id", provider.id);
    if (error) { toast.error("Failed"); return; }
    setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, is_active: !p.is_active } : p));
  };

  const handleSetDefaultProvider = async (provider: AIProvider) => {
    await (supabase.from("ai_providers") as any).update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await (supabase.from("ai_providers") as any).update({ is_default: true }).eq("id", provider.id);
    if (error) { toast.error("Failed"); return; }
    setProviders(prev => prev.map(p => ({ ...p, is_default: p.id === provider.id })));
    toast.success(`${provider.display_name} set as default`);
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider) return;
    const { error } = await (supabase.from("ai_providers") as any).update({
      display_name: editingProvider.display_name, base_url: editingProvider.base_url,
      models: editingProvider.models, updated_at: new Date().toISOString(),
    }).eq("id", editingProvider.id);
    if (error) { toast.error("Failed to update"); return; }
    setProviders(prev => prev.map(p => p.id === editingProvider.id ? editingProvider : p));
    setEditingProvider(null);
    toast.success("Provider updated");
  };

  const handleAddModel = () => {
    if (!editingProvider || !newModelForm.id.trim()) return;
    if (editingProvider.models.some(m => m.id === newModelForm.id.trim())) { toast.error("Model exists"); return; }
    setEditingProvider({ ...editingProvider, models: [...editingProvider.models, { id: newModelForm.id.trim(), name: newModelForm.name.trim() || newModelForm.id.trim() }] });
    setNewModelForm({ id: "", name: "" });
  };

  const handleRemoveModel = (modelId: string) => {
    if (!editingProvider) return;
    setEditingProvider({ ...editingProvider, models: editingProvider.models.filter(m => m.id !== modelId) });
  };

  // API Key management
  const handleAddKey = async () => {
    if (!newKeyForm.api_key.trim()) { toast.error("API key is required"); return; }
    const { data, error } = await (supabase.from("ai_api_keys") as any).insert({
      provider_id: keyDialog.providerId, api_key: newKeyForm.api_key.trim(),
      label: newKeyForm.label.trim() || `Key ${apiKeys.filter(k => k.provider_id === keyDialog.providerId).length + 1}`,
    }).select().single();
    if (error) { toast.error("Failed to add key"); return; }
    setApiKeys(prev => [...prev, data]);
    setNewKeyForm({ api_key: "", label: "" });
    toast.success("API key added");
  };

  const handleDeleteKey = async (keyId: string) => {
    const { error } = await (supabase.from("ai_api_keys") as any).delete().eq("id", keyId);
    if (error) { toast.error("Failed"); return; }
    setApiKeys(prev => prev.filter(k => k.id !== keyId));
    toast.success("Key deleted");
  };

  const handleToggleKey = async (key: AIApiKey) => {
    const { error } = await (supabase.from("ai_api_keys") as any).update({ is_active: !key.is_active }).eq("id", key.id);
    if (error) { toast.error("Failed"); return; }
    setApiKeys(prev => prev.map(k => k.id === key.id ? { ...k, is_active: !k.is_active } : k));
  };

  // Prompt management
  const handleCreatePrompt = async () => {
    if (!createPromptForStage || !newPrompt.name.trim() || !newPrompt.prompt_text.trim()) { toast.error("Name and prompt required"); return; }
    setSaving(true);
    const stagePrompts = prompts.filter(p => p.stage_id === createPromptForStage);
    const { data, error } = await (supabase.from("pipeline_prompts") as any).insert({
      stage_id: createPromptForStage, name: newPrompt.name.trim(), description: newPrompt.description.trim(),
      prompt_text: newPrompt.prompt_text.trim(), sort_order: stagePrompts.length,
    }).select().single();
    if (error) { toast.error("Failed"); setSaving(false); return; }
    setPrompts(prev => [...prev, data]);
    setNewPrompt({ name: "", description: "", prompt_text: "" });
    setCreatePromptForStage(null); setSaving(false);
    toast.success("Prompt created!");
  };

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return;
    setSaving(true);
    const { error } = await (supabase.from("pipeline_prompts") as any).update({
      name: editingPrompt.name, description: editingPrompt.description,
      prompt_text: editingPrompt.prompt_text, is_active: editingPrompt.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", editingPrompt.id);
    if (error) { toast.error("Failed"); setSaving(false); return; }
    setPrompts(prev => prev.map(p => p.id === editingPrompt.id ? editingPrompt : p));
    setEditingPrompt(null); setSaving(false);
    toast.success("Prompt updated!");
  };

  const handleSetDefaultPrompt = async (prompt: PipelinePrompt) => {
    await (supabase.from("pipeline_prompts") as any).update({ is_default: false }).eq("stage_id", prompt.stage_id);
    const { error } = await (supabase.from("pipeline_prompts") as any).update({ is_default: true }).eq("id", prompt.id);
    if (error) { toast.error("Failed"); return; }
    setPrompts(prev => prev.map(p => p.stage_id === prompt.stage_id ? { ...p, is_default: p.id === prompt.id } : p));
    toast.success(`"${prompt.name}" set as default`);
  };

  const handleDeletePrompt = async (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (prompt?.is_default) { toast.error("Cannot delete default prompt"); return; }
    const { error } = await (supabase.from("pipeline_prompts") as any).delete().eq("id", id);
    if (error) { toast.error("Failed"); return; }
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast.success("Deleted");
  };

  const maskKey = (key: string) => key.length > 12 ? key.slice(0, 8) + "..." + key.slice(-4) : "••••••••";

  // Get providers linked to a stage
  const getStageProviders = (stage: PipelineStage) => {
    const stageProviderNames = (stage.providers as string[]) || [];
    return providers.filter(p => stageProviderNames.includes(p.name) || stageProviderNames.includes(p.display_name));
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display font-bold text-sm">AI Pipeline Stages</h3>
        <p className="text-xs text-muted-foreground">Configure providers, API keys, models, and prompts for each pipeline stage.</p>
      </div>

      <div className="grid gap-4">
        {stages.map((stage, i) => {
          const Icon = stageIcons[stage.name] || Zap;
          const color = stageColors[stage.name] || "from-gray-500 to-gray-600";
          const stagePrompts = prompts.filter(p => p.stage_id === stage.id);
          const stageProviders = getStageProviders(stage);
          const isExpanded = expandedStage === stage.id;

          return (
            <div key={stage.id} className={`rounded-2xl border-2 bg-card transition-all ${stage.is_active ? "border-border" : "border-border opacity-50"}`}>
              {/* Stage Header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">STAGE {i + 1}</span>
                        <h4 className="font-display font-bold">{stage.display_name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                  <Switch checked={stage.is_active} onCheckedChange={() => handleToggleStage(stage)} />
                </div>

                {/* Provider badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {stageProviders.map(provider => {
                    const provKeys = apiKeys.filter(k => k.provider_id === provider.id && k.is_active);
                    return (
                      <Badge key={provider.id} variant={provider.name === stage.default_provider ? "default" : "outline"} className="text-[10px] gap-1">
                        {provider.display_name} {provider.name === stage.default_provider && "★"}
                        <span className="opacity-60">({provKeys.length} key{provKeys.length !== 1 ? "s" : ""})</span>
                      </Badge>
                    );
                  })}
                  {stageProviders.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No providers linked</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>Default: <strong>{stage.default_provider || "None"}</strong> / <strong>{stage.default_model || "Auto"}</strong></span>
                  <span>•</span>
                  <span>{stagePrompts.length} prompt{stagePrompts.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingStage({ ...stage })}>
                    <Edit className="h-3.5 w-3.5" /> Edit Stage
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
                    if (isExpanded && expandedSection === "providers") { setExpandedStage(null); setExpandedSection(null); }
                    else { setExpandedStage(stage.id); setExpandedSection("providers"); }
                  }}>
                    <Key className="h-3.5 w-3.5" /> Providers & Keys
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
                    if (isExpanded && expandedSection === "prompts") { setExpandedStage(null); setExpandedSection(null); }
                    else { setExpandedStage(stage.id); setExpandedSection("prompts"); }
                  }}>
                    <FileText className="h-3.5 w-3.5" /> Prompts ({stagePrompts.length})
                  </Button>
                </div>
              </div>

              {/* Expanded Providers Section */}
              {isExpanded && expandedSection === "providers" && (
                <div className="border-t border-border p-5 bg-muted/30">
                  <h5 className="font-display font-bold text-xs mb-3">Providers for {stage.display_name}</h5>
                  {stageProviders.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No providers configured. Edit stage to add providers.</p>
                  ) : (
                    <div className="grid gap-3">
                      {stageProviders.map(provider => {
                        const providerKeys = apiKeys.filter(k => k.provider_id === provider.id);
                        const activeKeys = providerKeys.filter(k => k.is_active).length;
                        return (
                          <div key={provider.id} className={`rounded-xl border p-4 bg-card ${provider.is_default ? "border-primary/40" : "border-border"}`}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-display font-bold text-sm">{provider.display_name}</span>
                                  {provider.is_default && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold gradient-bg text-primary-foreground">DEFAULT</span>}
                                </div>
                                <p className="text-[11px] text-muted-foreground">{activeKeys} active key{activeKeys !== 1 ? "s" : ""} • {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}</p>
                              </div>
                              <Switch checked={provider.is_active} onCheckedChange={() => handleToggleProvider(provider)} />
                            </div>

                            {/* Models */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {provider.models.map((m, idx) => (
                                <span key={m.id} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${idx === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                  {m.name || m.id}
                                </span>
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2" onClick={() => { setEditingProvider({ ...provider }); setNewModelForm({ id: "", name: "" }); }}>
                                <Edit className="h-3 w-3" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2" onClick={() => setKeyDialog({ open: true, providerId: provider.id, providerName: provider.display_name })}>
                                <Key className="h-3 w-3" /> Keys ({providerKeys.length})
                              </Button>
                              {!provider.is_default && (
                                <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2" onClick={() => handleSetDefaultProvider(provider)}>
                                  <Star className="h-3 w-3" /> Default
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Expanded Prompts Section */}
              {isExpanded && expandedSection === "prompts" && (
                <div className="border-t border-border p-5 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-display font-bold text-xs">Prompts for {stage.display_name}</h5>
                    <Button size="sm" className="gradient-bg border-0 text-primary-foreground gap-1.5 text-xs h-7" onClick={() => { setNewPrompt({ name: "", description: "", prompt_text: "" }); setCreatePromptForStage(stage.id); }}>
                      <Plus className="h-3 w-3" /> Add Prompt
                    </Button>
                  </div>

                  {stagePrompts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No prompts yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {stagePrompts.map(prompt => (
                        <div key={prompt.id} className={`rounded-xl border p-3 bg-card ${prompt.is_default ? "border-primary/40" : "border-border"}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display font-bold text-sm">{prompt.name}</span>
                                {prompt.is_default && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold gradient-bg text-primary-foreground">DEFAULT</span>}
                              </div>
                              {prompt.description && <p className="text-[11px] text-muted-foreground">{prompt.description}</p>}
                            </div>
                            <Switch checked={prompt.is_active} onCheckedChange={async () => {
                              const { error } = await (supabase.from("pipeline_prompts") as any).update({ is_active: !prompt.is_active }).eq("id", prompt.id);
                              if (!error) setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, is_active: !p.is_active } : p));
                            }} />
                          </div>
                          <div className="mb-2 p-2 rounded-lg bg-muted/50 border border-border">
                            <p className="text-[10px] text-muted-foreground font-mono line-clamp-2 whitespace-pre-wrap">{prompt.prompt_text.substring(0, 150)}...</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2" onClick={() => setEditingPrompt({ ...prompt })}><Edit className="h-3 w-3" /> Edit</Button>
                            {!prompt.is_default && <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2" onClick={() => handleSetDefaultPrompt(prompt)}><Star className="h-3 w-3" /> Default</Button>}
                            {!prompt.is_default && <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2 text-destructive" onClick={() => handleDeletePrompt(prompt.id)}><Trash2 className="h-3 w-3" /> Delete</Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Stage — {editingStage?.display_name}</DialogTitle></DialogHeader>
          {editingStage && (
            <div className="space-y-4">
              <div><Label className="text-xs text-muted-foreground">Display Name</Label><Input value={editingStage.display_name} onChange={e => setEditingStage(s => s ? { ...s, display_name: e.target.value } : null)} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={editingStage.description} onChange={e => setEditingStage(s => s ? { ...s, description: e.target.value } : null)} className="mt-1" rows={2} /></div>
              <div>
                <Label className="text-xs text-muted-foreground">Providers (comma-separated names)</Label>
                <Input value={(editingStage.providers as string[]).join(", ")} onChange={e => setEditingStage(s => s ? { ...s, providers: e.target.value.split(",").map(p => p.trim()).filter(Boolean) } : null)} className="mt-1" placeholder="Google AI, Groq, Anthropic" />
                <p className="text-[10px] text-muted-foreground mt-1">Available: {providers.map(p => p.display_name).join(", ")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Default Provider</Label>
                  <Select value={editingStage.default_provider} onValueChange={v => setEditingStage(s => s ? { ...s, default_provider: v } : null)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {providers.filter(p => (editingStage.providers as string[]).some(name => name === p.name || name === p.display_name)).map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.display_name}</SelectItem>
                      ))}
                      {providers.map(p => (
                        <SelectItem key={`all-${p.id}`} value={p.name}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs text-muted-foreground">Default Model</Label><Input value={editingStage.default_model} onChange={e => setEditingStage(s => s ? { ...s, default_model: e.target.value } : null)} className="mt-1" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingStage(null)}>Cancel</Button>
                <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdateStage} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog open={keyDialog.open} onOpenChange={(v) => setKeyDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">API Keys — {keyDialog.providerName}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add New Key</h4>
              <Input placeholder="Label (e.g. Key 1)" value={newKeyForm.label} onChange={e => setNewKeyForm(p => ({ ...p, label: e.target.value }))} />
              <Input placeholder="API Key" type="password" value={newKeyForm.api_key} onChange={e => setNewKeyForm(p => ({ ...p, api_key: e.target.value }))} />
              <Button size="sm" className="gradient-bg border-0 text-primary-foreground gap-1.5" onClick={handleAddKey}><Plus className="h-3.5 w-3.5" /> Add Key</Button>
            </div>
            <div className="space-y-3">
              {apiKeys.filter(k => k.provider_id === keyDialog.providerId).map(key => (
                <div key={key.id} className={`p-4 rounded-xl border ${key.is_active ? "border-border bg-card" : "border-destructive/20 bg-destructive/5 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium">{key.label || "Unnamed"}</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">{showKeys[key.id] ? key.api_key : maskKey(key.api_key)}</p>
                      <p className="text-[10px] text-muted-foreground">Used {key.usage_count}x{key.last_used_at ? ` • Last: ${new Date(key.last_used_at).toLocaleDateString()}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowKeys(p => ({ ...p, [key.id]: !p[key.id] }))}>{showKeys[key.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                      <Switch checked={key.is_active} onCheckedChange={() => handleToggleKey(key)} />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteKey(key.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {apiKeys.filter(k => k.provider_id === keyDialog.providerId).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No API keys yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Provider — {editingProvider?.display_name}</DialogTitle></DialogHeader>
          {editingProvider && (
            <div className="space-y-5">
              <div><Label className="text-xs text-muted-foreground">Display Name</Label><Input value={editingProvider.display_name} onChange={e => setEditingProvider(p => p ? { ...p, display_name: e.target.value } : null)} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Base URL</Label><Input value={editingProvider.base_url} onChange={e => setEditingProvider(p => p ? { ...p, base_url: e.target.value } : null)} className="mt-1" /></div>
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Models (first = default)</Label>
                <div className="space-y-2">
                  {editingProvider.models.map((model, idx) => (
                    <div key={model.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${idx === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{model.name || model.id}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{model.id}</p>
                      </div>
                      {idx === 0 && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">DEFAULT</span>}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleRemoveModel(model.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-border space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Add Model</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Model ID" value={newModelForm.id} onChange={e => setNewModelForm(p => ({ ...p, id: e.target.value }))} className="text-xs h-8" />
                    <Input placeholder="Display Name" value={newModelForm.name} onChange={e => setNewModelForm(p => ({ ...p, name: e.target.value }))} className="text-xs h-8" />
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={handleAddModel} disabled={!newModelForm.id.trim()}><Plus className="h-3 w-3" /> Add</Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingProvider(null)}>Cancel</Button>
                <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdateProvider}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Prompt Dialog */}
      <Dialog open={!!createPromptForStage} onOpenChange={() => setCreatePromptForStage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Create Prompt for {stages.find(s => s.id === createPromptForStage)?.display_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs text-muted-foreground">Name</Label><Input value={newPrompt.name} onChange={e => setNewPrompt(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Description</Label><Input value={newPrompt.description} onChange={e => setNewPrompt(p => ({ ...p, description: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Prompt Text</Label><Textarea value={newPrompt.prompt_text} onChange={e => setNewPrompt(p => ({ ...p, prompt_text: e.target.value }))} className="mt-1 font-mono text-xs min-h-[250px]" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreatePromptForStage(null)}>Cancel</Button>
              <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleCreatePrompt} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Prompt Dialog */}
      <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Prompt — {editingPrompt?.name}</DialogTitle></DialogHeader>
          {editingPrompt && (
            <div className="space-y-4">
              <div><Label className="text-xs text-muted-foreground">Name</Label><Input value={editingPrompt.name} onChange={e => setEditingPrompt(p => p ? { ...p, name: e.target.value } : null)} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Description</Label><Input value={editingPrompt.description} onChange={e => setEditingPrompt(p => p ? { ...p, description: e.target.value } : null)} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Prompt Text</Label><Textarea value={editingPrompt.prompt_text} onChange={e => setEditingPrompt(p => p ? { ...p, prompt_text: e.target.value } : null)} className="mt-1 font-mono text-xs min-h-[350px]" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdatePrompt} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
