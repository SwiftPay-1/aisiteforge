import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Plus, Edit, Trash2, ToggleLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ name: "", duration_days: 0, price: 0, features: "", is_active: true, sort_order: 0 });

  useEffect(() => {
    supabase.from("subscription_plans").select("*").order("sort_order").then(({ data }) => {
      setPlans(data || []);
      setLoading(false);
    });
  }, []);

  const openPlanEditor = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({ name: plan.name, duration_days: plan.duration_days, price: Number(plan.price), features: (plan.features || []).join("\n"), is_active: plan.is_active, sort_order: plan.sort_order });
    } else {
      setEditingPlan("new");
      setPlanForm({ name: "", duration_days: 7, price: 0, features: "", is_active: true, sort_order: plans.length + 1 });
    }
  };

  const handleSavePlan = async () => {
    const featuresArr = planForm.features.split("\n").map(f => f.trim()).filter(Boolean);
    const payload = { name: planForm.name, duration_days: planForm.duration_days, price: planForm.price, features: featuresArr, is_active: planForm.is_active, sort_order: planForm.sort_order, updated_at: new Date().toISOString() };
    if (editingPlan === "new") {
      const { data, error } = await supabase.from("subscription_plans").insert(payload).select().single();
      if (error) { toast.error("Failed to create plan"); return; }
      setPlans(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      toast.success("Plan created!");
    } else {
      const { error } = await supabase.from("subscription_plans").update(payload).eq("id", editingPlan.id);
      if (error) { toast.error("Failed to update plan"); return; }
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...payload, features: featuresArr } : p).sort((a, b) => a.sort_order - b.sort_order));
      toast.success("Plan updated!");
    }
    setEditingPlan(null);
  };

  const handleDeletePlan = async (planId: string) => {
    const { error } = await supabase.from("subscription_plans").delete().eq("id", planId);
    if (error) { toast.error("Failed to delete plan"); return; }
    setPlans(prev => prev.filter(p => p.id !== planId));
    toast.success("Plan deleted");
  };

  const handleTogglePlanActive = async (plan: any) => {
    const { error } = await supabase.from("subscription_plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
    if (error) { toast.error("Failed"); return; }
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold">Plans</h1>
          </div>
          <Button size="sm" className="gradient-bg border-0 text-primary-foreground gap-1.5" onClick={() => openPlanEditor()}>
            <Plus className="h-4 w-4" /> Add Plan
          </Button>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`relative p-5 rounded-2xl border-2 bg-card transition-all ${plan.is_active ? "border-border" : "border-destructive/20 opacity-60"}`}>
            {!plan.is_active && <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive">Inactive</span>}
            <h4 className="font-display font-bold text-lg mb-1">{plan.name}</h4>
            <p className="text-2xl font-display font-bold text-primary">৳{plan.price}</p>
            <p className="text-xs text-muted-foreground mb-4">{plan.duration_days} days</p>
            <ul className="space-y-1.5 mb-5">
              {(plan.features || []).map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => openPlanEditor(plan)}>
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTogglePlanActive(plan)}>
                <ToggleLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeletePlan(plan.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editingPlan === "new" ? "Create Plan" : "Edit Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs text-muted-foreground">Plan Name</Label><Input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="e.g. 7 Days Starter" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Duration (days)</Label><Input type="number" value={planForm.duration_days} onChange={e => setPlanForm(p => ({ ...p, duration_days: Number(e.target.value) }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Price (৳)</Label><Input type="number" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: Number(e.target.value) }))} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Features (one per line)</Label><Textarea value={planForm.features} onChange={e => setPlanForm(p => ({ ...p, features: e.target.value }))} className="mt-1" rows={4} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Sort Order</Label><Input type="number" value={planForm.sort_order} onChange={e => setPlanForm(p => ({ ...p, sort_order: Number(e.target.value) }))} className="mt-1" /></div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={planForm.is_active} onCheckedChange={v => setPlanForm(p => ({ ...p, is_active: v }))} />
                <Label className="text-xs text-muted-foreground">{planForm.is_active ? "Active" : "Inactive"}</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
              <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleSavePlan}>{editingPlan === "new" ? "Create" : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
