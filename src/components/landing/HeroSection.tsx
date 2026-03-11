import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { lazy, Suspense } from "react";

const HeroScene = lazy(() => import("./HeroScene"));

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient">
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-block mb-6 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-sm font-medium text-primary"
        >
          ✨ AI-Powered Website Builder
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 text-primary-foreground"
        >
          Build Your Website
          <br />
          <span className="gradient-text">in Seconds with AI</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-muted-foreground"
        >
          Just type your business name and let AI create a stunning professional website instantly. No coding required.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button size="lg" className="gradient-bg border-0 text-primary-foreground px-8 text-base glow-shadow" asChild>
            <Link to="/signup">
              Start Building Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-primary/30 text-primary-foreground hover:bg-primary/10 px-8 text-base">
            <Play className="mr-2 h-4 w-4" /> Watch Demo
          </Button>
        </motion.div>
      </div>
      {/* bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
