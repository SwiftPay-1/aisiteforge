import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SystemPromptsTab from "@/components/admin/SystemPromptsTab";

export default function AdminSystemPromptsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">System Prompts</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage and customize AI system prompts for website generation.</p>
      </motion.div>

      <SystemPromptsTab />
    </div>
  );
}
