import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CalmAlert, PrimaryButton } from "../components/ui";
import { routes } from "../constants/routes";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import type { MonkMVPState } from "../types/app";

interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const importState = useMonkStore((state) => state.importState);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const t = useT();

  // Onboarding is reachable with data still available elsewhere (cloud row or
  // a JSON export) — e.g. this browser's storage was cleared. Both recovery
  // doors live here so nobody has to redo the setup while their season exists.
  const restoreFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onerror = () => setRestoreError(t("welcome.errorRead"));
    reader.onload = (event) => {
      try {
        const data = JSON.parse(String(event.target?.result ?? ""));
        if (!data || typeof data !== "object" || !(data.userProfile || data.activeSeason || data.goals)) {
          setRestoreError(t("welcome.errorNotBackup"));
          return;
        }
        importState(data as Partial<MonkMVPState>);
        setRestoreError(null);
        navigate(routes.root);
      } catch {
        setRestoreError(t("welcome.errorRead"));
      }
    };
    reader.readAsText(file);
  };
  // motivated motion: staggered reveal establishes calm cadence + hierarchy (icon > brand > headline > sub > CTA)
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const }
        };

  return (
    <div className="flex flex-1 flex-col justify-between items-center py-2 sm:py-6 text-center">
      <div className="my-auto flex flex-col items-center w-full">
        <motion.div className="relative mx-auto mb-6 sm:mb-8" {...rise(0)}>
          <motion.div
            className="absolute left-1/2 top-1/2 h-36 w-36 sm:h-48 sm:w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-monk-accent/5 blur-2xl sm:blur-3xl"
            aria-hidden
            animate={reduce ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
            transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-full border border-monk-accent/20 bg-monk-soft text-monk-accent shadow-calm">
            <img src="/brand/zendo-symbol-light.svg" alt="" aria-hidden className="h-9 w-9 sm:h-11 sm:w-11" />
          </div>
        </motion.div>

        <motion.p className="mb-2 text-xs sm:text-sm font-medium uppercase tracking-widest text-monk-accent" {...rise(0.08)}>
          ZENDO
        </motion.p>
        <motion.h1
          id="welcome-heading"
          tabIndex={-1}
          className="mx-auto max-w-[18ch] text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight outline-none focus:outline-none ring-0 focus:ring-0"
          {...rise(0.16)}
        >
          {t("welcome.headline")}
        </motion.h1>
        <motion.p className="mx-auto mt-3 sm:mt-5 max-w-xs text-sm sm:text-base leading-relaxed text-monk-muted" {...rise(0.24)}>
          {t("welcome.subhead")}
        </motion.p>
        <motion.p className="mx-auto mt-2.5 text-xs font-medium text-monk-text-soft" {...rise(0.32)}>
          {t("welcome.timeNote")}
        </motion.p>
      </div>

      <motion.div className="mx-auto w-full max-w-xs shrink-0 pt-4" {...rise(0.4)}>
        <PrimaryButton
          className="transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          onClick={onNext}
        >
          {t("welcome.begin")}
        </PrimaryButton>
        <p className="mt-2.5 text-xs text-monk-text-soft">
          {t("welcome.autosave")}
        </p>

        {restoreError ? (
          <div className="mt-3 text-left">
            <CalmAlert type="danger" title={restoreError} />
          </div>
        ) : null}

        <div className="mt-4 border-t border-monk-border pt-3">
          <p className="text-xs text-monk-text-soft">{t("welcome.haveSeason")}</p>
          <div className="mt-1 flex items-center justify-center gap-3 text-xs">
            <Link
              to={routes.login}
              className="inline-flex min-h-11 items-center font-semibold text-monk-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg"
            >
              {t("welcome.signIn")}
            </Link>
            <span className="text-monk-muted/50" aria-hidden>
              ·
            </span>
            <label className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-monk-accent hover:underline focus-within:ring-2 focus-within:ring-monk-accent focus-within:ring-offset-2 focus-within:ring-offset-monk-bg rounded-sm">
              {t("welcome.restore")}
              <input
                type="file"
                accept=".json"
                className="hidden"
                aria-label={t("welcome.restoreAria")}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) restoreFromFile(file);
                }}
              />
            </label>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-monk-muted/60">
            {t("welcome.restoreHint")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
