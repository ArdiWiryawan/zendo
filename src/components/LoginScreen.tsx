import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase as getSupabase } from "../lib/supabase";
import { CalmAlert, GhostButton, PrimaryButton, TextInput } from "./ui";

const sb = getSupabase();

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = (await sb?.auth.signInWithPassword({
        email: email.trim(),
        password
      })) ?? { error: null };
      if (authError) throw authError;
      navigate("/today", { replace: true });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.monk-accent/5),transparent_55%)]"
      />
      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-monk-accent">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-monk-accent/70 align-middle" aria-hidden />
            Zendo
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-monk-muted">Sign in to continue your season.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-monk border border-monk-border bg-monk-surface/80 p-5 shadow-soft backdrop-blur-sm"
        >
          <TextInput
            label="Email"
            type="email"
            value={email}
            placeholder="you@email.com"
            autoComplete="email"
            autoFocus
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? <CalmAlert type="danger" title={error} /> : null}

          <PrimaryButton type="submit" disabled={loading || !email || !password}>
            {loading ? "Signing in…" : "Sign In"}
          </PrimaryButton>
        </form>

        <GhostButton className="w-full text-sm text-monk-accent" onClick={() => navigate("/signup")}>
          Don't have an account? Sign up
        </GhostButton>
      </div>
    </div>
  );
}
