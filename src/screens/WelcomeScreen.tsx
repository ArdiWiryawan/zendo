import { motion, useReducedMotion } from "framer-motion";
import { Feather } from "lucide-react";
import { PrimaryButton } from "../components/ui";

interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  const reduce = useReducedMotion();
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
    <div className="flex flex-1 flex-col justify-center text-center">
      <motion.div className="relative mx-auto mb-10" {...rise(0)}>
        <motion.div
          className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-monk-accent/5 blur-3xl"
          aria-hidden
          animate={reduce ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
          transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative grid h-24 w-24 place-items-center rounded-full border border-monk-accent/20 bg-monk-soft text-monk-accent shadow-calm">
          <Feather size={36} strokeWidth={1.25} />
        </div>
      </motion.div>

      <motion.p className="mb-3 text-sm font-medium uppercase tracking-widest text-monk-accent" {...rise(0.08)}>
        ZENDO
      </motion.p>
      <motion.h1 id="welcome-heading" className="mx-auto max-w-[18ch] text-5xl font-bold leading-tight tracking-tighter" {...rise(0.16)}>
        Make space for what matters.
      </motion.h1>
      <motion.p className="mx-auto mt-6 max-w-xs text-base leading-7 text-monk-muted" {...rise(0.24)}>
        Choose fewer goals. Build quiet momentum. One season at a time.
      </motion.p>
      <motion.p className="mx-auto mt-4 text-xs font-medium text-monk-text-soft" {...rise(0.32)}>
        About 8-12 minutes · progress saves as you go
      </motion.p>

      <motion.div className="mx-auto mt-12 w-full max-w-xs" {...rise(0.4)}>
        <PrimaryButton
          className="transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          onClick={onNext}
        >
          Begin
        </PrimaryButton>
        <p className="mt-3 text-xs text-monk-text-soft">
          Setup is auto-saved. Leave anytime, resume where you stopped.
        </p>
      </motion.div>
    </div>
  );
}
