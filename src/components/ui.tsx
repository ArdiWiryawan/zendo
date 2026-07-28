import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Check, Download, FileJson, FileText, Flag, Grid3X3, Settings, Sun, Upload } from "lucide-react";
import { hapticPress } from "../lib/haptics";
import { NavLink, useLocation } from "react-router-dom";
import { routes } from "../constants/routes";
import { useT } from "../i18n";

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
        <h1 className="text-[1.75rem] font-bold leading-10 tracking-tight sm:text-3xl">{title}</h1>
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
        important
          ? "rounded-monk-lg border-monk-border-strong bg-monk-soft p-6 monk-depth-raised"
          : "rounded-monk border-monk-border p-5 monk-depth"
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
      className={`monk-btn-primary min-h-12 w-full rounded-monk px-6 text-base font-bold bg-monk-accent text-monk-bg transition duration-150 ease-monk active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg ${className}`}
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
      className={`min-h-12 w-full rounded-monk border border-monk-border bg-monk-soft px-6 text-sm font-semibold text-monk-text shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-150 ease-monk active:scale-[0.98] enabled:hover:border-monk-border-strong enabled:hover:bg-monk-raised disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg ${className}`}
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
      className={`min-h-11 rounded-full px-4 text-sm font-medium text-monk-muted transition duration-150 ease-monk active:scale-[0.98] enabled:hover:text-monk-text disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg ${className}`}
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
        className={`min-h-12 w-full rounded-xl border border-monk-border bg-monk-surface px-4 text-sm text-monk-text placeholder:text-monk-text-soft transition-colors focus:border-monk-accent focus:outline-none focus:ring-1 focus:ring-monk-accent/40 [scroll-margin-bottom:200px] ${className}`}
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
        className={`min-h-[120px] w-full resize-none rounded-xl border border-monk-border bg-monk-surface p-4 text-sm leading-6 text-monk-text placeholder:text-monk-text-soft transition-colors focus:border-monk-accent focus:outline-none focus:ring-1 focus:ring-monk-accent/40 [scroll-margin-bottom:200px] ${className}`}
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
  icon: Icon,
  selected,
  onClick,
  disabled
}: {
  label: string;
  icon?: React.ElementType;
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
      className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-150 active:scale-[0.98] disabled:opacity-45 ${
        selected
          ? "border-monk-accent bg-monk-accent-soft font-semibold text-monk-accent"
          : "border-monk-border bg-monk-surface text-monk-muted hover:border-monk-border-strong"
      }`}
    >
      {Icon && <Icon size={16} strokeWidth={1.5} />}
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
      className={`relative w-full rounded-monk border p-4 min-h-14 text-left transition duration-150 ease-monk active:scale-[0.98] ${
        selected
          ? "border-monk-accent bg-monk-accent-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_-14px_rgba(164,139,94,0.55)]"
          : "border-monk-border bg-monk-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-monk-border-strong"
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
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-monk-soft shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
        <div className="h-1.5 rounded-full bg-monk-accent shadow-[0_0_8px_rgba(164,139,94,0.45)] transition-all duration-500 ease-monk" style={{ width: `${width}%` }} />
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

export function CalmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    const focusable = root?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <button
        type="button"
        aria-label={cancelLabel}
        className="absolute inset-0 bg-monk-bg/70 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calm-dialog-title"
        className="relative w-full max-w-[360px] rounded-monk-lg border border-monk-border bg-monk-surface p-5 shadow-calm"
      >
        <h2 id="calm-dialog-title" className="text-base font-semibold text-monk-text">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-monk-muted">{description}</p>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          <GhostButton type="button" onClick={onCancel}>
            {cancelLabel}
          </GhostButton>
          {danger ? (
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 rounded-full border border-monk-danger/40 bg-monk-danger/10 px-4 text-sm font-bold text-monk-danger transition active:scale-95"
            >
              {confirmLabel}
            </button>
          ) : (
            <PrimaryButton type="button" className="!w-auto px-5" onClick={onConfirm}>
              {confirmLabel}
            </PrimaryButton>
          )}
        </div>
      </div>
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
    <Card className="bg-monk-soft px-5 py-8 text-center">
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
  const t = useT();
  return (
    <NavLink
      to={routes.settings}
      aria-label={t("nav.settings")}
      className="grid h-12 w-12 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted transition duration-150 hover:border-monk-border-strong hover:text-monk-text active:scale-95"
    >
      <Settings size={20} strokeWidth={1.5} />
    </NavLink>
  );
}

function BottomNav() {
  const location = useLocation();
  const t = useT();
  const tabs = [
    { to: routes.today, label: t("nav.today"), icon: Sun },
    { to: routes.week, label: t("nav.week"), icon: Calendar },
    { to: routes.timeline, label: t("nav.timeline"), icon: Grid3X3 },
    { to: routes.journal, label: t("nav.journal"), icon: BookOpen }
  ];
  return (
    <nav aria-label={t("nav.main")}>
      <div className="monk-glass mx-auto grid h-[58px] max-w-[360px] grid-cols-4 rounded-full border border-monk-border-strong bg-monk-surface/90 p-1 shadow-calm backdrop-blur-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-medium transition duration-150 ${
                active ? "bg-monk-accent-soft text-monk-accent ring-1 ring-monk-accent/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-monk-text-soft hover:text-monk-muted"
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
  icon: Icon,
  selected,
  onClick
}: {
  title: string;
  badge: string;
  description: string;
  icon?: React.ElementType;
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
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-monk-soft">
              <Icon size={16} strokeWidth={1.5} />
            </div>
          )}
          <span className="text-base font-semibold">{title}</span>
        </div>
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

export function CalmToast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible || !message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[60] flex justify-center px-6"
    >
      <div className="rounded-full border border-monk-border-strong bg-monk-surface/95 px-4 py-2.5 text-sm font-medium text-monk-text shadow-calm backdrop-blur-md">
        {message}
      </div>
    </div>
  );
}

export function useCalmToast(durationMs = 2000) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), durationMs);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { message, visible, show, Toast: () => <CalmToast message={message} visible={visible} /> };
}
