import { useState } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { getTodayDateString } from "../lib/date";
import { Card } from "../components/ui";
import { WhyEditor } from "../components/SeasonWidgets";
import { ChevronRight } from "lucide-react";
import { CORE_VALUES } from "../constants/whyValues";
import { useT } from "../i18n";
import type { EnergyLevel } from "../types/app";

export function EnergyCheck({ value, onChange, compact = false }: { value?: EnergyLevel; onChange: (value: EnergyLevel) => void; compact?: boolean }) {
  const store = useMonkStore();
  const today = getTodayDateString();
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - (6 - i));
    return getTodayDateString(d);
  });

  const labels: Record<EnergyLevel, string> = {
    low: "Low",
    medium: "Steady",
    high: "High"
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">Energy</p>
          <p className="mt-0.5 text-xs text-monk-muted">How full is the tank today?</p>
        </div>
        {value ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            value === "high"
              ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
              : value === "medium"
              ? "border-monk-accent/30 bg-monk-accent-soft text-monk-accent"
              : "border-monk-danger/30 bg-monk-danger-soft text-monk-danger"
          }`}>
            {labels[value]}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["low", "medium", "high"] as EnergyLevel[]).map((level) => {
          const selected = value === level;
          const tone =
            level === "high"
              ? selected
                ? "border-monk-success bg-monk-success-soft text-monk-success"
                : "border-monk-border text-monk-muted hover:border-monk-success/40"
              : level === "medium"
              ? selected
                ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                : "border-monk-border text-monk-muted hover:border-monk-accent/40"
              : selected
              ? "border-monk-danger bg-monk-danger-soft text-monk-danger"
              : "border-monk-border text-monk-muted hover:border-monk-danger/40";
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`min-h-12 rounded-monk border text-sm font-semibold transition active:scale-95 ${tone}`}
            >
              {labels[level]}
            </button>
          );
        })}
      </div>
      {!compact ? (
        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-monk-muted">7-day trend</p>
          <div className="flex items-end gap-1.5" aria-label="Energy trend last 7 days">
            {past7.map((date) => {
              const log = store.energyLogs?.find((l) => l.date === date);
              const isToday = date === today;
              const h = log?.level === "high" ? "h-5" : log?.level === "medium" ? "h-3.5" : log?.level === "low" ? "h-2" : "h-1.5";
              const color = log?.level === "high"
                ? "bg-monk-success"
                : log?.level === "medium"
                ? "bg-monk-accent"
                : log?.level === "low"
                ? "bg-monk-danger"
                : "bg-monk-border/40";
              return (
                <span
                  key={date}
                  title={`${date}${log ? ` · ${log.level}` : ""}`}
                  className={`inline-block w-full rounded-sm ${h} ${color} ${isToday ? "ring-1 ring-monk-accent/50" : ""}`}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function WhyStrip({ compact = false }: { compact?: boolean }) {
  const store = useMonkStore();
  const t = useT();
  const why = store.activeSeason?.why;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const intrinsicWhy = why?.why || why?.identity;
  const outcome = why?.desiredOutcome;
  const antiWhy = why?.antiWhy || why?.consequenceOfInaction;
  const hasWhy = !!(intrinsicWhy || outcome || antiWhy);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? t("why.editButton") : t("why.sectionTitle")}
        </p>
        <WhyEditor
          initial={why}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            store.updateSeasonWhy(next);
            setEditing(false);
            setOpen(true);
          }}
        />
      </Card>
    );
  }

  if (!hasWhy) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full rounded-monk border border-dashed border-monk-accent/30 bg-monk-accent-soft/20 px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">{t("why.sectionTitle")}</p>
        <p className="mt-1 text-sm text-monk-muted">{t("why.emptyDesc")}</p>
      </button>
    );
  }

  const primaryLine = intrinsicWhy || outcome || antiWhy;

  if (compact) {
    return (
      <div className="rounded-monk border border-monk-accent/20 bg-monk-accent-soft/30 px-3.5 py-2 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 rounded bg-monk-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-monk-accent">
            {t("why.badgeWhy")}
          </span>
          <span className="truncate text-monk-muted">{primaryLine}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-[10px] font-semibold text-monk-accent hover:underline"
        >
          {t("why.editButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-monk border border-monk-accent/20 bg-monk-accent-soft/30 px-4 py-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-monk-accent/20 px-2 py-0.5 text-[9px] font-bold text-monk-accent">
                {t("why.badgeWhy")}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("why.sectionTitle")}</p>
            </div>
            {intrinsicWhy ? (
              <p className={`mt-1.5 text-sm font-semibold leading-snug text-monk-text ${open ? "" : "line-clamp-2"}`}>
                {intrinsicWhy}
              </p>
            ) : null}

            {/* In closed state, subtle teasers for outcome & anti-why */}
            {!open && (outcome || antiWhy) ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-monk-muted">
                {outcome ? (
                  <span className="truncate text-monk-accent">✦ {outcome}</span>
                ) : null}
                {antiWhy && !outcome ? (
                  <span className="truncate text-amber-500/90">⚠ {antiWhy}</span>
                ) : null}
              </div>
            ) : null}

            {/* Expanded 4-component view */}
            {open ? (
              <div className="mt-3 space-y-2 text-xs">
                {outcome ? (
                  <div className="rounded-xl border border-monk-accent/30 bg-monk-bg/60 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-monk-accent">
                      ✦ {t("why.badgeOutcome")}
                    </p>
                    <p className="mt-0.5 text-xs text-monk-text-soft leading-relaxed">{outcome}</p>
                  </div>
                ) : null}

                {antiWhy ? (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500">
                      ⚠ {t("why.badgeAntiWhy")}
                    </p>
                    <p className="mt-0.5 text-xs text-monk-text-soft leading-relaxed">{antiWhy}</p>
                  </div>
                ) : null}

                {why?.protectValues?.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {why.protectValues.map((id) => {
                      const v = CORE_VALUES.find((c) => c.id === id);
                      return (
                        <span
                          key={id}
                          className="rounded-full border border-monk-border bg-monk-bg px-2 py-0.5 text-[10px] font-medium text-monk-muted"
                        >
                          {v?.label ?? id}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <ChevronRight
            size={14}
            className={`mt-1 shrink-0 text-monk-muted transition ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {open ? (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-monk-accent transition hover:opacity-80"
          >
            {t("why.editButton")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
