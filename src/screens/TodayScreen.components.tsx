import { useState } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { getTodayDateString } from "../lib/date";
import { Card } from "../components/ui";
import { WhyEditor } from "../components/SeasonWidgets";
import { ChevronRight } from "lucide-react";
import { CORE_VALUES } from "../constants/whyValues";
import type { EnergyLevel } from "../types/app";

export function EnergyCheck({ value, onChange }: { value?: EnergyLevel; onChange: (value: EnergyLevel) => void }) {
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
    </Card>
  );
}

export function WhyStrip() {
  const store = useMonkStore();
  const why = store.activeSeason?.why;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasWhy = !!(why?.identity || why?.consequenceOfInaction);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? "Edit why" : "Add your why"}
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Why you started</p>
        <p className="mt-1 text-sm text-monk-muted">Add your identity + what you lose if you stop.</p>
      </button>
    );
  }

  const line = why!.identity || why!.consequenceOfInaction;
  return (
    <div className="rounded-monk border border-monk-accent/20 bg-monk-accent-soft/40 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Why you started</p>
            <p className={`mt-1 text-sm leading-5 text-monk-text ${open ? "" : "line-clamp-2"}`}>{line}</p>
            {open && why!.consequenceOfInaction && why!.identity ? (
              <p className="mt-2 text-xs leading-5 text-monk-muted">
                If you stop: {why!.consequenceOfInaction}
              </p>
            ) : null}
            {open && why!.protectValues?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {why!.protectValues.map((id) => {
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
          <ChevronRight
            size={14}
            className={`mt-1 shrink-0 text-monk-muted transition ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>
      {open ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-xs font-semibold text-monk-accent transition hover:opacity-80"
        >
          Edit why
        </button>
      ) : null}
    </div>
  );
}
