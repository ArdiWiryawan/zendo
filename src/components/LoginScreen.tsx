// src/components/LoginScreen.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { PrimaryButton, GhostButton } from "../components/ui";

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/today", { replace: true });
    } catch (err: unknown) {
      const msg = (err as any)?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-3xl font-bold text-center mb-6">Login to Zendo</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-monk-text">
              Email
            </label>
            <input
              type="email"
              value={email}
              placeholder="your@email.com"
              className="mt-1 block w-full rounded-md border border-monk-border bg-monk-soft px-3 py-2"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-monk-text">
              Password
            </label>
            <input
              type="password"
              value={password}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border border-monk-border bg-monk-soft px-3 py-2"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-monk-danger mt-2">{error}</p>}

          <button
            type="submit"
            className="w-full bg-monk-accent text-monk-text px-4 py-2 rounded-md hover:bg-monk-accent hover:text-monk-accent transition"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-4">
          <GhostButton
            onClick={() => navigate("/signup")}
            className="text-monk-accent hover:text-monk-accent"
          >
            Don't have an account? Sign up
          </GhostButton>
        </div>
      </div>
    </div>
  );
}