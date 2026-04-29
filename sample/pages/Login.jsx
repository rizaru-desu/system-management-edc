import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Activity, Cpu } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@edc.io");
  const [password, setPassword] = useState("admin123");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/app/dashboard" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const res = login(email, password);
      setLoading(false);
      if (res.ok) {
        toast.success("Welcome back");
        navigate("/app/dashboard");
      } else {
        toast.error(res.error);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#F6F7F9]" data-testid="login-page">
      {/* Left: Visual */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-[#0E2748] text-white overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -right-32 -top-32 w-[500px] h-[500px] rounded-full bg-[#3F6FA8]/30 blur-3xl" />
        <div className="absolute -left-20 bottom-0 w-[400px] h-[400px] rounded-full bg-[#3F6FA8]/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
            <Cpu className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">EDC.OS</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#DDE0EC]/70 mb-4">
              Edc Lifecycle Platform
            </p>
            <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[0.95] tracking-tight">
              Run every<br />
              <span className="text-[#DDE0EC]">terminal,</span><br />
              <span className="italic font-medium">end to end.</span>
            </h1>
            <p className="text-[#DDE0EC]/70 text-base mt-6 max-w-md leading-relaxed">
              Orchestrate warehouses, service points, merchants, deliveries and field engineers from a single operations canvas.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { icon: ShieldCheck, label: "PCI Aware" },
              { icon: Activity, label: "Real-time Ops" },
              { icon: Cpu, label: "12k+ Terminals" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur">
                <f.icon className="w-4 h-4 text-[#DDE0EC] mb-3" strokeWidth={1.75} />
                <p className="text-xs text-white/80 leading-tight">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-[#DDE0EC]/60">
          © 2026 EDC.OS — Internal staging build
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-lg bg-[#0E2748] text-white flex items-center justify-center">
              <Cpu className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="font-display text-lg font-bold text-[#0E2748]">EDC.OS</span>
          </div>

          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#3F6FA8] mb-3">
            Sign in
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0E2748] tracking-tight">
            Welcome back, operator.
          </h2>
          <p className="text-sm text-[#0E2748]/60 mt-2">
            Enter your credentials to access the operations console.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[#0E2748]">
                Work Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3F6FA8]" strokeWidth={1.75} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 h-11 bg-white border-[#DDE0EC] focus-visible:ring-[#3F6FA8] focus-visible:ring-offset-0"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-[#0E2748]">
                  Password
                </Label>
                <button type="button" className="text-xs text-[#3F6FA8] hover:text-[#0E2748] transition-colors">
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3F6FA8]" strokeWidth={1.75} />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-white border-[#DDE0EC] focus-visible:ring-[#3F6FA8] focus-visible:ring-offset-0"
                  required
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3F6FA8] hover:text-[#0E2748]"
                  data-testid="login-toggle-password"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0E2748] hover:bg-[#3F6FA8] text-white font-semibold transition-all group"
              data-testid="login-submit-button"
            >
              {loading ? "Signing in…" : (
                <>
                  Continue to console
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-[#DDE0EC]/40 border border-[#DDE0EC]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3F6FA8] mb-2">
              Demo credentials
            </p>
            <div className="space-y-1 text-xs text-[#0E2748]/80 font-mono">
              <div>admin@edc.io / admin123 <span className="text-[#3F6FA8]">(SysAdmin)</span></div>
              <div>ops@edc.io / ops123 <span className="text-[#3F6FA8]">(Operations)</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
