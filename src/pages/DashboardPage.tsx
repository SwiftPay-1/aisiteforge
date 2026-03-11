import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Globe, Wand2, CreditCard, ArrowRight, Zap, TrendingUp, Crown } from "lucide-react";
import ProBadge from "@/components/ProBadge";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardPage() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || "User";
  const [websiteCount, setWebsiteCount] = useState(0);
  const [todayUsage, setTodayUsage] = useState(0);
  const [plan, setPlan] = useState("Free");

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [{ count: wCount }, { data: usage }, { data: profile }] = await Promise.all([
        supabase.from("websites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("daily_usage").select("generation_count").eq("user_id", user.id).eq("usage_date", new Date().toISOString().split("T")[0]).single(),
        supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
      ]);
      setWebsiteCount(wCount || 0);
      setTodayUsage(usage?.generation_count || 0);
      setPlan(profile?.plan === "pro" ? "Pro" : "Free");
    };
    fetchStats();
  }, [user]);

  const dailyLimit = plan === "Pro" ? "∞" : "3";

  const stats = [
    { label: "Websites Created", value: String(websiteCount), icon: Globe, color: "text-primary" },
    { label: "Today's Generations", value: `${todayUsage}/${dailyLimit}`, icon: Wand2, color: "text-accent" },
    { label: "Current Plan", value: plan, icon: plan === "Pro" ? Crown : CreditCard, color: plan === "Pro" ? "text-accent" : "text-primary" },
  ];

  const isPro = plan === "Pro";

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl gradient-bg">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold">Welcome back, {name} 👋</h1>
              {isPro && <ProBadge />}
            </div>
            <p className="text-muted-foreground text-sm">Here's your SiteForge AI overview.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-4 mt-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-card border border-border card-shadow hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`h-7 w-7 ${stat.color}`} />
              <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {plan === "Free" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-5 rounded-2xl bg-primary/5 border border-primary/20 mb-6 flex items-center justify-between gap-4"
        >
          <div>
            <p className="font-display font-semibold text-sm">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground">Get unlimited AI generations & premium features</p>
          </div>
          <Link to="/dashboard/payment">
            <button className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium whitespace-nowrap">
              Upgrade Now
            </button>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-8 rounded-2xl gradient-bg text-primary-foreground"
      >
        <h2 className="font-display text-2xl font-bold mb-2">Create Your Next Website</h2>
        <p className="opacity-80 mb-4">Use AI to generate a stunning website with real HTML, CSS & JS in seconds.</p>
        <Link to="/dashboard/generate" className="inline-flex items-center gap-2 px-4 py-2 bg-background/20 rounded-lg hover:bg-background/30 transition-colors font-medium text-sm">
          Generate Now <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  );
}
