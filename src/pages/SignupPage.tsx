import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Zap, ArrowRight, ArrowLeft, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  { title: "Create Account", subtitle: "Enter your credentials" },
  { title: "Personal Info", subtitle: "Tell us about yourself" },
  { title: "Verify Email", subtitle: "Enter the code sent to your email" },
];

const purposes = ["Business Website", "Portfolio", "E-commerce", "Blog", "Agency", "Other"];

export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const canNext = () => {
    if (step === 0) return name && email && password.length >= 6;
    if (step === 1) return true;
    return false;
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      await signUp(email, password, name);
      toast.success("Verification code sent!", {
        description: "Check your email for the 6-digit code.",
      });
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });
      if (error) throw error;
      toast.success("Email verified! Welcome to SiteForge AI 🎉");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      toast.success("New code sent to " + email);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  const handleNext = () => {
    if (step === 0) setStep(1);
    else if (step === 1) handleSignUp();
  };

  return (
    <div className="min-h-screen flex items-center justify-center hero-gradient dark px-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark rounded-2xl p-8"
        >
          <Link to="/" className="flex items-center gap-2 justify-center mb-6">
            <div className="gradient-bg rounded-lg p-1.5">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-primary-foreground">SiteForge AI</span>
          </Link>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step
                      ? "gradient-bg text-primary-foreground"
                      : i === step
                      ? "border-2 border-primary text-primary"
                      : "border border-border/30 text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < 2 && (
                  <div className={`w-8 h-0.5 ${i < step ? "gradient-bg" : "bg-border/30"}`} />
                )}
              </div>
            ))}
          </div>

          <h1 className="font-display text-2xl font-bold text-center mb-1 text-primary-foreground">
            {steps[step].title}
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-6">
            {steps[step].subtitle}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-muted-foreground">Full Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="bg-background/10 border-border/30 text-primary-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-muted-foreground">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="bg-background/10 border-border/30 text-primary-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-muted-foreground">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      className="bg-background/10 border-border/30 text-primary-foreground placeholder:text-muted-foreground/50"
                    />
                    {password && password.length < 6 && (
                      <p className="text-xs text-destructive mt-1">Password must be at least 6 characters</p>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone" className="text-muted-foreground">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1XXXXXXXXX"
                      className="bg-background/10 border-border/30 text-primary-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company" className="text-muted-foreground">Company / Organization</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Your company name"
                      className="bg-background/10 border-border/30 text-primary-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">What do you want to build?</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger className="bg-background/10 border-border/30 text-primary-foreground">
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        {purposes.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    We sent a 6-digit code to <strong className="text-primary-foreground">{email}</strong>
                  </p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="bg-background/10 border-border/30 text-primary-foreground" />
                        <InputOTPSlot index={1} className="bg-background/10 border-border/30 text-primary-foreground" />
                        <InputOTPSlot index={2} className="bg-background/10 border-border/30 text-primary-foreground" />
                        <InputOTPSlot index={3} className="bg-background/10 border-border/30 text-primary-foreground" />
                        <InputOTPSlot index={4} className="bg-background/10 border-border/30 text-primary-foreground" />
                        <InputOTPSlot index={5} className="bg-background/10 border-border/30 text-primary-foreground" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Didn't get the code? Resend"}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {step > 0 && step < 2 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="border-border/30 text-primary-foreground hover:bg-background/10"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step < 2 ? (
              <Button
                onClick={handleNext}
                className="flex-1 gradient-bg border-0 text-primary-foreground"
                disabled={!canNext() || loading}
              >
                {loading ? "Creating account..." : (
                  <>Next <ArrowRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleVerifyOtp}
                className="flex-1 gradient-bg border-0 text-primary-foreground"
                disabled={otp.length !== 6 || loading}
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
