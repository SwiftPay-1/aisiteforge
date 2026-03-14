import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Star, FileText, Copy, Zap, Search, Bug, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PipelineStage {
  id: string;
  name: string;
  display_name: string;
  description: string;
  stage_order: number;
  is_active: boolean;
  providers: string[];
  default_provider: string;
  default_model: string;
  created_at: string;
  updated_at: string;
}

interface PipelinePrompt {
  id: string;
  stage_id: string;
  name: string;
  description: string;
  prompt_text: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const stageIcons: Record<string, React.ElementType> = {
  breakdown: Search,
  code_generation: Zap,
  bug_finder: Bug,
  finalize: CheckCircle,
};

const stageColors: Record<string, string> = {
  breakdown: "from-blue-500 to-blue-600",
  code_generation: "from-emerald-500 to-emerald-600",
  bug_finder: "from-orange-500 to-red-500",
  finalize: "from-violet-500 to-purple-600",
};

export default function PipelineStagesTab() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [prompts, setPrompts] = useState<PipelinePrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PipelinePrompt | null>(null);
  const [createPromptForStage, setCreatePromptForStage] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({ name: "", description: "", prompt_text: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      (supabase.from("pipeline_stages") as any).select("*").order("stage_order"),
      (supabase.from("pipeline_prompts") as any).select("*").order("sort_order"),
    ]);
    setStages(s || []);
    setPrompts(p || []);
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
      display_name: editingStage.display_name,
      description: editingStage.description,
      providers: editingStage.providers,
      default_provider: editingStage.default_provider,
      default_model: editingStage.default_model,
      updated_at: new Date().toISOString(),
    }).eq("id", editingStage.id);
    if (error) { toast.error("Failed to update"); setSaving(false); return; }
    setStages(prev => prev.map(s => s.id === editingStage.id ? editingStage : s));
    setEditingStage(null);
    setSaving(false);
    toast.success("Stage updated!");
  };

  const handleCreatePrompt = async () => {
    if (!createPromptForStage || !newPrompt.name.trim() || !newPrompt.prompt_text.trim()) {
      toast.error("Name and prompt text are required");
      return;
    }
    setSaving(true);
    const stagePrompts = prompts.filter(p => p.stage_id === createPromptForStage);
    const { data, error } = await (supabase.from("pipeline_prompts") as any).insert({
      stage_id: createPromptForStage,
      name: newPrompt.name.trim(),
      description: newPrompt.description.trim(),
      prompt_text: newPrompt.prompt_text.trim(),
      sort_order: stagePrompts.length,
    }).select().single();
    if (error) { toast.error("Failed to create"); setSaving(false); return; }
    setPrompts(prev => [...prev, data]);
    setNewPrompt({ name: "", description: "", prompt_text: "" });
    setCreatePromptForStage(null);
    setSaving(false);
    toast.success("Prompt created!");
  };

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return;
    setSaving(true);
    const { error } = await (supabase.from("pipeline_prompts") as any).update({
      name: editingPrompt.name,
      description: editingPrompt.description,
      prompt_text: editingPrompt.prompt_text,
      is_active: editingPrompt.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", editingPrompt.id);
    if (error) { toast.error("Failed to update"); setSaving(false); return; }
    setPrompts(prev => prev.map(p => p.id === editingPrompt.id ? editingPrompt : p));
    setEditingPrompt(null);
    setSaving(false);
    toast.success("Prompt updated!");
  };

  const handleSetDefaultPrompt = async (prompt: PipelinePrompt) => {
    await (supabase.from("pipeline_prompts") as any).update({ is_default: false }).eq("stage_id", prompt.stage_id);
    const { error } = await (supabase.from("pipeline_prompts") as any).update({ is_default: true }).eq("id", prompt.id);
    if (error) { toast.error("Failed"); return; }
    setPrompts(prev => prev.map(p =>
      p.stage_id === prompt.stage_id ? { ...p, is_default: p.id === prompt.id } : p
    ));
    toast.success(`"${prompt.name}" set as default`);
  };

  const handleDeletePrompt = async (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (prompt?.is_default) { toast.error("Cannot delete the default prompt"); return; }
    const { error } = await (supabase.from("pipeline_prompts") as any).delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast.success("Prompt deleted");
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display font-bold text-sm">AI Pipeline Stages</h3>
        <p className="text-xs text-muted-foreground">Configure the 4-stage AI code generation pipeline with providers and prompts for each stage.</p>
      </div>

      <div className="grid gap-4">
        {stages.map((stage, i) => {
          const Icon = stageIcons[stage.name] || Zap;
          const color = stageColors[stage.name] || "from-gray-500 to-gray-600";
          const stagePrompts = prompts.filter(p => p.stage_id === stage.id);
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
                  {(stage.providers as string[]).map(provider => (
                    <Badge key={provider} variant={provider === stage.default_provider ? "default" : "outline"} className="text-[10px]">
                      {provider} {provider === stage.default_provider && "★"}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>Default: <strong>{stage.default_provider}</strong> / <strong>{stage.default_model}</strong></span>
                  <span>•</span>
                  <span>{stagePrompts.length} prompt{stagePrompts.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingStage({ ...stage })}>
                    <Edit className="h-3.5 w-3.5" /> Edit Stage
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setExpandedStage(isExpanded ? null : stage.id)}>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? "Hide" : "Show"} Prompts ({stagePrompts.length})
                  </Button>
                </div>
              </div>

              {/* Expanded Prompts Section */}
              {isExpanded && (
                <div className="border-t border-border p-5 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-display font-bold text-xs">Prompts for {stage.display_name}</h5>
                    <Button size="sm" className="gradient-bg border-0 text-primary-foreground gap-1.5 text-xs h-7" onClick={() => { setNewPrompt({ name: "", description: "", prompt_text: "" }); setCreatePromptForStage(stage.id); }}>
                      <Plus className="h-3 w-3" /> Add Prompt
                    </Button>
                  </div>

                  {stagePrompts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No prompts yet. Add one to get started.</p>
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
                            <p className="text-[10px] text-muted-foreground font-mono line-clamp-2 whitespace-pre-wrap">
                              {prompt.prompt_text.substring(0, 150)}...
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2" onClick={() => setEditingPrompt({ ...prompt })}>
                              <Edit className="h-3 w-3" /> Edit
                            </Button>
                            {!prompt.is_default && (
                              <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2" onClick={() => handleSetDefaultPrompt(prompt)}>
                                <Star className="h-3 w-3" /> Default
                              </Button>
                            )}
                            {!prompt.is_default && (
                              <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2 text-destructive hover:text-destructive" onClick={() => handleDeletePrompt(prompt.id)}>
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            )}
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
              <div>
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <Input value={editingStage.display_name} onChange={e => setEditingStage(s => s ? { ...s, display_name: e.target.value } : null)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={editingStage.description} onChange={e => setEditingStage(s => s ? { ...s, description: e.target.value } : null)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Providers (comma-separated)</Label>
                <Input
                  value={(editingStage.providers as string[]).join(", ")}
                  onChange={e => setEditingStage(s => s ? { ...s, providers: e.target.value.split(",").map(p => p.trim()).filter(Boolean) } : null)}
                  className="mt-1"
                  placeholder="Google AI, Anthropic, Groq"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Default Provider</Label>
                  <Input value={editingStage.default_provider} onChange={e => setEditingStage(s => s ? { ...s, default_provider: e.target.value } : null)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Default Model</Label>
                  <Input value={editingStage.default_model} onChange={e => setEditingStage(s => s ? { ...s, default_model: e.target.value } : null)} className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingStage(null)}>Cancel</Button>
                <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdateStage} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
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
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={newPrompt.name} onChange={e => setNewPrompt(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="e.g. React Code Generator" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Input value={newPrompt.description} onChange={e => setNewPrompt(p => ({ ...p, description: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prompt Text</Label>
              <Textarea value={newPrompt.prompt_text} onChange={e => setNewPrompt(p => ({ ...p, prompt_text: e.target.value }))} className="mt-1 font-mono text-xs min-h-[250px]" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreatePromptForStage(null)}>Cancel</Button>
              <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleCreatePrompt} disabled={saving}>
                {saving ? "Creating..." : "Create Prompt"}
              </Button>
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
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={editingPrompt.name} onChange={e => setEditingPrompt(p => p ? { ...p, name: e.target.value } : null)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input value={editingPrompt.description} onChange={e => setEditingPrompt(p => p ? { ...p, description: e.target.value } : null)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prompt Text</Label>
                <Textarea value={editingPrompt.prompt_text} onChange={e => setEditingPrompt(p => p ? { ...p, prompt_text: e.target.value } : null)} className="mt-1 font-mono text-xs min-h-[350px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdatePrompt} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
