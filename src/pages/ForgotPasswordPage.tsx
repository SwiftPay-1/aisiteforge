import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success("Reset link sent! Check your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center hero-gradient dark px-4">
      <div className="w-full max-w-md glass-dark rounded-2xl p-8">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="gradient-bg rounded-lg p-1.5">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-primary-foreground">SiteForge AI</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-center mb-6 text-primary-foreground">Reset Password</h1>
        {sent ? (
          <div className="text-center text-muted-foreground">
            <p className="mb-4">We sent a reset link to <strong className="text-primary-foreground">{email}</strong></p>
            <Link to="/login" className="text-primary hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-muted-foreground">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-background/10 border-border/30 text-primary-foreground" />
            </div>
            <Button type="submit" className="w-full gradient-bg border-0 text-primary-foreground" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Link to="/login" className="text-sm text-primary hover:underline block text-center">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
