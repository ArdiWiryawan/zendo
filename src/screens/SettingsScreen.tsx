import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalmDialog,
  Card,
  GhostButton,
  PageHeader,
  Textarea,
} from "../components/ui";
import {
  Bell,
  Calendar,
  Cloud,
  Download,
  FileJson,
  FileText,
  Globe,
  HardDrive,
  Moon,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
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
import type { AppLanguage, MonkMVPState } from "../types/app";

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

export default function SettingsScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const [exported, setExported] = useState("");
  const [confirmKind, setConfirmKind] = useState<null | "import" | "wipe">(null);
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<{ email?: string } | null>(null);
  const syncStatus = useSyncStatus();
  const tUI = useT();
  // No session (or Supabase not configured) — nothing to sync, don't claim "Synced".
  const localOnly = !session;
  const lang = (store.appSettings.language ?? "id") as AppLanguage;
  const labels = getJournalQuestionLabels(lang);
  const sb = typeof getSupabase === "function" ? (getSupabase as () => any)() : null;

  useEffect(() => {
    if (!sb?.auth) return;
    sb.auth.getSession().then(({ data }: any) => {
      if (data?.session) setSession({ email: data.session.user?.email });
    });
  }, [sb]);

  const handleLogout = async () => {
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
      ...learning.map(l => `- **${(l.endedAt ?? l.startedAt).slice(0,10)}** (${l.sourceType}): ${l.sourceTitle || l.lesson?.slice(0, 60) || "-"} - Insight: ${l.lesson || "-"}`),
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

        {/* Preferences */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={Globe} label={tUI("settings.prefs")} />
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
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
                <GhostButton onClick={store.resetReminders} aria-label={tUI("settings.remindersResetAria")} className="!min-h-10 !px-2.5 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  {tUI("settings.remindersReset")}
                </GhostButton>
              </div>
              <p className="mb-2 text-xs text-monk-muted/70 leading-4">{tUI("settings.remindersDesc")}</p>
              <div className="divide-y divide-monk-border/30 rounded-monk border border-monk-border/40">
                {store.notificationReminders.map((reminder) => (
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

        {/* Danger Zone */}
        <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <SectionHeader icon={ShieldAlert} label={tUI("settings.danger")} danger />
          <Card className="border-monk-danger/20 p-0 overflow-hidden">
            <SettingsRow icon={Trash2} title={tUI("settings.reset")} description={tUI("settings.resetDesc")} danger>
              <button
                type="button"
                className="shrink-0 text-xs font-bold text-monk-danger border border-monk-danger/30 hover:border-monk-danger bg-monk-danger/5 px-3 py-1.5 rounded-full transition active:scale-95"
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
  const iconBg = danger ? "bg-monk-danger/8" : "bg-monk-accent/8";
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
