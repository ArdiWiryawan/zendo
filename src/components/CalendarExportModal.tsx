import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Check, Download, Info, Layers, X } from "lucide-react";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n";
import type { TimeBlock } from "../types/app";
import {
  activityCategoryHex,
  activityCategoryMeta,
  type ActivityCategory
} from "../lib/activityCategory";
import {
  downloadIcsFile,
  downloadIcsFilesByCategory,
  groupTimeBlocksByCategory
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

/**
 * Calendar export surface.
 *
 * Google Calendar assigns color per *calendar* and ignores an event's `COLOR`
 * on ICS import — that is why a single export always arrives blue. The honest
 * fix is not a cleverer file, it is splitting the day into one calendar per
 * activity category, which is what the primary action here does. The single-file
 * export stays available for Apple Calendar and anything that does read
 * per-event colors.
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

  useModalA11y({ open, ref: cardRef, onClose });

  const groups = useMemo(() => groupTimeBlocksByCategory(timeBlocks), [timeBlocks]);

  const labels = useMemo(() => {
    const map: Partial<Record<ActivityCategory, string>> = {};
    for (const group of groups) {
      map[group.category] = t(activityCategoryMeta(group.category).labelKey as MessageKey);
    }
    return map;
  }, [groups, t]);

  if (!open) return null;

  const handleExportPerCategory = () => {
    hapticPress("medium");
    const count = downloadIcsFilesByCategory(date, timeBlocks, seasonTitle, labels);
    toast.show(t("calendarExport.downloadedMulti", { n: count }));
    setShowSteps(true);
  };

  const handleExportSingle = () => {
    hapticPress("medium");
    downloadIcsFile(date, timeBlocks, seasonTitle);
    toast.show(t("planning.downloadedIcs"));
    onClose();
  };

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
              <div className="flex gap-2 rounded-2xl border border-monk-warning/30 bg-monk-warning/10 p-3 text-[12px] leading-relaxed text-monk-text-soft">
                <Info size={14} className="mt-0.5 shrink-0 text-monk-warning" />
                <p>{t("calendarExport.googleLimit")}</p>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-monk-muted">
                  {t("calendarExport.legendTitle")}
                </p>
                <ul className="space-y-1.5">
                  {groups.map((group) => {
                    const label = labels[group.category] ?? group.category;
                    return (
                      <li
                        key={group.category}
                        className="flex items-center gap-2.5 rounded-xl border border-monk-border/50 bg-monk-soft/20 px-3 py-2"
                      >
                        <span
                          aria-hidden
                          className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: activityCategoryHex(group.category) }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-monk-text">
                          {label}
                        </span>
                        <span className="font-mono text-[10px] uppercase text-monk-muted">
                          {activityCategoryHex(group.category)}
                        </span>
                        <span className="rounded-full bg-monk-surface px-2 py-0.5 text-[10px] font-semibold text-monk-muted">
                          {group.blocks.length}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-2">
                <PrimaryButton type="button" onClick={handleExportPerCategory} className="w-full">
                  <Layers size={15} />
                  {t("calendarExport.downloadMulti", { n: groups.length })}
                </PrimaryButton>
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
                    <li className="flex gap-2">
                      <Check size={13} className="mt-0.5 shrink-0 text-monk-success" />
                      {t("calendarExport.step1")}
                    </li>
                    <li className="flex gap-2">
                      <Check size={13} className="mt-0.5 shrink-0 text-monk-success" />
                      {t("calendarExport.step2")}
                    </li>
                    <li className="flex gap-2">
                      <Check size={13} className="mt-0.5 shrink-0 text-monk-success" />
                      {t("calendarExport.step3")}
                    </li>
                    <li className="flex gap-2">
                      <Check size={13} className="mt-0.5 shrink-0 text-monk-success" />
                      {t("calendarExport.step4")}
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
