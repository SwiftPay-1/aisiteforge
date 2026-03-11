import { motion } from "framer-motion";
import { Mail, Globe, Github, Twitter, Code2, Sparkles, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DevInfo {
  name: string;
  bio: string;
  avatar_url: string | null;
  email: string;
  website_url: string;
  github_url: string;
  twitter_url: string;
}

const defaultDev: DevInfo = {
  name: "SiteForge Developer",
  bio: "Full-stack developer passionate about AI and building tools that empower creators.",
  avatar_url: null,
  email: "",
  website_url: "",
  github_url: "",
  twitter_url: "",
};

const stats = [
  { icon: Code2, label: "Projects Built", value: "50+" },
  { icon: Sparkles, label: "AI Models Used", value: "10+" },
  { icon: Rocket, label: "Sites Generated", value: "1K+" },
];

export default function DeveloperSection() {
  const [dev, setDev] = useState<DevInfo>(defaultDev);

  useEffect(() => {
    supabase
      .from("developer_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setDev(data as unknown as DevInfo);
      });
  }, []);

  const initials = dev.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const links = [
    { url: dev.email, icon: Mail, href: dev.email ? `mailto:${dev.email}` : null, label: "Email" },
    { url: dev.website_url, icon: Globe, href: dev.website_url || null, label: "Website" },
    { url: dev.github_url, icon: Github, href: dev.github_url || null, label: "GitHub" },
    { url: dev.twitter_url, icon: Twitter, href: dev.twitter_url || null, label: "Twitter" },
  ].filter((l) => l.href);

  return (
    <section id="developer" className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Behind the scenes
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4 text-foreground">
            Meet the <span className="gradient-text">Developer</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            The mind behind SiteForge AI — building the future of web creation.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Main card */}
            <div className="p-8 md:p-10 rounded-2xl bg-card border border-border card-shadow relative overflow-hidden">
              {/* Gradient top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 gradient-bg" />

              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full gradient-bg blur-lg opacity-30 scale-110" />
                  {dev.avatar_url ? (
                    <img
                      src={dev.avatar_url}
                      alt={dev.name}
                      className="relative w-28 h-28 rounded-full object-cover border-4 border-card ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="relative w-28 h-28 rounded-full gradient-bg flex items-center justify-center text-4xl font-display font-bold text-primary-foreground border-4 border-card">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="text-center md:text-left flex-1">
                  <h3 className="font-display font-bold text-2xl mb-1 text-card-foreground">{dev.name}</h3>
                  <p className="text-primary text-sm font-medium mb-3">Full-Stack Developer & AI Engineer</p>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">{dev.bio}</p>

                  {/* Social links */}
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    {links.map(({ href, icon: Icon, label }) => (
                      <a
                        key={label}
                        href={href!}
                        target={href!.startsWith("mailto") ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground"
                        title={label}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
                {stats.map(({ icon: Icon, label, value }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="text-center"
                  >
                    <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="font-display font-bold text-xl text-card-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
