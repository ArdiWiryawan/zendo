import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalmDialog,
  Card,
  GhostButton,
  PageHeader,
  Textarea,
  useCalmToast,
} from "../components/ui";
import { playZenBell } from "../lib/audio";
import {
  Bell,
  Calendar,
  Check,
  Cloud,
  Crown,
  Download,
  FileJson,
  FileText,
  Globe,
  HardDrive,
  Heart,
  Moon,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Palette,
  Settings,
} from "lucide-react";
import { ZendoProModal } from "../components/ZendoProModal";
import { routes } from "../constants/routes";
import { getDaysPassed } from "../lib/date";
import { exportStateAsJson } from "../lib/storage";
import { supabase as getSupabase } from "../lib/supabase";
import { useSyncStatus, type SyncStatus } from "../lib/syncStatus";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import {
  getDailyJournalPromptForDate,
  getJournalAnswerItems,
  getJournalQuestionLabels,
} from "../i18n/prompts";
import type { AppLanguage, AppTheme, MonkMVPState } from "../types/app";

function syncLabel(status: SyncStatus, tUI: (k: any) => string, localOnly: boolean) {
  if (localOnly) return tUI("sync.localOnly");
  if (status === "syncing") return tUI("sync.syncing");
  if (status === "offline") return tUI("sync.offline");
  if (status === "error") return tUI("sync.error");
  if (status === "synced") return tUI("sync.synced");
  return tUI("sync.idle");
}

function syncDotColor(status: SyncStatus, localOnly: boolean) {
  if (localOnly) return "bg-monk-muted";
  if (status === "synced") return "bg-monk-success";
  if (status === "syncing") return "bg-blue-400 animate-pulse";
  if (status === "error") return "bg-monk-danger";
  if (status === "offline") return "bg-monk-warning";
  return "bg-monk-muted";
}

const sectionReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as any } },
};

// Mirrors the "Last updated" + "Version" lines inside public/terms.html,
// public/privacy.html and their /id/ counterparts. Bump both here and in those
// four pages in the same commit — src/screens/settingsLegal.test.tsx pins them
// so they cannot drift apart.
const LEGAL_VERSION = "1.0";
const LEGAL_UPDATED = "2026-10-04";

/** Static pages ship per language, so the link points at the reader's own copy. */
function legalHref(lang: AppLanguage, doc: "terms" | "privacy") {
  return lang === "id" ? `/id/${doc}.html` : `/${doc}.html`;
}

export default function SettingsScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const toast = useCalmToast();
  const [exported, setExported] = useState("");
  const [confirmKind, setConfirmKind] = useState<null | "import" | "wipe">(null);
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<{ email?: string } | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);
  const syncStatus = useSyncStatus();
  const tUI = useT();

  const displayedReminders = useMemo(() => {
    const map = new Map<string, typeof store.notificationReminders[0]>();
    (store.notificationReminders || []).forEach((r) => {
      if (r.type && !map.has(r.type)) {
        map.set(r.type, r);
      }
    });
    return Array.from(map.values());
  }, [store.notificationReminders]);

  const handleTestReminder = () => {
    playZenBell();
    toast.show(tUI("reminder.testFired") || "Pengingat Berfungsi: Waktunya kembali fokus!");
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Zendo Monk Focus", {
          body: "Pengingat aktif — Waktunya kembali ke fokus utama hari ini.",
          icon: "/icon-192.png"
        });
      } catch {
        /* ignore */
      }
    }
  };
  // No session (or Supabase not configured) — nothing to sync, don't claim "Synced".
  const localOnly = !session;
  const lang = (store.appSettings.language ?? "id") as AppLanguage;
  const labels = getJournalQuestionLabels(lang);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proUnlocked = params.get("pro_unlocked");
    if (proUnlocked) {
      store.unlockPro(proUnlocked === "pro_season" ? "season" : "lifetime");
      playZenBell();
      toast.show(lang === "id" ? "Selamat! Zendo Pro berhasil diaktifkan." : "Zendo Pro successfully unlocked!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get("pro") === "open") {
      setProModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [lang]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb?.auth) return;
    sb.auth.getSession().then(({ data }: any) => {
      if (data?.session) setSession({ email: data.session.user?.email });
      else setSession(null);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event: any, s: any) => {
      if (s?.user) {
        setSession({ email: s.user.email });
      } else {
        setSession(null);
      }
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const sb = getSupabase();
    if (!sb?.auth) return;
    await sb.auth.signOut();
    setSession(null);
  };



  const applyImport = (data: Record<string, unknown>) => {
    store.importState(data as Partial<MonkMVPState>);
    setExported(tUI("settings.importSuccess"));
  };

  const downloadReminderIcs = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zendo//Daily Reflection Reminder//EN",
      "BEGIN:VEVENT",
      "UID:zendo-daily-reflection-reminder@zendo.app",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
      "DTSTART;TZID=Asia/Jakarta:" + new Date().getFullYear() + "0101T210000",
      "RRULE:FREQ=DAILY",
      "SUMMARY:Zendo: Time to Reflect",
      "DESCRIPTION:Open Zendo to log your daily focus reflection.",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zendo_daily_reminder.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadBackup = () => {
    const json = exportStateAsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zendo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadSeasonLogMd = () => {
    const season = store.activeSeason;
    if (!season) return;
    const daysPassed = getDaysPassed(season.startDate);
    // Scope each log to this season — otherwise old-season entries leak into
    // the "Season Log" export.
    const journal = store.journalEntries.filter(j => j.seasonId === season.id);
    const learning = store.learningSessions.filter(l => l.seasonId === season.id);
    const relapses = store.relapseLogs.filter(r => r.seasonId === season.id);
    const lines = [
      `# Season Log: ${season.name}`,
      `Started: ${season.startDate} (${daysPassed} days)`,
      "",
      "## Goals",
      ...store.goals.filter(g => g.seasonId === season.id && g.status !== "released").map(g => `- **${g.title}** (Priority ${g.priority}): ${g.status}`),
      "",
      "## Journal",
      ...journal.map(j => {
        const items = getJournalAnswerItems(lang, j.answers, j.createdAt.slice(0, 10));
        return [
          `### ${j.createdAt.slice(0, 10)}`,
          ...items.map(item => `- **${item.question}**: ${item.answer}`)
        ].join("\n");
      }),
      "",
      "## Learning Log",
      ...learning.map(l => `- **${(l.startedAt || l.createdAt || l.endedAt || "").slice(0,10)}** (${l.sourceType}): ${l.sourceTitle || l.lesson?.slice(0, 60) || "-"} - Insight: ${l.lesson || "-"}`),
      "",
      "## Relapse & Drift Logs",
      ...relapses.map(r => `- **${r.createdAt.slice(0,10)}** (Trigger: ${r.trigger}): ${r.note} - Recovery: ${r.recoveryAction || "-"}`)
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zendo_season_log_${season.startDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title={tUI("settings.title")} subtitle={tUI("settings.subtitle")} />
      <div className="space-y-6 pb-8">

        {/* Support & Donasi Zendo Card */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <Card className="relative overflow-hidden border border-monk-warning/25 bg-gradient-to-b from-monk-surface via-monk-surface to-monk-accent-soft/20 p-5 sm:p-6 shadow-calm space-y-4">
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-monk-warning/10 blur-3xl pointer-events-none" />

            {/* Top Row: Icon + Title + Free Badge */}
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-monk-warning/20 to-monk-warning/30 border border-monk-warning/40 text-monk-warning shadow-xs">
                <Heart size={20} className="fill-monk-warning/20 text-monk-warning" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-monk-text tracking-tight">
                    {lang === "id" ? "Dukung Zendo" : "Support Zendo"}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-monk-success/15 border border-monk-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-monk-success font-mono">
                    <Check size={11} strokeWidth={3} aria-hidden="true" />
                    <span>{lang === "id" ? "100% Gratis & Bebas Iklan" : "100% Free & Ad-Free"}</span>
                  </span>
                </div>
                <p className="text-xs text-monk-muted leading-relaxed">
                  {lang === "id"
                    ? "Seluruh soundscape, tema zen, protokol refleksi, dan cloud sync terbuka gratis untuk Anda. Jika Zendo membantu fokus Anda, dukung kelanjutan pengembangannya melalui donasi QRIS seikhlasnya."
                    : "All soundscapes, zen themes, reflection protocols, and cloud sync are completely free. If Zendo helps your focus, you can support ongoing development with a voluntary QRIS tip."}
                </p>
              </div>
            </div>

            {/* CTA Button: Prominent & Clean */}
            <button
              type="button"
              onClick={() => setProModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-monk-accent px-4 py-3 text-xs sm:text-sm font-bold text-monk-bg shadow-md transition active:scale-[0.98] hover:opacity-95 hover:shadow-lg border border-monk-warning/30"
            >
              <Sparkles size={15} className="text-monk-warning" />
              <span>{lang === "id" ? "Donasi / Traktir Kopi via QRIS" : "Tip / Donate via QRIS"}</span>
            </button>

            {/* 4 Unlocked Pillars Matrix: Sleek Zen Micro-Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-monk-border/40 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-monk-soft/50 border border-monk-border/40">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-md bg-monk-success/15 text-monk-success"><Check size={11} strokeWidth={3} aria-hidden="true" /></span>
                <span className="text-[11px] font-semibold text-monk-text truncate">{lang === "id" ? "10 Zen Soundscapes" : "10 Zen Soundscapes"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-monk-soft/50 border border-monk-border/40">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-md bg-monk-success/15 text-monk-success"><Check size={11} strokeWidth={3} aria-hidden="true" /></span>
                <span className="text-[11px] font-semibold text-monk-text truncate">{lang === "id" ? "Semua 6+ Protokol" : "All 6+ Protocols"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-monk-soft/50 border border-monk-border/40">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-md bg-monk-success/15 text-monk-success"><Check size={11} strokeWidth={3} aria-hidden="true" /></span>
                <span className="text-[11px] font-semibold text-monk-text truncate">{lang === "id" ? "6 Palet Zen & Media" : "6 Zen Themes & Media"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-monk-soft/50 border border-monk-border/40">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-md bg-monk-success/15 text-monk-success"><Check size={11} strokeWidth={3} aria-hidden="true" /></span>
                <span className="text-[11px] font-semibold text-monk-text truncate">{lang === "id" ? "Cloud Sync Multi-Device" : "Multi-Device Sync"}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={Globe} label={tUI("settings.prefs")} />
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
            {/* Zen Theme Aesthetic Picker */}
            <div className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-monk-accent" />
                  <p className="text-sm font-semibold text-monk-text">
                    {lang === "id" ? "Palet Zen Aesthetic" : "Zen Aesthetic Themes"}
                  </p>
                </div>
                <span className="text-[10px] text-monk-success font-semibold flex items-center gap-1">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                  <span>{lang === "id" ? "Semua 6 Palet Terbuka" : "All 6 Palettes Unlocked"}</span>
                </span>
              </div>
              <p className="text-xs text-monk-muted mb-3 leading-relaxed">
                {lang === "id"
                  ? "Pilih palet warna nuansa hening dan fokus monk mode yang menenangkan mata."
                  : "Choose mindful color palettes engineered for deep calm and focus."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "dark", name: "Dark Monk", hex: "#080908", accent: "#A48B5E" },
                  { id: "sumi_ink", name: "Sumi Slate", hex: "#0D1117", accent: "#7D9BB2" },
                  { id: "kyoto_moss", name: "Kyoto Moss", hex: "#090D0A", accent: "#6E9B7B" },
                  { id: "wabi_sabi", name: "Wabi-Sabi", hex: "#14110E", accent: "#C29B68" },
                  { id: "kurogane", name: "Kurogane", hex: "#000000", accent: "#B0B0B0" },
                  { id: "temple_gold", name: "Temple Gold", hex: "#0C0A06", accent: "#D4AF37" },
                ].map((tItem) => {
                  const active = (store.appSettings.theme || "dark") === tItem.id;
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => store.updateSettings({ theme: tItem.id as AppTheme })}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-95 ${
                        active
                          ? "border-monk-accent bg-monk-accent-soft text-monk-accent font-bold ring-1 ring-monk-accent/30 shadow-xs"
                          : "border-monk-border/60 bg-monk-soft/40 text-monk-text hover:border-monk-border-strong hover:bg-monk-soft"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 border border-white/20 shadow-xs"
                          style={{ backgroundColor: tItem.accent }}
                        />
                        <span className="text-xs truncate">{tItem.name}</span>
                      </div>
                      {active && (
                        <Check size={13} strokeWidth={3} className="text-monk-accent" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <SettingsRow icon={Globe} title={tUI("settings.language")} description={tUI("settings.languageDesc")}>
              <div className="flex rounded-full bg-monk-soft p-0.5 border border-monk-border/40 shrink-0">
                {(["id", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => store.updateSettings({ language: code })}
                    className={`min-w-10 min-h-8 px-2 rounded-full text-xs font-semibold transition ${
                      lang === code
                        ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm"
                        : "text-monk-muted hover:text-monk-text"
                    }`}
                    aria-pressed={lang === code}
                    aria-label={code === "id" ? tUI("settings.lang.id") : tUI("settings.lang.en")}
                  >
                    {code === "id" ? tUI("settings.lang.id") : tUI("settings.lang.en")}
                  </button>
                ))}
              </div>
            </SettingsRow>
            <SettingsRow icon={Bell} title={tUI("settings.notifications")} description={tUI("settings.notificationsDesc")}>
              <MonkToggle
                checked={store.appSettings.notificationEnabled}
                aria-label={tUI("settings.notifications")}
                onToggle={async () => {
                  if ("Notification" in window && Notification.permission !== "granted") {
                    await Notification.requestPermission();
                  }
                  store.updateSettings({ notificationEnabled: !store.appSettings.notificationEnabled });
                }}
              />
            </SettingsRow>
            <div className="px-3 py-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-monk-text">{tUI("settings.reminders")}</p>
                <div className="flex items-center gap-1.5">
                  <GhostButton
                    onClick={handleTestReminder}
                    aria-label="Uji Pengingat"
                    className="!min-h-7 !px-2.5 text-xs font-semibold text-monk-accent hover:bg-monk-accent/10"
                  >
                    <Bell className="w-3.5 h-3.5 mr-1" />
                    Uji
                  </GhostButton>
                  <GhostButton onClick={store.resetReminders} aria-label={tUI("settings.remindersResetAria")} className="!min-h-7 !px-2.5 text-xs">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    {tUI("settings.remindersReset")}
                  </GhostButton>
                </div>
              </div>
              <p className="mb-2 text-xs text-monk-muted/70 leading-4">{tUI("settings.remindersDesc")}</p>
              <div className="divide-y divide-monk-border/30 rounded-monk border border-monk-border/40">
                {displayedReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-monk-text">{tUI(`reminder.${reminder.type}`)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="time"
                          value={reminder.time ?? ""}
                          onChange={(e) => store.updateReminder(reminder.id, { time: e.target.value })}
                          disabled={!reminder.enabled}
                          aria-label={tUI(`reminder.${reminder.type}`)}
                          className="min-h-7 rounded-monk border border-monk-border/40 bg-monk-soft px-2 py-1 text-xs text-monk-text outline-none transition focus:border-monk-accent disabled:opacity-40"
                        />
                        {reminder.type === "season_countdown" ? (
                          <span className="text-[10px] text-monk-muted">{tUI("reminder.season_countdownPrefix")} {reminder.daysBeforeSeasonEnd ?? 3} {tUI("reminder.season_countdownSuffix")}</span>
                        ) : null}
                      </div>
                    </div>
                    <MonkToggle
                      checked={reminder.enabled}
                      aria-label={tUI(`reminder.${reminder.type}`)}
                      onToggle={() => store.updateReminder(reminder.id, { enabled: !reminder.enabled })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <SettingsRow icon={Moon} title={tUI("settings.detox")} description={tUI("settings.detoxDesc")}>
              <MonkToggle
                checked={store.appSettings.greyModeGuideCompleted}
                aria-label={tUI("settings.detox")}
                onToggle={() => store.updateSettings({ greyModeGuideCompleted: !store.appSettings.greyModeGuideCompleted })}
              />
            </SettingsRow>
          </Card>
        </motion.div>

        {/* Data & Export */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={HardDrive} label={tUI("settings.data")} />
          <div className="space-y-4">

            {/* Quick Exports */}
            <Card className="divide-y divide-monk-border/30 overflow-hidden p-0">
              <SettingsRow icon={Calendar} title={tUI("settings.calendar")} description={tUI("settings.calendarDesc")}>
                <GhostButton onClick={downloadReminderIcs} aria-label={tUI("settings.downloadIcsAria")} className="shrink-0 !px-2 !min-h-10">
                  <Download className="w-4 h-4" />
                </GhostButton>
              </SettingsRow>
              <SettingsRow icon={FileText} title={tUI("settings.seasonLog")} description={tUI("settings.seasonLogDesc")}>
                <GhostButton onClick={downloadSeasonLogMd} aria-label={tUI("settings.downloadMdAria")} className="shrink-0 !px-2 !min-h-10">
                  <Download className="w-4 h-4" />
                </GhostButton>
              </SettingsRow>
              <SettingsRow icon={HardDrive} title={tUI("settings.backup")} description={tUI("settings.backupDesc")}>
                <GhostButton onClick={downloadBackup} aria-label={tUI("settings.downloadBackup")} className="shrink-0 !px-2 !min-h-10">
                  <Download className="w-4 h-4" />
                </GhostButton>
              </SettingsRow>
            </Card>

            {/* Full Data Export/Import */}
            <Card className="group hover:border-monk-accent/50 transition-all" important>
              <div className="flex items-center gap-2 p-3">
                <div className="grid h-5 w-5 shrink-0 place-items-center rounded bg-monk-accent/10 border border-monk-accent/20">
                  <FileJson size={11} strokeWidth={1.5} className="text-monk-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-monk-text">{tUI("settings.dataJson")}</h4>
                  <p className="text-xs text-monk-muted mt-0.5">{tUI("settings.dataJsonDesc")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <GhostButton
                    onClick={() => setExported(JSON.stringify({
                      userProfile: store.userProfile,
                      activeSeason: store.activeSeason,
                      goals: store.goals,
                      journalEntries: store.journalEntries,
                      dayPlans: store.dayPlans,
                      weeklyPlans: store.weeklyPlans,
                      focusSessions: store.focusSessions,
                      learningSessions: store.learningSessions,
                      relapseLogs: store.relapseLogs,
                      energyLogs: store.energyLogs,
                      timelineEvents: store.timelineEvents,
                      appSettings: store.appSettings,
                    }, null, 2))}
                    aria-label={tUI("settings.exportJsonAria")}
                    className="shrink-0 !px-2 !min-h-10"
                  >
                    <Download className="w-4 h-4" />
                  </GhostButton>
                  <label className="cursor-pointer">
                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          if (data.userProfile || data.activeSeason || data.goals) {
                            setPendingImport(data);
                            setConfirmKind("import");
                          } else {
                            alert(tUI("settings.invalidBackup"));
                          }
                        } catch { alert(tUI("settings.parseFailed")); }
                      };
                      reader.readAsText(file);
                    }} />
                    <span className="inline-flex items-center justify-center min-h-10 min-w-10 text-monk-muted border border-monk-border rounded-full hover:border-monk-accent hover:text-monk-accent transition active:scale-95" aria-label={tUI("settings.importJsonAria")}>
                      <Upload className="w-4 h-4" />
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          </div>
          {exported ? <Textarea readOnly value={exported} className="font-mono text-xs mt-3" /> : null}
        </motion.div>

        {/* Account & Sync */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={Cloud} label={tUI("settings.account")} />
          <Card className="group hover:border-monk-accent/50 transition-all" important>
            <div className="flex items-center gap-2">
              <div className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                session?.email
                  ? "bg-monk-accent/10 border-monk-accent/20"
                  : "bg-monk-soft border-monk-border group-hover:border-monk-accent/30"
              }`}>
                <Cloud size={11} strokeWidth={1.5} className="text-monk-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-monk-text">{tUI("settings.sync")}</h4>
                <p className="text-xs text-monk-muted/70 mt-0.5">
                  {localOnly ? tUI("sync.localOnlyDesc") : tUI("settings.syncDesc")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`h-2 w-2 rounded-full ${syncDotColor(syncStatus, localOnly)}`} />
                <span className="text-[10px] font-medium text-monk-muted">{syncLabel(syncStatus, tUI, localOnly)}</span>
              </div>
            </div>

            {session?.email ? (
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-monk-border/30">
                <p className="text-xs font-medium text-monk-text truncate">{session.email}</p>
                <GhostButton onClick={handleLogout} className="text-xs !min-h-8 !px-3">
                  {tUI("settings.logout")}
                </GhostButton>
              </div>
            ) : (
              <div className="mt-3 pt-2 border-t border-monk-border/30">
                <GhostButton onClick={() => navigate(routes.login)} className="text-xs !min-h-8 !px-3 w-full justify-center">
                  {tUI("settings.connectAccount")}
                </GhostButton>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Season */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={Calendar} label={tUI("settings.season")} />
          <Card className="p-0 overflow-hidden">
            <SettingsRow icon={Calendar} title={tUI("settings.archiveSeason")} description={tUI("settings.archiveSeasonDesc")}>
              <GhostButton onClick={store.archiveSeason}>{tUI("settings.archive")}</GhostButton>
            </SettingsRow>
            <SettingsRow icon={Calendar} title={tUI("seasons.settingsRow")} description={tUI("seasons.settingsRowDesc")}>
              <GhostButton onClick={() => navigate(routes.seasons)}>{tUI("seasons.open")}</GhostButton>
            </SettingsRow>
          </Card>
        </motion.div>



        {/* Legal & Privacy — static pages, so a plain anchor (no router hop, no
            bundle cost). lang is carried across so the opened page matches the UI. */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={Scale} label={tUI("settings.legal")} />
          <Card className="p-0 overflow-hidden">
            <SettingsRow icon={FileText} title={tUI("settings.legalTerms")} description={tUI("settings.legalTermsDesc")}>
              <a
                href={legalHref(lang, "terms")}
                target="_blank"
                rel="noopener"
                aria-label={tUI("settings.legalTermsAria")}
                className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-monk-border px-3 text-xs font-semibold text-monk-accent transition active:scale-95 hover:border-monk-accent/50 hover:bg-monk-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent"
              >
                {tUI("settings.legalOpen")}
              </a>
            </SettingsRow>
            <SettingsRow icon={ShieldCheck} title={tUI("settings.legalPrivacy")} description={tUI("settings.legalPrivacyDesc")}>
              <a
                href={legalHref(lang, "privacy")}
                target="_blank"
                rel="noopener"
                aria-label={tUI("settings.legalPrivacyAria")}
                className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-monk-border px-3 text-xs font-semibold text-monk-accent transition active:scale-95 hover:border-monk-accent/50 hover:bg-monk-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent"
              >
                {tUI("settings.legalOpen")}
              </a>
            </SettingsRow>
            <p className="px-3 pb-2.5 text-[10px] text-monk-muted/50">
              {tUI("settings.legalVersion", { version: LEGAL_VERSION, date: LEGAL_UPDATED })}
            </p>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={ShieldAlert} label={tUI("settings.danger")} danger />
          <Card className="border-monk-danger/20 p-0 overflow-hidden">
            <SettingsRow icon={Trash2} title={tUI("settings.reset")} description={tUI("settings.resetDesc")} danger>
              <button
                type="button"
                className="shrink-0 text-xs font-bold text-monk-danger border border-monk-danger/30 hover:border-monk-danger bg-monk-danger/10 px-3 py-1.5 rounded-full transition active:scale-95"
                onClick={() => setConfirmKind("wipe")}
              >
                {tUI("settings.wipe")}
              </button>
            </SettingsRow>
          </Card>
        </motion.div>

        {/* About */}
        <p className="text-center text-xs text-monk-muted/50 pb-2">{tUI("settings.about")}</p>
      </div>

      <CalmDialog
        open={confirmKind === "import"}
        title={tUI("settings.importConfirmTitle")}
        description={tUI("settings.importConfirm")}
        confirmLabel={tUI("dialog.confirm")}
        cancelLabel={tUI("dialog.cancel")}
        onCancel={() => {
          setConfirmKind(null);
          setPendingImport(null);
        }}
        onConfirm={() => {
          if (pendingImport) applyImport(pendingImport);
          setConfirmKind(null);
          setPendingImport(null);
        }}
      />
      <CalmDialog
        open={confirmKind === "wipe"}
        title={tUI("settings.wipeConfirmTitle")}
        description={tUI("settings.wipeConfirm")}
        confirmLabel={tUI("settings.wipe")}
        cancelLabel={tUI("dialog.cancel")}
        danger
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
      />
      <ZendoProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
    </>
  );
}

/* ─── Redesigned Sub-components ─── */

function SectionHeader({ icon: Icon, label, danger }: { icon: React.ComponentType<any>; label: string; danger?: boolean }) {
  const bg = danger ? "bg-monk-danger/10" : "bg-monk-accent/10";
  const border = danger ? "border border-monk-danger/20" : "border border-monk-accent/15";
  const iconColor = danger ? "text-monk-danger" : "text-monk-accent";
  const textColor = danger ? "text-monk-danger/70" : "text-monk-muted";
  return (
    <div className="flex items-center gap-2.5 mb-3 px-1">
      <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${bg} ${border}`}>
        <Icon size={12} strokeWidth={2} className={iconColor} />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}

function MonkToggle({ checked, "aria-label": ariaLabel, onToggle }: { checked: boolean; "aria-label": string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-[44px] shrink-0 items-center rounded-full transition-colors duration-200 active:scale-[0.97] ${
        checked ? "bg-monk-accent" : "bg-monk-border-strong"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-monk-text shadow-sm transition-transform duration-200 ${
        checked ? "translate-x-[22px]" : "translate-x-[3px]"
      }`} />
    </button>
  );
}

function SettingsRow({ icon: Icon, title, description, children, danger }: { icon?: React.ComponentType<any>; title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  const iconBg = danger ? "bg-monk-danger/12" : "bg-monk-accent/12";
  const iconColor = danger ? "text-monk-danger/80" : "text-monk-accent/80";
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {Icon ? (
          <div className={`grid h-5 w-5 shrink-0 place-items-center rounded ${iconBg}`}>
            <Icon size={11} strokeWidth={1.5} className={iconColor} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-monk-text">{title}</p>
          {description ? <p className="text-xs text-monk-muted/70 mt-0.5 leading-4">{description}</p> : null}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
