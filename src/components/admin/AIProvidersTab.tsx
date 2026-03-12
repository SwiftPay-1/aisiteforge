import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Key, Eye, EyeOff, Star, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIModel { id: string; name: string; }
interface AIProvider { id: string; name: string; display_name: string; base_url: string; models: AIModel[]; is_active: boolean; is_default: boolean; sort_order: number; }
interface AIApiKey { id: string; provider_id: string; api_key: string; label: string; is_active: boolean; usage_count: number; last_used_at: string | null; }

const PROVIDER_LOGOS: Record<string, { emoji: string; gradient: string }> = {
  openai: { emoji: "🤖", gradient: "from-green-500 to-green-700" },
  deepseek: { emoji: "🔮", gradient: "from-blue-500 to-blue-700" },
  groq: { emoji: "⚡", gradient: "from-orange-500 to-orange-700" },
  google_ai: { emoji: "🧠", gradient: "from-red-500 to-yellow-500" },
  xai: { emoji: "✖️", gradient: "from-gray-700 to-gray-900" },
  huggingface: { emoji: "🤗", gradient: "from-yellow-400 to-yellow-600" },
  replicate: { emoji: "🔁", gradient: "from-indigo-500 to-indigo-700" },
  elevenlabs: { emoji: "🔊", gradient: "from-emerald-500 to-emerald-700" },
};

export default function AIProvidersTab() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [apiKeys, setApiKeys] = useState<AIApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [keyDialog, setKeyDialog] = useState<{ open: boolean; providerId: string; providerName: string }>({ open: false, providerId: "", providerName: "" });
  const [newKeyForm, setNewKeyForm] = useState({ api_key: "", label: "" });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [{ data: p }, { data: k }] = await Promise.all([
      supabase.from("ai_providers").select("*").order("sort_order") as any,
      supabase.from("ai_api_keys").select("*").order("created_at") as any,
    ]);
    setProviders((p || []).map((pr: any) => ({ ...pr, models: pr.models || [] })));
    setApiKeys(k || []);
    setLoading(false);
  };

  const handleToggleActive = async (provider: AIProvider) => {
    const { error } = await (supabase.from("ai_providers") as any).update({ is_active: !provider.is_active }).eq("id", provider.id);
    if (error) { toast.error("Failed"); return; }
    setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, is_active: !p.is_active } : p));
  };

  const handleSetDefault = async (provider: AIProvider) => {
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

  const maskKey = (key: string) => key.slice(0, 8) + "..." + key.slice(-4);

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        {providers.map(provider => {
          const providerKeys = apiKeys.filter(k => k.provider_id === provider.id);
          const activeKeys = providerKeys.filter(k => k.is_active).length;
          const logo = PROVIDER_LOGOS[provider.name] || { emoji: "🔧", gradient: "from-gray-500 to-gray-600" };

          return (
            <div key={provider.id} className={`rounded-2xl border-2 bg-card p-5 transition-all ${provider.is_default ? "border-primary/40 bg-primary/5" : provider.is_active ? "border-border" : "border-border opacity-50"}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${logo.gradient} text-xl flex items-center justify-center w-11 h-11`}>
                    {logo.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display font-bold">{provider.display_name}</h4>
                      {provider.is_default && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold gradient-bg text-primary-foreground">DEFAULT</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeKeys} active key{activeKeys !== 1 ? "s" : ""} • {(provider.models || []).length} models</p>
                  </div>
                </div>
                <Switch checked={provider.is_active} onCheckedChange={() => handleToggleActive(provider)} />
              </div>

              {/* Models */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(provider.models || []).map((m: AIModel) => (
                  <span key={m.id} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{m.name}</span>
                ))}
              </div>

              {/* Action buttons - stacked on mobile */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingProvider({ ...provider })}>
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setKeyDialog({ open: true, providerId: provider.id, providerName: provider.display_name })}>
                  <Key className="h-3.5 w-3.5" /> Keys ({providerKeys.length})
                </Button>
                {!provider.is_default && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleSetDefault(provider)}>
                    <Star className="h-3.5 w-3.5" /> Set Default
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* API Keys Dialog */}
      <Dialog open={keyDialog.open} onOpenChange={(v) => setKeyDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">API Keys — {keyDialog.providerName}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add New Key</h4>
              <div className="grid gap-3">
                <Input placeholder="Label (e.g. Key 1, Primary)" value={newKeyForm.label} onChange={e => setNewKeyForm(p => ({ ...p, label: e.target.value }))} />
                <Input placeholder="API Key (sk-...)" type="password" value={newKeyForm.api_key} onChange={e => setNewKeyForm(p => ({ ...p, api_key: e.target.value }))} />
              </div>
              <Button size="sm" className="gradient-bg border-0 text-primary-foreground gap-1.5" onClick={handleAddKey}>
                <Plus className="h-3.5 w-3.5" /> Add Key
              </Button>
            </div>

            <div className="space-y-3">
              {apiKeys.filter(k => k.provider_id === keyDialog.providerId).map(key => (
                <div key={key.id} className={`p-4 rounded-xl border ${key.is_active ? "border-border bg-card" : "border-destructive/20 bg-destructive/5 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium">{key.label || "Unnamed"}</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        {showKeys[key.id] ? key.api_key : maskKey(key.api_key)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Used {key.usage_count}x {key.last_used_at ? `• Last: ${new Date(key.last_used_at).toLocaleDateString()}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowKeys(p => ({ ...p, [key.id]: !p[key.id] }))}>
                        {showKeys[key.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Switch checked={key.is_active} onCheckedChange={() => handleToggleKey(key)} />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteKey(key.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {apiKeys.filter(k => k.provider_id === keyDialog.providerId).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No API keys yet. Add one above.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Edit Provider</DialogTitle></DialogHeader>
          {editingProvider && (
            <div className="space-y-4">
              <div><Label className="text-xs text-muted-foreground">Display Name</Label><Input value={editingProvider.display_name} onChange={e => setEditingProvider(p => p ? { ...p, display_name: e.target.value } : null)} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Base URL</Label><Input value={editingProvider.base_url} onChange={e => setEditingProvider(p => p ? { ...p, base_url: e.target.value } : null)} className="mt-1" /></div>
              <div>
                <Label className="text-xs text-muted-foreground">Models (JSON)</Label>
                <textarea className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono min-h-[120px]"
                  value={JSON.stringify(editingProvider.models, null, 2)}
                  onChange={e => { try { setEditingProvider(p => p ? { ...p, models: JSON.parse(e.target.value) } : null); } catch { } }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProvider(null)}>Cancel</Button>
                <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleUpdateProvider}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
