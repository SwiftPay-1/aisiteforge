import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Star, FileText, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  prompt_text: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function SystemPromptsTab() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: "", description: "", prompt_text: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPrompts(); }, []);

  const fetchPrompts = async () => {
    const { data } = await (supabase.from("system_prompts") as any).select("*").order("sort_order");
    setPrompts(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newPrompt.name.trim() || !newPrompt.prompt_text.trim()) {
      toast.error("Name and prompt text are required");
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase.from("system_prompts") as any).insert({
      name: newPrompt.name.trim(),
      description: newPrompt.description.trim(),
      prompt_text: newPrompt.prompt_text.trim(),
      sort_order: prompts.length,
    }).select().single();
    if (error) { toast.error("Failed to create"); setSaving(false); return; }
    setPrompts(prev => [...prev, data]);
    setNewPrompt({ name: "", description: "", prompt_text: "" });
    setCreateDialogOpen(false);
    setSaving(false);
    toast.success("Prompt created!");
  };

  const handleUpdate = async () => {
    if (!editingPrompt) return;
    setSaving(true);
    const { error } = await (supabase.from("system_prompts") as any).update({
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

  const handleSetDefault = async (prompt: SystemPrompt) => {
    await (supabase.from("system_prompts") as any).update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await (supabase.from("system_prompts") as any).update({ is_default: true }).eq("id", prompt.id);
    if (error) { toast.error("Failed"); return; }
    setPrompts(prev => prev.map(p => ({ ...p, is_default: p.id === prompt.id })));
    toast.success(`"${prompt.name}" set as default`);
  };

  const handleToggleActive = async (prompt: SystemPrompt) => {
    const { error } = await (supabase.from("system_prompts") as any).update({ is_active: !prompt.is_active }).eq("id", prompt.id);
    if (error) { toast.error("Failed"); return; }
    setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, is_active: !p.is_active } : p));
  };

  const handleDelete = async (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (prompt?.is_default) { toast.error("Cannot delete the default prompt"); return; }
    const { error } = await (supabase.from("system_prompts") as any).delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast.success("Prompt deleted");
  };

  const handleDuplicate = (prompt: SystemPrompt) => {
    setNewPrompt({
      name: `${prompt.name} (Copy)`,
      description: prompt.description,
      prompt_text: prompt.prompt_text,
    });
    setCreateDialogOpen(true);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-sm">System Prompts</h3>
          <p className="text-xs text-muted-foreground">Manage the AI system prompts used for website generation</p>
        </div>
        <Button size="sm" className="gradient-bg border-0 text-primary-foreground gap-1.5" onClick={() => { setNewPrompt({ name: "", description: "", prompt_text: "" }); setCreateDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> New Prompt
        </Button>
      </div>

      <div className="grid gap-4">
        {prompts.map(prompt => (
          <div key={prompt.id} className={`rounded-2xl border-2 bg-card p-5 transition-all ${prompt.is_default ? "border-primary/40 bg-primary/5" : prompt.is_active ? "border-border" : "border-border opacity-50"}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display font-bold">{prompt.name}</h4>
                    {prompt.is_default && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold gradient-bg text-primary-foreground">DEFAULT</span>
                    )}
                  </div>
                  {prompt.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{prompt.description}</p>
                  )}
                </div>
              </div>
              <Switch checked={prompt.is_active} onCheckedChange={() => handleToggleActive(prompt)} />
            </div>

            {/* Preview of prompt text */}
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono line-clamp-3 whitespace-pre-wrap">
                {prompt.prompt_text.substring(0, 200)}...
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingPrompt({ ...prompt })}>
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleDuplicate(prompt)}>
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
              {!prompt.is_default && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleSetDefault(prompt)}>
                  <Star className="h-3.5 w-3.5" /> Set Default
                </Button>
              )}
              {!prompt.is_default && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(prompt.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
            </div>
          </div>
        ))}

        {prompts.length === 0 && (
          <div className="text-center py-10">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No prompts yet. Create your first one.</p>
          </div>
        )}
      </div>

      {/* Create Prompt Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Create New Prompt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={newPrompt.name} onChange={e => setNewPrompt(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="e.g. Minimalist Landing Page" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Input value={newPrompt.description} onChange={e => setNewPrompt(p => ({ ...p, description: e.target.value }))} className="mt-1" placeholder="Brief description of this prompt's purpose" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prompt Text</Label>
              <Textarea value={newPrompt.prompt_text} onChange={e => setNewPrompt(p => ({ ...p, prompt_text: e.target.value }))} className="mt-1 font-mono text-xs min-h-[300px]" placeholder="Enter the system prompt..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleCreate} disabled={saving}>
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
                <Textarea value={editingPrompt.prompt_text} onChange={e => setEditingPrompt(p => p ? { ...p, prompt_text: e.target.value } : null)} className="mt-1 font-mono text-xs min-h-[400px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdate} disabled={saving}>
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
