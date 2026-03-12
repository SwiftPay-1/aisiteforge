import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Globe, Wand2, CreditCard, ArrowRight, Zap, TrendingUp, Crown, Code2, Palette, Cpu, Calendar, Star, ExternalLink, Github, Twitter, Mail } from "lucide-react";
import ProBadge from "@/components/ProBadge";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DeveloperInfo {
  name: string;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  email: string | null;
  website_url: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || "User";
  const [websiteCount, setWebsiteCount] = useState(0);
  const [todayUsage, setTodayUsage] = useState(0);
  const [plan, setPlan] = useState("Free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [developer, setDeveloper] = useState<DeveloperInfo | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalWebsites, setTotalWebsites] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [{ count: wCount }, { data: usage }, { data: profile }, { data: devData }, { data: plansData }, { count: totalW }] = await Promise.all([
        supabase.from("websites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("daily_usage").select("generation_count").eq("user_id", user.id).eq("usage_date", new Date().toISOString().split("T")[0]).single(),
        supabase.from("profiles").select("plan, plan_expires_at").eq("user_id", user.id).single(),
        supabase.from("developer_settings").select("*").limit(1).single(),
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("websites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setWebsiteCount(wCount || 0);
      setTodayUsage(usage?.generation_count || 0);
      setPlan(profile?.plan === "pro" ? "Pro" : "Free");
      setPlanExpiresAt(profile?.plan_expires_at || null);
      setDeveloper(devData as DeveloperInfo | null);
      setPlans((plansData as SubscriptionPlan[]) || []);
      setTotalWebsites(totalW || 0);
    };
    fetchStats();
  }, [user]);

  const dailyLimit = plan === "Pro" ? "∞" : "3";
  const isPro = plan === "Pro";

  const stats = [
    { label: "Websites Created", value: String(websiteCount), icon: Globe, color: "text-primary" },
    { label: "Today's Generations", value: `${todayUsage}/${dailyLimit}`, icon: Wand2, color: "text-accent" },
    { label: "Current Plan", value: plan, icon: isPro ? Crown : CreditCard, color: isPro ? "text-accent" : "text-primary" },
  ];

  const techStack = [
    { name: "React + Vite", icon: Code2, desc: "Lightning-fast frontend" },
    { name: "AI Models", icon: Cpu, desc: "Multiple AI providers" },
    { name: "Beautiful UI", icon: Palette, desc: "Production-ready design" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome header */}
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

      {/* Stats cards */}
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

      {/* Upgrade banner */}
      {!isPro && (
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

      {/* Pro plan expiry info */}
      {isPro && planExpiresAt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-4 rounded-2xl bg-accent/5 border border-accent/20 mb-6 flex items-center gap-3"
        >
          <Calendar className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-medium">Pro Plan Active</p>
            <p className="text-xs text-muted-foreground">Expires: {new Date(planExpiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-8 rounded-2xl gradient-bg text-primary-foreground mb-8"
      >
        <h2 className="font-display text-2xl font-bold mb-2">Create Your Next Website</h2>
        <p className="opacity-80 mb-4">Use AI to generate a stunning website with real HTML, CSS & JS in seconds.</p>
        <Link to="/dashboard/generate" className="inline-flex items-center gap-2 px-4 py-2 bg-background/20 rounded-lg hover:bg-background/30 transition-colors font-medium text-sm">
          Generate Now <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      {/* Tech stack & Subscription Plans row */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-2xl bg-card border border-border card-shadow"
        >
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> Powered By
          </h3>
          <div className="space-y-3">
            {techStack.map((tech) => (
              <div key={tech.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="p-2 rounded-lg bg-primary/10">
                  <tech.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{tech.name}</p>
                  <p className="text-xs text-muted-foreground">{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Subscription Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-card border border-border card-shadow"
        >
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-accent" /> Available Plans
          </h3>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans available.</p>
          ) : (
            <div className="space-y-3">
              {plans.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.duration_days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">৳{p.price}</p>
                    <div className="flex gap-1 mt-0.5">
                      {p.features.slice(0, 2).map((f, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/dashboard/payment" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                View all plans <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Developer Info */}
      {developer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="p-6 rounded-2xl bg-card border border-border card-shadow mb-8"
        >
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-accent" /> Meet the Developer
          </h3>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {developer.avatar_url ? (
              <img src={developer.avatar_url} alt={developer.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-xl font-bold text-primary-foreground flex-shrink-0">
                {developer.name?.[0] || "D"}
              </div>
            )}
            <div className="flex-1">
              <p className="font-display font-semibold text-base">{developer.name}</p>
              {developer.bio && <p className="text-sm text-muted-foreground mt-1">{developer.bio}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {developer.github_url && (
                  <a href={developer.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                )}
                {developer.twitter_url && (
                  <a href={developer.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
                    <Twitter className="h-3.5 w-3.5" /> Twitter
                  </a>
                )}
                {developer.email && (
                  <a href={`mailto:${developer.email}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
                    <Mail className="h-3.5 w-3.5" /> Contact
                  </a>
                )}
                {developer.website_url && (
                  <a href={developer.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
                    <ExternalLink className="h-3.5 w-3.5" /> Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Stats footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
      >
        {[
          { label: "Your Websites", value: websiteCount },
          { label: "Today's Usage", value: todayUsage },
          { label: "Plan", value: plan },
          { label: "Member Since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "N/A" },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-lg font-display font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
