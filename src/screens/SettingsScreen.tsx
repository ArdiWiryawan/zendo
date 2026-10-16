import { useEffect, useMemo, useState } from "react";
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
  ChevronRight,
  Clock,
  Cloud,
  Compass,
  Download,
  FileJson,
  FileText,
  Globe,
  HardDrive,
  Heart,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { ZendoProModal } from "../components/ZendoProModal";
import { routes } from "../constants/routes";
import { getDaysPassed } from "../lib/date";
import { exportStateAsJson } from "../lib/storage";
import {
  buildLauncherSnapshot,
  launcherSnapshotFileName,
  serializeLauncherSnapshot,
} from "../lib/launcherBridge";
import { supabase as getSupabase } from "../lib/supabase";
import { useSyncStatus, type SyncStatus } from "../lib/syncStatus";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { getJournalAnswerItems } from "../i18n/prompts";
import type { AppLanguage, AppTheme, MonkMVPState } from "../types/app";

function syncLabel(status: SyncStatus, tUI: (k: any) => string, localOnly: boolean) {
  if (localOnly) return tUI("settings.syncNotActive");
  if (status === "syncing") return tUI("sync.syncing");
  if (status === "offline") return tUI("sync.offline");
  if (status === "error") return tUI("sync.error");
  if (status === "synced") return tUI("settings.syncActive");
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

const groupReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as any } },
};

// The six aesthetic palettes, in the order the design system lists them.
// `accent` is the palette's own accent token, shown as the swatch so the choice
// reads before the label does.
const PALETTES: { id: AppTheme; name: string; accent: string }[] = [
  { id: "dark", name: "Dark Monk", accent: "#A48B5E" },
  { id: "sumi_ink", name: "Sumi Slate", accent: "#7D9BB2" },
  { id: "kyoto_moss", name: "Kyoto Moss", accent: "#6E9B7B" },
  { id: "wabi_sabi", name: "Wabi-Sabi", accent: "#C29B68" },
  { id: "kurogane", name: "Kurogane", accent: "#B0B0B0" },
  { id: "temple_gold", name: "Temple Gold", accent: "#D4AF37" },
];

/** Reminders are the longest block on the page, so the whole schedule sits
 *  behind one summary row rather than four to five rows always in view. */

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

/** Row action: a quiet text button, 44px tall. */
const rowActionClass =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-monk-accent transition active:scale-95 hover:bg-monk-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg";

/** Row action: icon only, still a 44x44 target. */
const rowIconClass =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-monk-muted transition active:scale-90 hover:bg-monk-soft hover:text-monk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg";

/** The time reads as a value, not a boxed control — but stays tappable. */
const timeInputClass =
  "-my-2.5 min-h-11 cursor-pointer appearance-none border-0 bg-transparent p-0 text-xs tabular-nums text-monk-muted outline-none transition hover:text-monk-text focus:text-monk-text disabled:cursor-default disabled:opacity-40 [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:hover:opacity-90";

export default function SettingsScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const toast = useCalmToast();
  const [exported, setExported] = useState("");
  const [confirmKind, setConfirmKind] = useState<null | "import" | "wipe">(null);
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<{ email?: string } | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
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

  const activeReminderCount = displayedReminders.filter((r) => r.enabled).length;

  const handleTestReminder = () => {
    playZenBell();
    toast.show(tUI("reminder.testFired") || "Pengingat Berfungsi: Waktunya kembali fokus!");
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Zendo Monk Focus", {
          body: "Pengingat aktif — Waktunya kembali ke fokus utama hari ini.",
          icon: "/icons/icon-192.png"
        });
      } catch {
        /* ignore */
      }
    }
  };
  // No session (or Supabase not configured) — nothing to sync, don't claim "Synced".
  const localOnly = !session;
  const lang = (store.appSettings.language ?? "id") as AppLanguage;

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
    // Toast, not the JSON panel: the panel is the *export* surface, and mixing
    // an import receipt into it made the two actions read as one.
    toast.show(tUI("settings.importSuccess"));
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

  // One-way, by hand: a small snapshot in the exact shape Zendo Launcher reads
  // with its system file picker. Not a sync and not a connection.
  const downloadLauncherSnapshot = () => {
    const snapshot = buildLauncherSnapshot({
      dayPlans: store.dayPlans,
      dayPlanDeletedAt: store.dayPlanDeletedAt,
      goals: store.goals,
    });
    const blob = new Blob([serializeLauncherSnapshot(snapshot)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = launcherSnapshotFileName(snapshot.localDate);
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
        const items = getJournalAnswerItems(lang, j.answers, j.createdAt.slice(0, 10), j.promptText);
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

  const showJson = () => {
    setExported(JSON.stringify({
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
    }, null, 2));
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.userProfile || data.activeSeason || data.goals) {
          setPendingImport(data);
          setConfirmKind("import");
        } else {
          toast.show(tUI("settings.invalidBackup"));
        }
      } catch { toast.show(tUI("settings.parseFailed")); }
    };
    reader.readAsText(file);
  };

  const reminderRow = (reminder: (typeof displayedReminders)[0]) => (
    <SettingsRow
      key={reminder.id}
      title={tUI(`reminder.${reminder.type}`)}
      description={
        <span className="flex items-center gap-2">
          <input
            type="time"
            value={reminder.time ?? ""}
            onChange={(e) => store.updateReminder(reminder.id, { time: e.target.value })}
            disabled={!reminder.enabled}
            aria-label={tUI(`reminder.${reminder.type}`)}
            className={timeInputClass}
          />
          {reminder.type === "season_countdown" ? (
            <span className="text-[10px] text-monk-muted">
              {tUI("reminder.season_countdownPrefix")} {reminder.daysBeforeSeasonEnd ?? 3} {tUI("reminder.season_countdownSuffix")}
            </span>
          ) : null}
        </span>
      }
    >
      <MonkToggle
        checked={reminder.enabled}
        aria-label={tUI(`reminder.${reminder.type}`)}
        onToggle={() => store.updateReminder(reminder.id, { enabled: !reminder.enabled })}
      />
    </SettingsRow>
  );

  // App.tsx renders any theme outside the palette list as the dark palette, so
  // resolve it the same way here. Without this, a legacy `theme: "light"` (or
  // "system") left the row with no name and no selected swatch.
  const themeId: AppTheme = PALETTES.some((p) => p.id === store.appSettings.theme)
    ? (store.appSettings.theme as AppTheme)
    : "dark";
  const activePalette = PALETTES.find((p) => p.id === themeId) ?? PALETTES[0];

  return (
    <>
      <PageHeader title={tUI("settings.title")} subtitle={tUI("settings.subtitle")} />
      <div className="space-y-6 pb-8">

        {/* ─── Appearance ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <GroupLabel label={tUI("settings.group.appearance")} />
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
            {/* Swatches stay inline: picking a theme is a live preview, so hiding
                it behind a hop would hide the page you are recolouring. */}
            <SettingsRow icon={Palette} title={tUI("settings.palette")} description={activePalette?.name} wrapControl>
              <div
                className="flex flex-wrap items-center justify-end gap-0.5"
                role="radiogroup"
                aria-label={tUI("settings.palette")}
              >
                {PALETTES.map((item) => {
                  const active = themeId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={item.name}
                      title={item.name}
                      onClick={() => store.updateSettings({ theme: item.id })}
                      /* 28px wide (the dots sit 2px apart, so a wider target
                         would overlap its neighbour) but 44px tall — the row
                         has empty space above and below the swatch, and
                         `-my-2` cancels the extra height so the row does not
                         grow. Comfortably over the WCAG 2.2 24px minimum. */
                      className="-my-2 grid min-h-11 w-7 shrink-0 place-items-center rounded-full transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent focus-visible:ring-offset-2 focus-visible:ring-offset-monk-surface"
                    >
                      <span
                        className={`h-4 w-4 rounded-full border transition ${
                          active
                            ? "border-monk-accent ring-2 ring-monk-accent ring-offset-2 ring-offset-monk-surface"
                            : "border-white/20"
                        }`}
                        style={{ backgroundColor: item.accent }}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </SettingsRow>

            {/* No `value` here: the segmented control already shows the current
                language, so a readout beside it would say the same thing twice. */}
            <SettingsRow icon={Globe} title={tUI("settings.language")} description={tUI("settings.languageDesc")}>
              <div className="flex rounded-full border border-monk-border/40 bg-monk-soft p-0.5">
                {(["id", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => store.updateSettings({ language: code })}
                    /* 44px target (WCAG 2.2 SC 2.5.8 / 44px rec); -my-2.5 keeps
                       the settings row's height stable. */
                    className={`-my-2.5 min-h-11 min-w-11 rounded-full px-3 text-xs font-semibold transition ${
                      lang === code
                        ? "border border-monk-border-strong bg-monk-surface text-monk-text"
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
          </Card>
        </motion.section>

        {/* ─── Reminders ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <GroupLabel label={tUI("settings.group.reminders")} />
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
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

            {/* One summary row replaces four to five always-visible rows. The
                count is the whole reason it can be collapsed: it says how much
                is running without listing any of it — but only when the master
                switch is on. With notifications off nothing fires, so claiming
                "5 active" would be a lie. */}
            <SettingsRow
              icon={Clock}
              title={tUI("settings.remindersSchedule")}
              value={
                store.appSettings.notificationEnabled
                  ? tUI("settings.remindersActive", { n: activeReminderCount })
                  : tUI("settings.remindersOff")
              }
              onPress={() => setScheduleOpen((v) => !v)}
              ariaLabel={tUI("settings.remindersSchedule")}
              expanded={scheduleOpen}
              controls="settings-reminder-schedule"
            >
              <ChevronRight
                size={16}
                className={`text-monk-muted/50 transition-transform ${scheduleOpen ? "rotate-90" : ""}`}
                aria-hidden
              />
            </SettingsRow>

            {scheduleOpen ? (
              <div id="settings-reminder-schedule" className="divide-y divide-monk-border/40">
                {displayedReminders.map(reminderRow)}

                {/* Description on its own line, actions on the next: side by
                    side, the two labels wrapped mid-word at 390px. */}
                <div className="px-4 py-3">
                  <p className="text-xs leading-4 text-monk-muted">{tUI("settings.remindersDesc")}</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <GhostButton
                      onClick={handleTestReminder}
                      aria-label={tUI("settings.testReminderAria")}
                      /* GhostButton is inline-block, so an inline icon and label
                         can wrap and the SVG collapses to 0px. Force a flex row. */
                      className="!inline-flex !min-h-11 items-center !shrink-0 !whitespace-nowrap !px-3 text-xs font-semibold text-monk-accent hover:bg-monk-accent/10"
                    >
                      <Bell className="mr-1 h-3.5 w-3.5 shrink-0" />
                      {tUI("settings.testReminder")}
                    </GhostButton>
                    <GhostButton
                      onClick={store.resetReminders}
                      aria-label={tUI("settings.remindersResetAria")}
                      className="!inline-flex !min-h-11 items-center !shrink-0 !whitespace-nowrap !px-3 text-xs"
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5 shrink-0" />
                      {tUI("settings.remindersReset")}
                    </GhostButton>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </motion.section>

        {/* ─── Data & backup ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <GroupLabel label={tUI("settings.group.data")} />
          <div className="space-y-3">
            <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
              <SettingsRow icon={Smartphone} title={tUI("settings.exportData")} description={tUI("settings.exportDataDesc")}>
                <button type="button" onClick={downloadLauncherSnapshot} aria-label={tUI("settings.downloadLauncherBridgeAria")} className={rowIconClass}>
                  <Download className="h-4 w-4" />
                </button>
              </SettingsRow>
              <SettingsRow icon={HardDrive} title={tUI("settings.backup")} description={tUI("settings.backupDesc")}>
                <button type="button" onClick={downloadBackup} aria-label={tUI("settings.downloadBackup")} className={rowIconClass}>
                  <Download className="h-4 w-4" />
                </button>
              </SettingsRow>
              <SettingsRow icon={FileText} title={tUI("settings.seasonLog")} description={tUI("settings.seasonLogDesc")}>
                <button type="button" onClick={downloadSeasonLogMd} aria-label={tUI("settings.downloadMdAria")} className={rowIconClass}>
                  <Download className="h-4 w-4" />
                </button>
              </SettingsRow>
              {/* Raw JSON for copy-paste. Kept separate from the file downloads
                  because it renders into the panel below instead of saving. */}
              <SettingsRow icon={FileJson} title={tUI("settings.dataJson")} description={tUI("settings.dataJsonDesc")}>
                <button type="button" onClick={showJson} aria-label={tUI("settings.exportJsonAria")} className={rowIconClass}>
                  <FileJson className="h-4 w-4" />
                </button>
              </SettingsRow>
              <SettingsRow icon={Upload} title={tUI("settings.importFrom")} description={tUI("settings.importFromDesc")}>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    aria-label={tUI("settings.importAria")}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleImportFile(file);
                    }}
                  />
                  <span className={rowActionClass}>{tUI("settings.importAction")}</span>
                </label>
              </SettingsRow>
            </Card>

            {exported ? (
              <Textarea readOnly value={exported} className="font-mono text-xs" />
            ) : null}
          </div>
        </motion.section>

        {/* ─── Calendar ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <GroupLabel label={tUI("settings.group.calendar")} />
          <Card className="overflow-hidden p-0">
            {/* Honest copy: Zendo exports an .ics file. It does not connect to a
                calendar account, so the row must not claim it does. */}
            <SettingsRow icon={Calendar} title={tUI("settings.calendar")} description={tUI("settings.calendarDesc")}>
              <button type="button" onClick={downloadReminderIcs} aria-label={tUI("settings.downloadIcsAria")} className={rowIconClass}>
                <Download className="h-4 w-4" />
              </button>
            </SettingsRow>
          </Card>
        </motion.section>

        {/* ─── Account ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <GroupLabel label={tUI("settings.group.account")} />
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
            <SettingsRow
              icon={Cloud}
              title={tUI("settings.sync")}
              description={localOnly ? tUI("sync.localOnlyDesc") : tUI("settings.syncDesc")}
              value={syncLabel(syncStatus, tUI, localOnly)}
              onPress={() => navigate(routes.login)}
              ariaLabel={tUI("settings.connectAccount")}
            >
              <span className={`h-2 w-2 rounded-full ${syncDotColor(syncStatus, localOnly)}`} aria-hidden />
              <ChevronRight size={16} className="text-monk-muted/50" aria-hidden />
            </SettingsRow>
            {session?.email ? (
              <SettingsRow title={session.email}>
                <GhostButton onClick={handleLogout} className="!min-h-11 !px-3 text-xs">
                  {tUI("settings.logout")}
                </GhostButton>
              </SettingsRow>
            ) : null}
          </Card>
        </motion.section>

        {/* ─── Season ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <GroupLabel label={tUI("settings.group.season")} />
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
            <SettingsRow icon={Calendar} title={tUI("settings.archiveSeason")} description={tUI("settings.archiveSeasonDesc")}>
              <button type="button" onClick={store.archiveSeason} className={rowActionClass}>
                {tUI("settings.archive")}
              </button>
            </SettingsRow>
            <SettingsRow
              icon={Calendar}
              title={tUI("seasons.settingsRow")}
              description={tUI("seasons.settingsRowDesc")}
              onPress={() => navigate(routes.seasons)}
            >
              <ChevronRight size={16} className="text-monk-muted/50" aria-hidden />
            </SettingsRow>
          </Card>
        </motion.section>

        {/* ─── About & privacy ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <GroupLabel label={tUI("settings.group.about")} />
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
            <SettingsRow
              icon={Compass}
              title={tUI("settings.guideRow")}
              description={tUI("settings.guideRowDesc")}
              onPress={() => navigate(routes.guide)}
            >
              <ChevronRight size={16} className="text-monk-muted/50" aria-hidden />
            </SettingsRow>
            {/* Marking the grey-mode guide complete is guide progress, not a
                display mode — it lives here next to the guide, not in Appearance. */}
            <SettingsRow icon={Moon} title={tUI("settings.detox")} description={tUI("settings.detoxDesc")}>
              <MonkToggle
                checked={store.appSettings.greyModeGuideCompleted}
                aria-label={tUI("settings.detox")}
                onToggle={() => store.updateSettings({ greyModeGuideCompleted: !store.appSettings.greyModeGuideCompleted })}
              />
            </SettingsRow>
            {/* Static pages, so plain anchors (no router hop, no bundle cost).
                lang is carried across so the opened page matches the UI. */}
            <SettingsRow icon={FileText} title={tUI("settings.legalTerms")} description={tUI("settings.legalTermsDesc")}>
              <a
                href={legalHref(lang, "terms")}
                target="_blank"
                rel="noopener"
                aria-label={tUI("settings.legalTermsAria")}
                className={rowActionClass}
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
                className={rowActionClass}
              >
                {tUI("settings.legalOpen")}
              </a>
            </SettingsRow>
            <p className="px-4 py-2.5 text-[10px] text-monk-muted/50">
              {tUI("settings.legalVersion", { version: LEGAL_VERSION, date: LEGAL_UPDATED })}
            </p>
          </Card>
        </motion.section>

        {/* ─── Reset — its own block, no group label, red used only here ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <Card className="overflow-hidden border-monk-danger/25 p-0">
            <SettingsRow
              icon={Trash2}
              title={tUI("settings.reset")}
              description={tUI("settings.resetDesc")}
              danger
              onPress={() => setConfirmKind("wipe")}
              ariaLabel={tUI("settings.wipe")}
            >
              <ChevronRight size={16} className="text-monk-danger/50" aria-hidden />
            </SettingsRow>
          </Card>
        </motion.section>

        {/* ─── Support — secondary, voluntary, last ─── */}
        <motion.section variants={groupReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <Card className="overflow-hidden p-0">
            <SettingsRow
              icon={Heart}
              title={tUI("settings.support")}
              description={tUI("settings.supportDesc")}
              onPress={() => setProModalOpen(true)}
              ariaLabel={tUI("settings.supportAria")}
            >
              <ChevronRight size={16} className="text-monk-muted/50" aria-hidden />
            </SettingsRow>
          </Card>
        </motion.section>

        {/* About */}
        <p className="pt-1 text-center text-xs text-monk-muted/50">{tUI("settings.about")}</p>
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

/* ─── Settings primitives ─── */

/** Group heading. A small caps label is enough — the card below it is the
 *  boundary, so a rule or an icon chip would only add noise. */
function GroupLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-monk-muted/80">
      {label}
    </p>
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
      /* Hit area is a 44x44 target (WCAG 2.2 AA); -my-2.5 cancels the extra
         height so the row keeps its original 24px-tall layout footprint.
         The visible track stays 24px — the design is unchanged. */
      className="relative -my-2.5 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg"
    >
      <span className={`relative inline-flex h-6 w-[44px] items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-monk-accent" : "bg-monk-border-strong"
      }`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-monk-text shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`} />
      </span>
    </button>
  );
}

/**
 * One settings row: icon, title, optional short description, then the control.
 * `value` prints a quiet readout (a status or a count) just before the control.
 * Pass `onPress` to make the whole row the control — used for rows that open a
 * page or a dialog, which get a chevron in `children`.
 */
function SettingsRow({
  icon: Icon,
  title,
  description,
  value,
  children,
  danger,
  onPress,
  ariaLabel,
  expanded,
  controls,
  wrapControl,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  value?: string;
  children?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
  ariaLabel?: string;
  expanded?: boolean;
  controls?: string;
  /** Let the control column shrink so a wrapping control (the theme swatches)
   *  breaks onto a second line instead of crushing the title to one character
   *  per line at 320px. */
  wrapControl?: boolean;
}) {
  const body = (
    <>
      <div className={`flex flex-1 items-start gap-3 ${wrapControl ? "min-w-[6rem]" : "min-w-0"}`}>
        {Icon ? (
          <Icon
            size={18}
            strokeWidth={1.5}
            /* mt-0.5 keeps the glyph on the title's optical centre when the
               description wraps to three lines. */
            className={`mt-0.5 shrink-0 ${danger ? "text-monk-danger/70" : "text-monk-muted/80"}`}
            aria-hidden
          />
        ) : null}
        <div className="min-w-0">
          <p className={`break-words text-[15px] font-medium leading-5 ${danger ? "text-monk-danger" : "text-monk-text"}`}>{title}</p>
          {description ? <div className="mt-0.5 break-words text-xs leading-4 text-monk-muted">{description}</div> : null}
        </div>
      </div>
      <div className={`flex items-center justify-end gap-1 ${wrapControl ? "min-w-0 shrink" : "shrink-0"}`}>
        {value ? <span className="whitespace-nowrap text-xs text-monk-muted">{value}</span> : null}
        {children}
      </div>
    </>
  );

  const base = "flex w-full items-center justify-between gap-3 px-4 py-3 text-left";

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        aria-label={ariaLabel}
        aria-expanded={expanded}
        aria-controls={controls}
        className={`${base} transition active:bg-monk-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-monk-accent`}
      >
        {body}
      </button>
    );
  }

  return <div className={base}>{body}</div>;
}
