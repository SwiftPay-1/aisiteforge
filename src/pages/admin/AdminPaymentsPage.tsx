import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*"),
      supabase.from("profiles").select("user_id, full_name, plan"),
    ]).then(([{ data: pay }, { data: pl }, { data: pr }]) => {
      setPayments(pay || []);
      setPlans(pl || []);
      setProfiles(pr || []);
      setLoading(false);
    });
  }, []);

  const handlePaymentAction = async (paymentId: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("payments").update({ status: action }).eq("id", paymentId);
    if (error) { toast.error("Failed"); return; }
    if (action === "approved") {
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        const plan = plans.find(pl => pl.id === payment.plan_id);
        const expiresAt = plan ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null;
        await supabase.from("profiles").update({ plan: "pro", plan_id: payment.plan_id, plan_expires_at: expiresAt }).eq("user_id", payment.user_id);
      }
    }
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: action } : p));
    toast.success(`Payment ${action}`);
  };

  const filtered = payments.filter(p =>
    p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sender_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">Payments</h1>
          <span className="text-sm text-muted-foreground">({payments.length})</span>
        </div>
      </motion.div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by TXN ID or sender..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map((p) => {
          const planName = plans.find(pl => pl.id === p.plan_id)?.name || "—";
          return (
            <div key={p.id} className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted-foreground">{p.transaction_id}</p>
                  <p className="text-sm font-medium">{p.sender_number}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-display font-bold text-lg">৳{p.amount}</span>
                    <span className="text-xs text-muted-foreground">• {planName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "approved" ? "bg-accent/10 text-accent" :
                      p.status === "rejected" ? "bg-destructive/10 text-destructive" :
                      "bg-yellow-500/10 text-yellow-600"
                    }`}>{p.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-accent gap-1.5" onClick={() => handlePaymentAction(p.id, "approved")}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive gap-1.5" onClick={() => handlePaymentAction(p.id, "rejected")}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">No payments found.</p>}
      </div>
    </div>
  );
}
