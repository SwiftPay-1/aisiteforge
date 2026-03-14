import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import PipelineStagesTab from "@/components/admin/PipelineStagesTab";

export default function AdminPipelinePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600">
            <Workflow className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">AI Pipeline</h1>
        </div>
        <p className="text-sm text-muted-foreground">Configure the 4-stage AI code generation pipeline — Breakdown, Code Generation, Bug Finder, and Finalize.</p>
      </motion.div>

      <PipelineStagesTab />
    </div>
  );
}
