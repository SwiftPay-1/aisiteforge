import { motion } from "framer-motion";
import { Wand2, PenTool, Rocket, Palette } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI Website Generator",
    description: "Create a complete website with just a few words. Our AI understands your business and builds accordingly.",
  },
  {
    icon: PenTool,
    title: "AI Website Editor",
    description: "Edit your website using simple AI prompts. Say 'change colors to blue' and watch it happen.",
  },
  {
    icon: Rocket,
    title: "Instant Deploy",
    description: "Launch your website in minutes. No server setup, no hassle. One click deployment.",
  },
  {
    icon: Palette,
    title: "Modern Templates",
    description: "Beautiful startup-grade designs that make your business look professional from day one.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Everything You Need to <span className="gradient-text">Build Fast</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Powerful AI tools that turn your ideas into reality in seconds.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 card-shadow hover:glow-shadow"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
