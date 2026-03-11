import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Globe, Wand2, CreditCard, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || "User";

  const stats = [
    { label: "Websites Created", value: "0", icon: Globe, color: "text-primary" },
    { label: "AI Generations", value: "0", icon: Wand2, color: "text-accent" },
    { label: "Plan", value: "Free", icon: CreditCard, color: "text-primary" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Welcome back, {name} 👋</h1>
        <p className="text-muted-foreground mb-8">Here's your SiteForge AI overview.</p>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border card-shadow"
          >
            <stat.icon className={`h-8 w-8 mb-3 ${stat.color}`} />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-8 rounded-2xl gradient-bg text-primary-foreground"
      >
        <h2 className="font-display text-2xl font-bold mb-2">Create Your First Website</h2>
        <p className="opacity-80 mb-4">Use AI to generate a stunning website in seconds.</p>
        <Link to="/dashboard/generate" className="inline-flex items-center gap-2 px-4 py-2 bg-background/20 rounded-lg hover:bg-background/30 transition-colors font-medium text-sm">
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  );
}
