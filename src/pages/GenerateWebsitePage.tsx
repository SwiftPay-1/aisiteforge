import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Wand2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

const themes = ["modern", "minimal", "startup", "dark"];
const categories = ["Technology", "Restaurant", "E-commerce", "Portfolio", "Agency", "Healthcare", "Education", "Real Estate"];

interface GeneratedSection {
  type: string;
  title: string;
  content: string;
}

export default function GenerateWebsitePage() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedSection[] | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !category || !description || !theme) {
      toast.error("Please fill all fields");
      return;
    }
    setGenerating(true);
    // Simulate AI generation
    await new Promise((r) => setTimeout(r, 2500));
    setPreview([
      { type: "hero", title: businessName, content: description },
      { type: "about", title: "About Us", content: `${businessName} is a leading ${category.toLowerCase()} company dedicated to excellence.` },
      { type: "services", title: "Our Services", content: "We offer a wide range of professional services tailored to your needs." },
      { type: "features", title: "Why Choose Us", content: "Innovation, quality, and customer satisfaction are our core values." },
      { type: "testimonials", title: "What Our Clients Say", content: '"Outstanding service and results!" - Happy Customer' },
      { type: "contact", title: "Get In Touch", content: "Ready to get started? Contact us today." },
      { type: "footer", title: businessName, content: `© 2026 ${businessName}. All rights reserved.` },
    ]);
    setGenerating(false);
    toast.success("Website generated!");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">AI Website Generator</h1>
        <p className="text-muted-foreground mb-8">Describe your business and let AI build your website.</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleGenerate}
          className="space-y-5 p-6 rounded-2xl bg-card border border-border card-shadow"
        >
          <div>
            <Label>Business Name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. TechFlow" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of your business..." rows={3} />
          </div>
          <div>
            <Label>Theme Style</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {themes.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    theme === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full gradient-bg border-0 text-primary-foreground" disabled={generating}>
            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Wand2 className="h-4 w-4 mr-2" /> Generate Website</>}
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {preview ? (
            <div className="rounded-2xl border border-border overflow-hidden bg-card card-shadow">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Preview</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {preview.map((section, i) => (
                  <div key={i} className={`p-6 border-b border-border last:border-0 ${section.type === "hero" ? "gradient-bg text-primary-foreground" : ""}`}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{section.type}</p>
                    <h3 className="font-display font-bold text-lg mb-1">{section.title}</h3>
                    <p className={`text-sm ${section.type === "hero" ? "opacity-80" : "text-muted-foreground"}`}>{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Your website preview will appear here</p>
                <p className="text-sm">Fill the form and click generate</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
