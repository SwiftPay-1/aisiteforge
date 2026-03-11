import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { CreditCard, Copy, CheckCircle, Crown, Zap, Globe, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PAYMENT_NUMBER = "+8801610709657";

const steps = [
  "Open bKash app",
  `Send money to ${PAYMENT_NUMBER}`,
  "Enter ৳499 as the amount",
  "Complete the payment",
  "Copy the Transaction ID & paste below",
];

const proFeatures = [
  { icon: Wand2, text: "Unlimited AI Generations" },
  { icon: Globe, text: "Unlimited Websites" },
  { icon: Zap, text: "Advanced Themes & Features" },
  { icon: Crown, text: "Priority Support" },
];

export default function PaymentPage() {
  const { user } = useAuth();
  const [transactionId, setTransactionId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PAYMENT_NUMBER);
    toast.success("Number copied!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !senderNumber || !user) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      transaction_id: transactionId,
      sender_number: senderNumber,
      amount: 499,
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

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl gradient-bg">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Upgrade to Pro</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-12">Unlock unlimited AI website generation.</p>
      </motion.div>

      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-12 rounded-2xl bg-card border border-border card-shadow">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-accent" />
          <h2 className="font-display text-2xl font-bold mb-2">Payment Submitted!</h2>
          <p className="text-muted-foreground">Your payment is under review. You'll be upgraded within 24 hours.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Pro features card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-2xl gradient-bg text-primary-foreground"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Pro Plan</h2>
              <div>
                <span className="text-3xl font-display font-bold">৳499</span>
                <span className="text-sm opacity-70">/month</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {proFeatures.map((f) => (
                <div key={f.text} className="flex items-center gap-2 text-sm">
                  <f.icon className="h-4 w-4 opacity-80" />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl bg-card border border-border card-shadow">
              <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> bKash Payment
              </h2>
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
            </motion.div>

            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onSubmit={handleSubmit} className="p-6 rounded-2xl bg-card border border-border card-shadow space-y-4">
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
                {submitting ? "Submitting..." : "Submit Payment"}
              </Button>
            </motion.form>
          </div>
        </div>
      )}
    </div>
  );
}
