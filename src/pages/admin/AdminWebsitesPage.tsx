import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export default function AdminWebsitesPage() {
  const navigate = useNavigate();
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    supabase.from("websites").select("*").then(({ data }) => {
      setWebsites(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = websites.filter(w =>
    w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">Websites</h1>
          <span className="text-sm text-muted-foreground">({websites.length})</span>
        </div>
      </motion.div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search websites..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left font-medium">Website</th>
                <th className="p-4 text-left font-medium">Category</th>
                <th className="p-4 text-left font-medium hidden sm:table-cell">Theme</th>
                <th className="p-4 text-left font-medium hidden sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{w.name}</td>
                  <td className="p-4 text-muted-foreground">{w.category || "—"}</td>
                  <td className="p-4 hidden sm:table-cell"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{w.theme || "—"}</span></td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{new Date(w.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
