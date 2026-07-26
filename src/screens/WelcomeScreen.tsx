import { Feather } from "lucide-react";
import { PrimaryButton } from "../components/ui";

interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col justify-center text-center">
      <div className="relative mx-auto mb-10">
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-monk-accent/5 blur-3xl" aria-hidden />
        <div className="relative grid h-24 w-24 place-items-center rounded-full border border-monk-accent/20 bg-monk-soft text-monk-accent">
          <Feather size={36} strokeWidth={1.25} />
        </div>
      </div>
      <p className="mb-3 text-sm font-medium uppercase tracking-widest text-monk-accent">ZENDO</p>
      <h1 className="text-5xl font-bold leading-tight tracking-tighter">
        Make space for what matters.
      </h1>
      <p className="mx-auto mt-6 max-w-xs text-base text-monk-muted">
        Choose fewer goals. Build quiet momentum. One season at a time.
      </p>
      <p className="mx-auto mt-4 text-xs font-medium text-monk-text-soft">
        About 8–12 minutes · progress saves as you go
      </p>
      <div className="mt-12">
        <PrimaryButton
          className="transition-transform hover:scale-105 active:scale-95"
          onClick={onNext}
        >
          Begin
        </PrimaryButton>
      </div>
    </div>
  );
}
