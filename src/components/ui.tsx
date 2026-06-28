import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { ArrowRight, BookOpen, Calendar, Circle, Flag, Grid3X3, Settings } from "lucide-react";
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
  return (
    <div className="min-h-dvh bg-monk-bg text-monk-text">
      <ScreenContainer withBottomNavPadding={showBottomNav}>{children}</ScreenContainer>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}

export function OnboardingShell({
  children,
  currentStep,
  totalSteps
}: {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
}) {
  return (
    <div className="min-h-dvh bg-monk-bg text-monk-text">
      <ScreenContainer>
        {currentStep && totalSteps ? <StepIndicator currentStep={currentStep} totalSteps={totalSteps} /> : null}
        <div className="flex min-h-[calc(100dvh-72px)] flex-col">{children}</div>
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
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-bold leading-10 tracking-normal">{title}</h1>
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
        important ? "rounded-monk-lg border-monk-border-strong bg-monk-soft p-6" : "rounded-monk border-monk-border p-[22px]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-[50px] w-full rounded-[16px] bg-monk-accent px-6 text-base font-bold text-monk-bg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
        props.className ?? ""
      }`}
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-[46px] w-full rounded-[14px] border border-monk-border bg-monk-soft px-6 text-sm font-semibold text-monk-text transition active:scale-[0.98] disabled:opacity-45 ${
        props.className ?? ""
      }`}
    />
  );
}

export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-10 rounded-full px-4 text-xs font-medium text-monk-muted transition active:scale-[0.98] disabled:opacity-45 ${
        props.className ?? ""
      }`}
    />
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-[48px] w-full rounded-[14px] border border-monk-border bg-monk-surface px-4 text-sm text-monk-text placeholder:text-monk-text-soft focus:border-monk-accent focus:outline-none ${className}`}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[120px] w-full resize-none rounded-[16px] border border-monk-border bg-monk-surface p-4 text-sm leading-6 text-monk-text placeholder:text-monk-text-soft focus:border-monk-accent focus:outline-none ${className}`}
    />
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
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm transition disabled:opacity-45 ${
        selected
          ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
          : "border-monk-border bg-monk-surface text-monk-muted"
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
      onClick={onClick}
      className={`w-full rounded-monk border p-5 text-left transition ${
        selected ? "border-monk-accent bg-monk-accent-soft" : "border-monk-border bg-monk-surface"
      }`}
    >
      <span className="block text-base font-semibold">{title}</span>
      {description ? <span className="mt-1 block text-sm leading-6 text-monk-muted">{description}</span> : null}
    </button>
  );
}

export function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const width = Math.max(4, Math.min(100, (currentStep / totalSteps) * 100));
  return (
    <div className="mb-7 h-1.5 rounded-full bg-monk-soft" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      <div className="h-1.5 rounded-full bg-monk-accent transition-all" style={{ width: `${width}%` }} />
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
  return (
    <div className={`rounded-monk border p-4 ${classes[type]}`}>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm leading-6 text-monk-muted">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="bg-monk-soft text-center">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-monk-muted">{description}</p> : null}
    </Card>
  );
}

export function SettingsLink() {
  return (
    <NavLink
      to={routes.settings}
      aria-label="Settings"
      className="grid h-11 w-11 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted"
    >
      <Settings size={20} strokeWidth={1.5} />
    </NavLink>
  );
}

function BottomNav() {
  const location = useLocation();
  const tabs = [
    { to: routes.today, label: "Today", icon: Circle },
    { to: routes.week, label: "Week", icon: Calendar },
    { to: routes.timeline, label: "Timeline", icon: Grid3X3 },
    { to: routes.library, label: "Library", icon: BookOpen }
  ];
  return (
    <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] px-6">
      <div className="mx-auto grid h-[58px] max-w-[360px] grid-cols-4 rounded-full border border-monk-border-strong bg-monk-surface p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = location.pathname === tab.to;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition ${
                active ? "bg-monk-accent-soft text-monk-accent" : "text-monk-text-soft"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
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
      onClick={onClick}
      className={`w-full rounded-monk border p-4 text-left transition ${
        selected ? "border-monk-accent bg-monk-accent-soft" : "border-monk-border bg-monk-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold">{title}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
          <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-monk-accent">Start</span>
        </div>
        <div className="flex-1">
          <div className="relative h-1 rounded-full bg-monk-soft">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-monk-accent/60 to-monk-accent/20" />
          </div>
          <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-monk-muted">
            {durationLabel}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-monk-border bg-monk-soft">
            <Calendar size={14} className="text-monk-muted" />
          </div>
          <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-monk-muted">End</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between text-xs text-monk-text-soft">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
