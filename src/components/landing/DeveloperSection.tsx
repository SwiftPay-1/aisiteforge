import { motion } from "framer-motion";
import { Mail, Globe, Github, Twitter } from "lucide-react";
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
    { url: dev.email, icon: Mail, href: dev.email ? `mailto:${dev.email}` : "#" },
    { url: dev.website_url, icon: Globe, href: dev.website_url || "#" },
    { url: dev.github_url, icon: Github, href: dev.github_url || "#" },
    { url: dev.twitter_url, icon: Twitter, href: dev.twitter_url || "#" },
  ];

  return (
    <section id="developer" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Meet the <span className="gradient-text">Developer</span>
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto text-center p-8 rounded-2xl bg-card border border-border card-shadow"
        >
          {dev.avatar_url ? (
            <img
              src={dev.avatar_url}
              alt={dev.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-2 border-primary/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-full gradient-bg mx-auto mb-4 flex items-center justify-center text-3xl font-display font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <h3 className="font-display font-bold text-xl mb-1">{dev.name}</h3>
          <p className="text-muted-foreground text-sm mb-4">{dev.bio}</p>
          <div className="flex items-center justify-center gap-4">
            {links.map(({ href, icon: Icon }, i) => (
              <a
                key={i}
                href={href}
                target={href.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
