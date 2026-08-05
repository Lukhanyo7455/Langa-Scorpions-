import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

export default function AdminLoginPage() {
  const { admin, login, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (admin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) { toast.success("Welcome back!"); nav("/admin"); }
    else toast.error(res.error || "Login failed");
  };

  const inp = "w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none";

  return (
    <div className="min-h-screen grid place-items-center bg-primary p-6" data-testid="admin-login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 text-white">
          <div className="w-14 h-14 rounded-2xl bg-accent grid place-items-center font-bold text-xl mx-auto mb-4">LS</div>
          <h1 className="font-heading font-bold text-3xl">Admin dashboard</h1>
          <p className="text-white/70 mt-1">Langa Scorpions internal tools</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-3xl p-8 space-y-5 shadow-2xl" data-testid="admin-login-form">
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} data-testid="login-email" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} data-testid="login-password" />
          </div>
          <button type="submit" disabled={busy} className="btn-accent w-full !py-3.5" data-testid="login-submit">
            <LogIn className="w-4 h-4" /> {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
