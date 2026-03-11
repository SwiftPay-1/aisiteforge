import { motion } from "framer-motion";
import { Globe, Pencil, Eye, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Mock data - in production this comes from DB
const websites: any[] = [];

export default function MyWebsitesPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">My Websites</h1>
          <p className="text-muted-foreground">Manage your generated websites.</p>
        </div>
        <Button className="gradient-bg border-0 text-primary-foreground" asChild>
          <Link to="/dashboard/generate"><Plus className="h-4 w-4 mr-2" /> New Website</Link>
        </Button>
      </motion.div>

      {websites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center py-20 rounded-2xl border-2 border-dashed border-border"
        >
          <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="font-display text-xl font-semibold mb-2">No websites yet</h2>
          <p className="text-muted-foreground mb-4">Create your first website with AI</p>
          <Button className="gradient-bg border-0 text-primary-foreground" asChild>
            <Link to="/dashboard/generate">Generate Website</Link>
          </Button>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site, i) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl bg-card border border-border card-shadow group"
            >
              <div className="h-32 rounded-lg bg-muted mb-4" />
              <h3 className="font-display font-semibold mb-1">{site.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">Created {site.created_at}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"><Eye className="h-3 w-3 mr-1" /> Preview</Button>
                <Button size="sm" variant="outline"><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
