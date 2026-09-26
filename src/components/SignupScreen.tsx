import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase as getSupabase } from "../lib/supabase";
import { useT } from "../i18n";
import { CalmAlert, GhostButton, PrimaryButton, TextInput } from "./ui";

export default function SignupScreen() {
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const sb = getSupabase();
      if (!sb) {
        throw new Error(t("auth.unconfigured"));
      }
      const { data, error: authError } = await sb.auth.signUp({
        email: email.trim(),
        password
      });
      if (authError) throw authError;

      if (data?.session) {
        navigate("/today", { replace: true });
      } else if (data?.user) {
        setInfo(t("auth.signup.confirmEmail"));
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || t("auth.signup.failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-accent-soft),transparent_55%)]"
      />
      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-monk-accent">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-monk-accent/70 align-middle" aria-hidden />
            {t("auth.brand")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{t("auth.signup.title")}</h1>
          <p className="text-sm text-monk-muted">{t("auth.signup.subtitle")}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-monk border border-monk-border bg-monk-surface/80 p-5 shadow-soft backdrop-blur-sm"
        >
          <TextInput
            label={t("auth.email")}
            type="email"
            value={email}
            placeholder={t("auth.emailPlaceholder")}
            autoComplete="email"
            autoFocus
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextInput
            label={t("auth.password")}
            type="password"
            value={password}
            placeholder={t("auth.passwordHint")}
            autoComplete="new-password"
            required
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? <CalmAlert type="danger" title={error} /> : null}
          {info ? <CalmAlert type="info" title={info} /> : null}

          <PrimaryButton type="submit" disabled={loading || !email || password.length < 6}>
            {loading ? t("auth.signup.loading") : t("auth.signup.submit")}
          </PrimaryButton>
        </form>

        <GhostButton className="w-full text-sm text-monk-accent" onClick={() => navigate("/login")}>
          {t("auth.signup.switch")}
        </GhostButton>
      </div>
    </div>
  );
}
