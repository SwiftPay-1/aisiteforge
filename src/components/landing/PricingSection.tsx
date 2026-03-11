import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Perfect to get started",
    features: ["1 website", "Basic templates", "AI generation", "Community support"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Premium",
    price: "499",
    currency: "৳",
    description: "For serious builders",
    features: ["Unlimited websites", "Advanced themes", "AI editing", "Custom domain support", "Priority support", "Analytics"],
    cta: "Go Premium",
    popular: true,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground text-lg">No hidden fees. Upgrade anytime.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`relative p-8 rounded-2xl border ${
                plan.popular
                  ? "border-primary/50 glow-shadow bg-card"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-xs font-semibold text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="font-display font-bold text-2xl mb-1">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-display font-bold">{plan.currency || "$"}{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${plan.popular ? "gradient-bg border-0 text-primary-foreground" : ""}`}
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link to={plan.popular ? "/dashboard/payment" : "/signup"}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
