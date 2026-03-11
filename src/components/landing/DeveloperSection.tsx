import { motion } from "framer-motion";
import { Mail, Globe, Github, Twitter } from "lucide-react";

export default function DeveloperSection() {
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
          <div className="w-24 h-24 rounded-full gradient-bg mx-auto mb-4 flex items-center justify-center text-3xl font-display font-bold text-primary-foreground">
            SF
          </div>
          <h3 className="font-display font-bold text-xl mb-1">SiteForge Developer</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Full-stack developer passionate about AI and building tools that empower creators.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="#" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Mail className="h-5 w-5" />
            </a>
            <a href="#" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Globe className="h-5 w-5" />
            </a>
            <a href="#" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
