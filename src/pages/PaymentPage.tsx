import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { CreditCard, Copy, CheckCircle, Crown, Zap, Globe, Wand2, Clock, Check, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PAYMENT_NUMBER = "+8801610709657";

const steps = [
  "Open bKash app",
  `Send money to ${PAYMENT_NUMBER}`,
  "Enter the plan amount",
  "Complete the payment",
  "Copy the Transaction ID & paste below",
];

export default function PaymentPage() {
  const { user } = useAuth();
  const [transactionId, setTransactionId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setPlans(data || []);
      setLoadingPlans(false);
    };
    fetchPlans();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(PAYMENT_NUMBER);
    toast.success("Number copied!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !senderNumber || !user || !selectedPlan) {
      toast.error("Please select a plan and fill all fields");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      transaction_id: transactionId,
      sender_number: senderNumber,
      amount: selectedPlan.price,
      plan_id: selectedPlan.id,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to submit payment");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    toast.success("Payment submitted for review!");
  };

  const getPlanIcon = (index: number) => {
    const icons = [Clock, Zap, Crown, Star];
    return icons[index] || Star;
  };

  const getPlanColor = (index: number) => {
    const colors = [
      "from-blue-500 to-cyan-400",
      "from-violet-500 to-purple-400",
      "from-amber-500 to-orange-400",
      "from-emerald-500 to-teal-400",
    ];
    return colors[index] || colors[0];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl gradient-bg">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Upgrade Your Plan</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-12">Choose a plan that fits your needs.</p>
      </motion.div>

      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-12 rounded-2xl bg-card border border-border card-shadow">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-accent" />
          <h2 className="font-display text-2xl font-bold mb-2">Payment Submitted!</h2>
          <p className="text-muted-foreground">Your payment for <strong>{selectedPlan?.name}</strong> (৳{selectedPlan?.price}) is under review. You'll be upgraded within 24 hours.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Plan Selection */}
          <div>
            <h2 className="font-display text-lg font-semibold mb-4">Select a Plan</h2>
            {loadingPlans ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan, i) => {
                  const Icon = getPlanIcon(i);
                  const isSelected = selectedPlan?.id === plan.id;
                  const isPopular = i === 2;
                  return (
                    <motion.button
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider gradient-bg text-primary-foreground">
                          Popular
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full gradient-bg flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getPlanColor(i)} flex items-center justify-center mb-3`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-display font-bold text-sm mb-1">{plan.name}</h3>
                      <div className="mb-3">
                        <span className="text-2xl font-display font-bold">৳{plan.price}</span>
                        <span className="text-xs text-muted-foreground ml-1">/ {plan.duration_days} days</span>
                      </div>
                      <ul className="space-y-1.5">
                        {(plan.features || []).map((f: string) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-accent flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Section - only show when plan selected */}
          {selectedPlan && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border card-shadow">
                <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> bKash Payment
                </h2>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                  <p className="text-sm font-medium">Selected: <strong>{selectedPlan.name}</strong></p>
                  <p className="text-lg font-display font-bold text-primary">৳{selectedPlan.price}</p>
                </div>
                <div className="space-y-3 mb-6">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-muted flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">bKash Number</p>
                    <p className="font-display font-bold text-lg">{PAYMENT_NUMBER}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>

              <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleSubmit} className="p-6 rounded-2xl bg-card border border-border card-shadow space-y-4">
                <h2 className="font-display font-semibold text-lg mb-2">Submit Payment</h2>
                <div>
                  <Label>Transaction ID *</Label>
                  <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. TXN123456" required />
                </div>
                <div>
                  <Label>Sender Number *</Label>
                  <Input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="e.g. 01712345678" required />
                </div>
                <Button type="submit" className="w-full gradient-bg border-0 text-primary-foreground" disabled={submitting}>
                  {submitting ? "Submitting..." : `Pay ৳${selectedPlan.price} for ${selectedPlan.name}`}
                </Button>
              </motion.form>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
