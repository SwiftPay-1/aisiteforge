import { Crown } from "lucide-react";

export default function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider gradient-bg text-primary-foreground ${className}`}>
      <Crown className="h-3 w-3" />
      Pro
    </span>
  );
}
