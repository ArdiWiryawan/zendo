import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Info,
  Layers,
  X
} from "lucide-react";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n";
import type { TimeBlock } from "../types/app";
import {
  activityCategoryColorLabelKey,
  activityCategoryHex,
  activityCategoryMeta,
  type ActivityCategory
} from "../lib/activityCategory";
import {
  downloadIcsFile,
  downloadIcsFileForCategory,
  downloadIcsFilesByCategory,
  groupTimeBlocksByCategory,
  type CategoryExportLabels
} from "../lib/ical";
import { hapticPress } from "../lib/haptics";
import { GhostButton, PrimaryButton, useCalmToast, useModalA11y } from "./ui";

interface CalendarExportModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  timeBlocks: TimeBlock[];
  seasonTitle?: string;
}

/** Google's own pages, opened directly so the user never has to hunt menus. */
const GOOGLE_CREATE_CALENDAR =
  "https://calendar.google.com/calendar/u/0/r/settings/createcalendar";
const GOOGLE_IMPORT_EXPORT = "https://calendar.google.com/calendar/u/0/r/settings/export";

/** One-time setup checklist. Calendar colors are a setup step, not per export. */
const SETUP_KEY = "zendo_calendar_setup_v1";

function readSetup(): Set<string> {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
    );
  } catch {
    return new Set();
  }
}

function writeSetup(done: Set<string>): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify([...done]));
  } catch {
    /* storage full or blocked — the checklist is a convenience, not data */
  }
}

/**
 * Calendar export surface.
 *
 * Google Calendar assigns color per *calendar* and ignores an event's `COLOR`
 * on ICS import — that is why a single export always arrives blue. The fix is
 * not a cleverer file, it is one calendar per activity category, so this modal
 * walks that setup explicitly instead of only offering a download button:
 * create the calendar, import the matching file into it, then set its color.
 * The emoji option is the fallback for anyone who keeps everything in one
 * calendar anyway.
 */
export function CalendarExportModal({
  open,
  onClose,
  date,
  timeBlocks,
  seasonTitle = "Zendo"
}: CalendarExportModalProps) {
  const t = useT();
  const toast = useCalmToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [withEmoji, setWithEmoji] = useState(false);
  const [done, setDone] = useState<Set<string>>(() => readSetup());

  useModalA11y({ open, ref: cardRef, onClose });

  useEffect(() => {
    if (open) setDone(readSetup());
  }, [open]);

  const groups = useMemo(() => groupTimeBlocksByCategory(timeBlocks), [timeBlocks]);

  const labels = useMemo(() => {
    const map: CategoryExportLabels = {};
    for (const group of groups) {
      map[group.category] = {
        label: t(activityCategoryMeta(group.category).labelKey as MessageKey),
        colorNote: `${t(activityCategoryColorLabelKey(group.category) as MessageKey)} (${activityCategoryHex(group.category)})`
      };
    }
    return map;
  }, [groups, t]);

  if (!open) return null;

  const toggleDone = (category: ActivityCategory) => {
    hapticPress("light");
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      writeSetup(next);
      return next;
    });
  };

  const handleExportPerCategory = () => {
    hapticPress("medium");
    const count = downloadIcsFilesByCategory(date, timeBlocks, seasonTitle, labels, { withEmoji });
    toast.show(t("calendarExport.downloadedMulti", { n: count }));
    setShowSteps(true);
  };

  const handleExportOne = (category: ActivityCategory) => {
    hapticPress("medium");
    const group = groups.find((item) => item.category === category);
    if (!group) return;
    downloadIcsFileForCategory(date, category, group.blocks, seasonTitle, labels, { withEmoji });
    toast.show(t("calendarExport.downloadedOne"));
  };

  const handleExportSingle = () => {
    hapticPress("medium");
    downloadIcsFile(date, timeBlocks, seasonTitle);
    toast.show(t("planning.downloadedIcs"));
    onClose();
  };

  const completedCount = groups.filter((group) => done.has(group.category)).length;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-5">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-monk-bg/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={cardRef}
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-export-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-monk-lg border border-monk-border/80 bg-monk-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-monk-border/50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-monk-accent/15 text-monk-accent">
              <CalendarDays size={17} />
            </span>
            <div>
              <h2 id="calendar-export-title" className="text-base font-bold tracking-tight text-monk-text">
                {t("calendarExport.title")}
              </h2>
              <p className="mt-0.5 text-xs text-monk-muted">{t("calendarExport.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("weeklyReviewModal.close")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-monk-muted transition hover:bg-monk-soft hover:text-monk-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-monk-border/60 bg-monk-soft/30 p-4 text-sm text-monk-muted">
              {t("calendarExport.empty")}
            </p>
          ) : (
            <>
              <div className="flex gap-2 rounded-2xl border border-monk-danger/30 bg-monk-danger/10 p-3 text-[12px] leading-relaxed text-monk-text-soft">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-monk-danger" />
                <p>{t("calendarExport.warning")}</p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">
                  {t("calendarExport.legendTitle")}
                </p>
                <span className="text-[10px] font-semibold text-monk-muted">
                  {t("calendarExport.setupProgress", { done: completedCount, total: groups.length })}
                </span>
              </div>

              <ul className="space-y-2">
                {groups.map((group) => {
                  const label = labels[group.category]?.label ?? group.category;
                  const colorLabel = t(
                    activityCategoryColorLabelKey(group.category) as MessageKey
                  );
                  const isDone = done.has(group.category);
                  return (
                    <li
                      key={group.category}
                      className={`rounded-xl border p-3 transition ${
                        isDone
                          ? "border-monk-success/40 bg-monk-success-soft/20"
                          : "border-monk-border/60 bg-monk-soft/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: activityCategoryHex(group.category) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-monk-text">{label}</p>
                          <p className="text-[10px] text-monk-muted">
                            {t("calendarExport.colorHint", {
                              color: colorLabel,
                              hex: activityCategoryHex(group.category)
                            })}
                          </p>
                        </div>
                        <span className="rounded-full bg-monk-surface px-2 py-0.5 text-[10px] font-semibold text-monk-muted">
                          {group.blocks.length}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <a
                          href={GOOGLE_CREATE_CALENDAR}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 text-[11px] font-semibold text-monk-text-soft transition hover:border-monk-accent/50 hover:text-monk-accent"
                        >
                          <ExternalLink size={11} />
                          {t("calendarExport.createCalendar")}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleExportOne(group.category)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 text-[11px] font-semibold text-monk-text-soft transition hover:border-monk-accent/50 hover:text-monk-accent"
                        >
                          <Download size={11} />
                          {t("calendarExport.downloadFile")}
                        </button>
                        <label className="ml-auto inline-flex min-h-8 cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-monk-muted">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleDone(group.category)}
                            className="h-3.5 w-3.5"
                          />
                          {t("calendarExport.done")}
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="space-y-2">
                <PrimaryButton type="button" onClick={handleExportPerCategory} className="w-full">
                  <Layers size={15} />
                  {t("calendarExport.downloadMulti", { n: groups.length })}
                </PrimaryButton>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-monk-border/60 bg-monk-soft/20 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={withEmoji}
                    onChange={(e) => setWithEmoji(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <span className="text-[11px] leading-relaxed text-monk-muted">
                    <span className="font-semibold text-monk-text">{t("calendarExport.emojiLabel")}</span>
                    <br />
                    {t("calendarExport.emojiHint")}
                  </span>
                </label>
                <GhostButton type="button" onClick={handleExportSingle} className="w-full">
                  <Download size={14} />
                  {t("calendarExport.downloadSingle")}
                </GhostButton>
              </div>

              <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/20">
                <button
                  type="button"
                  onClick={() => setShowSteps((prev) => !prev)}
                  aria-expanded={showSteps}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-monk-text"
                >
                  {t("calendarExport.howTo")}
                  <span className="text-monk-muted">{showSteps ? "−" : "+"}</span>
                </button>
                {showSteps ? (
                  <ol className="space-y-2 border-t border-monk-border/50 px-3.5 py-3 text-[12px] leading-relaxed text-monk-muted">
                    {(["step1", "step2", "step3", "step4", "step5"] as const).map((key) => (
                      <li key={key} className="flex gap-2">
                        <Check size={13} className="mt-0.5 shrink-0 text-monk-success" />
                        {t(`calendarExport.${key}` as MessageKey)}
                      </li>
                    ))}
                    <li className="flex gap-2 border-t border-monk-border/40 pt-2">
                      <Info size={13} className="mt-0.5 shrink-0 text-monk-warning" />
                      <a
                        href={GOOGLE_IMPORT_EXPORT}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-monk-accent hover:underline"
                      >
                        {t("calendarExport.openImport")}
                      </a>
                    </li>
                  </ol>
                ) : null}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
