import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Check, Flag, Grid3X3, Settings, Sun } from "lucide-react";
import { hapticPress } from "../lib/haptics";
import { NavLink, useLocation } from "react-router-dom";
import { routes } from "../constants/routes";

export function ScreenContainer({
  children,
  withBottomNavPadding = false
}: {
  children: ReactNode;
  withBottomNavPadding?: boolean;
}) {
  return (
    <main
      className={`mx-auto min-h-dvh w-full max-w-[430px] px-6 pt-[calc(env(safe-area-inset-top)+24px)] ${
        withBottomNavPadding ? "pb-[calc(env(safe-area-inset-bottom)+148px)]" : "pb-8"
      }`}
    >
      {children}
    </main>
  );
}

export function AppShell({ children, showBottomNav = true }: { children: ReactNode; showBottomNav?: boolean }) {
  const navVisible = useScrollNav();

  return (
    <div className="min-h-dvh bg-monk-bg text-monk-text">
      <ScreenContainer withBottomNavPadding={showBottomNav}>{children}</ScreenContainer>
      {showBottomNav ? (
        <div className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] px-6 transition-transform duration-300 z-50 ${
          navVisible ? "translate-y-0" : "translate-y-[120%]"
        }`}>
          <BottomNav />
        </div>
      ) : null}
    </div>
  );
}

export function OnboardingShell({
  children,
  currentStep,
  totalSteps,
  onBack
}: {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
  onBack?: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  useEffect(() => {
    if (!shellRef.current) return;

    const shell = shellRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(shell.querySelectorAll(focusableSelector)) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    shell.addEventListener('keydown', handleTab);
    return () => shell.removeEventListener('keydown', handleTab);
  }, [currentStep]);

  return (
    <div ref={shellRef} className="min-h-dvh bg-monk-bg text-monk-text">
      <ScreenContainer>
        {currentStep && totalSteps ? (
          <div className="mb-2 flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="grid min-h-12 min-w-12 shrink-0 place-items-center -ml-2 text-monk-muted hover:text-monk-text"
                aria-label="Go back"
              >
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
            </div>
          </div>
        ) : null}
        <div className="flex min-h-[calc(100dvh-72px)] flex-col pb-[env(safe-area-inset-bottom)]">{children}</div>
      </ScreenContainer>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  rightSlot
}: {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold leading-10 tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-monk-muted">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </header>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold leading-7">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm leading-6 text-monk-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
  important = false
}: {
  children: ReactNode;
  className?: string;
  important?: boolean;
}) {
  return (
    <div
      className={`border bg-monk-surface ${
        important ? "rounded-monk-lg border-monk-border-strong bg-monk-soft p-6" : "rounded-monk border-monk-border p-5"
      } ${className}`}
    >
      {children}
    </div>
  );
}
export function PrimaryButton({
  type = "button",
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      onClick={(e) => { hapticPress("medium"); onClick?.(e); }}
      className={`min-h-12 w-full rounded-monk px-6 text-base font-bold bg-monk-accent text-monk-bg transition duration-150 ease-monk active:scale-[0.98] enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}

export function SecondaryButton({
  type = "button",
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      onClick={(e) => { hapticPress("light"); onClick?.(e); }}
      className={`min-h-12 w-full rounded-monk border border-monk-border bg-monk-soft px-6 text-sm font-semibold text-monk-text transition duration-150 ease-monk active:scale-[0.98] enabled:hover:border-monk-border-strong enabled:hover:bg-monk-raised disabled:opacity-45 ${className}`}
    />
  );
}

export function GhostButton({
  type = "button",
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      onClick={(e) => { hapticPress("light"); onClick?.(e); }}
      className={`min-h-11 rounded-full px-4 text-sm font-medium text-monk-muted transition duration-150 ease-monk active:scale-[0.98] enabled:hover:text-monk-text disabled:opacity-45 ${className}`}
    />
  );
}

export function TextInput({
  className = "",
  label,
  showCharCount,
  minLength,
  value,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  showCharCount?: boolean;
  minLength?: number;
  value?: string;
}) {
  const count = typeof value === 'string' ? value.length : 0;
  const min = minLength ?? 0;

  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium text-monk-muted">{label}</label>}
      <input
        {...props}
        value={value}
        minLength={minLength}
        className={`min-h-12 w-full rounded-xl border border-monk-border bg-monk-surface px-4 text-sm text-monk-text placeholder:text-monk-text-soft transition-colors focus:border-monk-accent focus:outline-none [scroll-margin-bottom:200px] ${className}`}
      />
      {showCharCount && min > 0 && (
        <div
          aria-live="polite"
          className={`mt-1 text-right text-xs tabular-nums ${count < min ? "text-monk-danger" : "text-monk-muted"}`}
        >
          {count}/{min} characters
        </div>
      )}
    </div>
  );
}

export function Textarea({
  className = "",
  label,
  showCharCount,
  minLength,
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  showCharCount?: boolean;
  minLength?: number;
  value?: string;
}) {
  const count = typeof value === 'string' ? value.length : 0;
  const min = minLength ?? 0;

  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium text-monk-muted">{label}</label>}
      <textarea
        {...props}
        value={value}
        minLength={minLength}
        className={`min-h-[120px] w-full resize-none rounded-xl border border-monk-border bg-monk-surface p-4 text-sm leading-6 text-monk-text placeholder:text-monk-text-soft transition-colors focus:border-monk-accent focus:outline-none [scroll-margin-bottom:200px] ${className}`}
      />
      {showCharCount && min > 0 && (
        <div
          aria-live="polite"
          className={`mt-1 text-right text-xs tabular-nums ${count < min ? "text-monk-danger" : "text-monk-muted"}`}
        >
          {count}/{min} characters
        </div>
      )}
    </div>
  );
}

export function ChoiceChip({
  label,
  selected,
  onClick,
  disabled
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => { hapticPress("light"); onClick(); }}
      className={`min-h-11 rounded-full border px-4 text-sm transition-colors duration-150 disabled:opacity-45 ${
        selected
          ? "border-monk-accent bg-monk-accent-soft font-semibold text-monk-accent"
          : "border-monk-border bg-monk-surface text-monk-muted hover:border-monk-border-strong"
      }`}
    >
      {label}
    </button>
  );
}

export function ChoiceCard({
  title,
  description,
  selected,
  onClick
}: {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => { hapticPress("light"); onClick(); }}
      className={`relative w-full rounded-monk border p-4 min-h-14 text-left transition-colors duration-150 ${
        selected
          ? "border-monk-accent bg-monk-accent-soft"
          : "border-monk-border bg-monk-surface hover:border-monk-border-strong"
      }`}
    >
      <div className="flex items-start gap-3 pr-1">
        <div className="min-w-0 flex-1">
          <span className="block text-base font-semibold">{title}</span>
          {description ? <span className="mt-1 block text-sm leading-6 text-monk-muted">{description}</span> : null}
        </div>
        {selected ? (
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-monk-accent text-monk-bg" aria-hidden>
            <Check size={12} strokeWidth={2.5} />
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const width = Math.max(4, Math.min(100, (currentStep / totalSteps) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-label={`Progress: step ${currentStep} of ${totalSteps}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs text-monk-muted">Step {currentStep} of {totalSteps}</p>
        <p className="text-xs font-semibold tabular-nums text-monk-text-soft">{Math.round(width)}%</p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-monk-soft">
        <div className="h-1.5 rounded-full bg-monk-accent transition-all duration-300 ease-out" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function CalmAlert({
  type = "info",
  title,
  description
}: {
  type?: "info" | "warning" | "danger" | "success";
  title: string;
  description?: string;
}) {
  const classes = {
    info: "bg-monk-soft border-monk-border",
    warning: "bg-monk-warning-soft border-monk-warning",
    danger: "bg-monk-danger-soft border-monk-danger",
    success: "bg-monk-success-soft border-monk-success"
  };
  const role = type === "danger" || type === "warning" ? "alert" : "status";
  return (
    <div role={role} className={`rounded-monk border p-4 ${classes[type]}`}>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm leading-6 text-monk-muted">{description}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="bg-monk-soft text-center">
      <p className="font-semibold text-monk-text">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-monk-muted">{description}</p> : null}
      {actionLabel && onAction ? (
        <PrimaryButton type="button" className="mt-5" onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      ) : null}
    </Card>
  );
}

export function SettingsLink() {
  return (
    <NavLink
      to={routes.settings}
      aria-label="Settings"
      className="grid h-12 w-12 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted transition duration-150 hover:border-monk-border-strong hover:text-monk-text"
    >
      <Settings size={20} strokeWidth={1.5} />
    </NavLink>
  );
}

function BottomNav() {
  const location = useLocation();
  const tabs = [
    { to: routes.today, label: "Today", icon: Sun },
    { to: routes.week, label: "Week", icon: Calendar },
    { to: routes.timeline, label: "Timeline", icon: Grid3X3 },
    { to: routes.journal, label: "Journal", icon: BookOpen }
  ];
  return (
    <nav aria-label="Main">
      <div className="mx-auto grid h-[58px] max-w-[360px] grid-cols-4 rounded-full border border-monk-border-strong bg-monk-surface/95 p-1 shadow-soft backdrop-blur-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-medium transition duration-150 ${
                active ? "bg-monk-accent-soft text-monk-accent" : "text-monk-text-soft hover:text-monk-muted"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function DurationCard({
  title,
  badge,
  description,
  selected,
  onClick
}: {
  title: string;
  badge: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => { hapticPress("light"); onClick(); }}
      className={`w-full rounded-monk border p-4 text-left transition duration-150 ${
        selected ? "border-monk-accent bg-monk-accent-soft" : "border-monk-border bg-monk-surface hover:bg-monk-soft hover:border-monk-border-strong"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold">{title}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
          selected ? "bg-monk-accent/15 text-monk-accent" : "bg-monk-soft text-monk-muted"
        }`}>
          {badge}
        </span>

      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-monk-muted">{description}</p>
    </button>
  );
}

export function SeasonPreviewCard({
  startLabel,
  endLabel,
  durationLabel
}: {
  startLabel: string;
  endLabel: string;
  durationLabel: string;
}) {
  return (
    <div className="rounded-monk border border-monk-border bg-monk-surface p-5">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-monk-muted">Your Season</p>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-monk-accent bg-monk-accent-soft">
            <Flag size={14} className="text-monk-accent" />
          </div>
          <span className="mt-1.5 text-xs font-bold uppercase tracking-wider text-monk-accent">Start</span>
        </div>
        <div className="flex-1">
          <div className="relative h-1 rounded-full bg-monk-soft">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-monk-accent/60 to-monk-accent/20" />
          </div>
          <p className="mt-1.5 text-center text-xs font-bold uppercase tracking-wider text-monk-muted">
            {durationLabel}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-monk-border bg-monk-soft">
            <Calendar size={14} className="text-monk-muted" />
          </div>
          <span className="mt-1.5 text-xs font-bold uppercase tracking-wider text-monk-muted">End</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between text-xs text-monk-text-soft">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

export function useScrollNav() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:80px;height:1px;width:1px;pointer-events:none";
    document.body.appendChild(sentinel);
    let lastY = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentY = window.scrollY;
        if (!entry.isIntersecting && currentY > lastY) setVisible(false);
        else setVisible(true);
        lastY = currentY;
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => { observer.disconnect(); sentinel.remove(); };
  }, []);

  return visible;
}
