import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="py-12 border-t border-border bg-card">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="gradient-bg rounded-lg p-1.5">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">SiteForge AI</span>
        </Link>
        <p className="text-sm text-muted-foreground">© 2026 SiteForge AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
