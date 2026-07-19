// src/components/SignupScreen.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase as getSupabase } from "../lib/supabase";
const sb = getSupabase();
import { PrimaryButton, GhostButton, TextInput } from "./ui";

export default function SignupScreen() {
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
      const { data, error } = (await sb?.auth.signUp({
        email,
        password,
      })) ?? { data: null, error: null };
      if (error) throw error;
      // auto-login if session created, else go to login
      if (data?.session) {
        navigate("/today", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err: unknown) {
      const msg = (err as any)?.message || "Signup failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-bold text-center mb-6">Create your Zendo account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-monk-text">
              Email
            </label>
            <TextInput
              type="email"
              value={email}
              placeholder="your@email.com"
              autoComplete="email"
              className="mt-1"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-monk-text">
              Password
            </label>
            <TextInput
              type="password"
              value={password}
              placeholder="••••••••"
              autoComplete="new-password"
              className="mt-1"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-monk-danger mt-2">{error}</p>}

          <PrimaryButton type="submit" disabled={loading} className="hover:opacity-90">
            {loading ? "Creating…" : "Sign Up"}
          </PrimaryButton>
        </form>

        <div className="mt-4">
          <GhostButton
            onClick={() => navigate("/login")}
            className="text-monk-accent hover:text-monk-accent"
          >
            Already have an account? Log in
          </GhostButton>
        </div>
      </div>
    </div>
  );
}