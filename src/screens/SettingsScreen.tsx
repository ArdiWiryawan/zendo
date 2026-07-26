import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalmDialog,
  Card,
  GhostButton,
  PageHeader,
  Textarea,
} from "../components/ui";
import { routes } from "../constants/routes";
import { getDaysPassed } from "../lib/date";
import { exportStateAsJson } from "../lib/storage";
import { supabase as getSupabase } from "../lib/supabase";
import { useSyncStatus, type SyncStatus } from "../lib/syncStatus";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import {
  getDailyJournalPromptForDate,
  getJournalQuestionLabels,
} from "../i18n/prompts";
import type { AppLanguage } from "../types/app";

function syncLabel(status: SyncStatus, tUI: (k: any) => string) {
  if (status === "syncing") return tUI("sync.syncing");
  if (status === "offline") return tUI("sync.offline");
  if (status === "error") return tUI("sync.error");
  if (status === "synced") return tUI("sync.synced");
  return tUI("sync.idle");
}

function AccountStatus() {
  const navigate = useNavigate();
  const tUI = useT();
  const syncStatus = useSyncStatus();
  const [session, setSession] = useState<{ email?: string } | null>(null);
  const sb = typeof getSupabase === "function" ? (getSupabase as () => any)() : null;

  useEffect(() => {
    if (!sb?.auth) return;
    sb.auth.getSession().then(({ data }: any) => {
      if (data?.session) setSession({ email: data.session.user?.email });
    });
  }, []);

  const handleLogout = async () => {
    if (!sb?.auth) return;
    await sb.auth.signOut();
    setSession(null);
  };

  const chip = (
    <span className="text-xs text-monk-muted" aria-live="polite">
      {syncLabel(syncStatus, tUI)}
    </span>
  );

  if (session?.email) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-xs text-monk-muted">{session.email}</span>
          <GhostButton onClick={handleLogout}>Logout</GhostButton>
        </div>
        {chip}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-between gap-2 w-full">
        <span className="text-sm text-monk-muted">Not connected</span>
        <GhostButton onClick={() => navigate(routes.login)}>Connect Account</GhostButton>
      </div>
      {chip}
    </div>
  );
}

export default function SettingsScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const [exported, setExported] = useState("");
  const [confirmKind, setConfirmKind] = useState<null | "import" | "wipe">(null);
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  const tUI = useT();
  const lang = (store.appSettings.language ?? "id") as AppLanguage;
  const labels = getJournalQuestionLabels(lang);

  const applyImport = (data: Record<string, unknown>) => {
    const separateKeys = new Set(["focusSessions", "learningSessions", "timelineEvents"]);
    const mainState: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (separateKeys.has(key)) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        mainState[key] = value;
      }
    });
    if (Object.keys(mainState).length > 0) {
      const existing = localStorage.getItem("monk_mode_pwa_state_v1");
      const base = existing ? JSON.parse(existing) : {};
      localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify({ ...base, ...mainState }));
    }
    setExported("✓ Imported successfully. Reload to apply.");
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
    
    const totalFocusMinutes = store.focusSessions
      .filter((s) => ["completed", "ended_early"].includes(s.status))
      .reduce((sum, s) => sum + (s.focusDurationMinutes ?? s.durationMinutes), 0);
      
    const completedDaysCount = store.dayPlans.filter(
      (day) => day.seasonId === season.id && day.status === "completed"
    ).length;
    
    const totalPassedDays = Math.max(1, getDaysPassed(season.startDate));
    const consistencyRate = Math.min(100, Math.round((completedDaysCount / totalPassedDays) * 100));

    const lines = [
      `# Zendo Season Log`,
      `Season ID: ${season.id}`,
      `Status: ${season.status}`,
      `Start Date: ${season.startDate}`,
      `End Date: ${season.endDate}`,
      `Duration: ${season.durationDays} days`,
      `Goals completed/passed: ${completedDaysCount} days`,
      `Total focus time: ${totalFocusMinutes} minutes`,
      `Consistency rate: ${consistencyRate}%`,
      "",
      "## Focus Goals & Keystones",
      ...store.goals.map(g => `- **${g.title}**: ${g.keystoneAction}`),
      "",
      "## Daily Focus Log",
      ...store.dayPlans.map(d => {
        const goal = store.goals.find(g => g.id === d.goalId);
        return `- **${d.date}**: ${d.dayType === "rest" ? "Rest Day" : `Goal: "${goal?.title}"`} (Status: ${d.status}, Action: ${d.mainAction || "None"})`;
      }),
      "",
      "## Reflections (Journal)",
      ...store.journalEntries.map(j => {
        return [
          `### Reflection for ${j.date}`,
          `- **${getDailyJournalPromptForDate(lang, j.date)}**: ${j.answers.whatMovedToday || "-"}`,
          j.answers.whatDistractedMe ? `- **${labels.whatDistractedMe}**: ${j.answers.whatDistractedMe}` : "",
          j.answers.whatDidILearn ? `- **${labels.whatDidILearn}**: ${j.answers.whatDidILearn}` : "",
          j.answers.whatShouldBeEasierTomorrow ? `- **${labels.whatShouldBeEasierTomorrow}**: ${j.answers.whatShouldBeEasierTomorrow}` : "",
          j.answers.whatShouldBeHarderTomorrow ? `- **${labels.whatShouldBeHarderTomorrow}**: ${j.answers.whatShouldBeHarderTomorrow}` : ""
        ].filter(Boolean).join("\n");
      }),
      "",
      "## Learning Log",
      ...store.learningEntries.map(l => `- **${l.createdAt.slice(0,10)}** (${l.type}): ${l.title} - Insight: ${l.keyInsight || "-"}`),
      "",
      "## Relapse & Drift Logs",
      ...store.relapseLogs.map(r => `- **${r.createdAt.slice(0,10)}** (Trigger: ${r.trigger}): ${r.note} - Recovery: ${r.recoveryAction || "-"}`)
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
        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-monk-muted">{tUI("settings.prefs")}</p>
          <Card className="divide-y divide-monk-border/40 overflow-hidden p-0">
            <SettingsRow title={tUI("settings.language")} description={tUI("settings.languageDesc")}>
              <div className="flex rounded-full bg-monk-soft p-0.5 border border-monk-border/40 shrink-0">
                {(["id", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => store.updateSettings({ language: code })}
                    className={`min-w-11 min-h-9 px-3 rounded-full text-xs font-semibold transition ${
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
            <SettingsRow title={tUI("settings.notifications")} description={tUI("settings.notificationsDesc")}>
              <button
                type="button"
                role="switch"
                aria-checked={store.appSettings.notificationEnabled}
                aria-label={tUI("settings.notifications")}
                onClick={async () => {
                  if ("Notification" in window && Notification.permission !== "granted") {
                    await Notification.requestPermission();
                  }
                  store.updateSettings({ notificationEnabled: !store.appSettings.notificationEnabled });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${store.appSettings.notificationEnabled ? "bg-monk-accent" : "bg-monk-border"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${store.appSettings.notificationEnabled ? "translate-x-[22px]" : "translate-x-1"}`} />
              </button>
            </SettingsRow>
            <SettingsRow title={tUI("settings.detox")} description={tUI("settings.detoxDesc")}>
              <button
                type="button"
                role="switch"
                aria-checked={store.appSettings.greyModeGuideCompleted}
                aria-label={tUI("settings.detox")}
                onClick={() => store.updateSettings({ greyModeGuideCompleted: !store.appSettings.greyModeGuideCompleted })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${store.appSettings.greyModeGuideCompleted ? "bg-monk-accent" : "bg-monk-border"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${store.appSettings.greyModeGuideCompleted ? "translate-x-[22px]" : "translate-x-1"}`} />
              </button>
            </SettingsRow>
          </Card>
        </div>

        {/* Data & Export */}
        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-monk-muted">{tUI("settings.data")}</p>
          <Card className="divide-y divide-monk-border/40 p-0 overflow-hidden">
            <SettingsRow title={tUI("settings.calendar")} description={tUI("settings.calendarDesc")}>
              <GhostButton onClick={downloadReminderIcs}>{tUI("settings.downloadIcs")}</GhostButton>
            </SettingsRow>
            <SettingsRow title={tUI("settings.seasonLog")} description={tUI("settings.seasonLogDesc")}>
              <GhostButton onClick={downloadSeasonLogMd}>{tUI("settings.downloadMd")}</GhostButton>
            </SettingsRow>
            <SettingsRow title={tUI("settings.backup")} description={tUI("settings.backupDesc")}>
              <GhostButton onClick={downloadBackup}>{tUI("settings.downloadBackup")}</GhostButton>
            </SettingsRow>
            <SettingsRow title="Data (JSON)" description="Export or import your full data.">
              <div className="flex gap-2 shrink-0">
                <GhostButton onClick={() => setExported(JSON.stringify({
                  userProfile: store.userProfile,
                  activeSeason: store.activeSeason,
                  goals: store.goals,
                  journalEntries: store.journalEntries,
                  dayPlans: store.dayPlans,
                  weeklyPlans: store.weeklyPlans,
                  focusSessions: store.focusSessions,
                  learningSessions: store.learningSessions,
                  learningEntries: store.learningEntries,
                  relapseLogs: store.relapseLogs,
                  energyLogs: store.energyLogs,
                  timelineEvents: store.timelineEvents,
                  appSettings: store.appSettings,
                }, null, 2))}>Export</GhostButton>
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
                          alert("Invalid Zendo backup file.");
                        }
                      } catch { alert("Failed to parse file."); }
                    };
                    reader.readAsText(file);
                  }} />
                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-monk-muted border border-monk-border rounded-full hover:border-monk-accent hover:text-monk-accent transition active:scale-95">Import</span>
                </label>
              </div>
            </SettingsRow>
          </Card>
          {exported ? <Textarea readOnly value={exported} className="font-mono text-xs mt-3" /> : null}
        </div>

        {/* Account */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted px-1 mb-2">Account</p>
          <Card className="p-0 overflow-hidden">
            <SettingsRow title="Sync" description="Connect to sync across devices. Works offline without an account.">
              <AccountStatus />
            </SettingsRow>
          </Card>
        </div>

        {/* Season */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted px-1 mb-2">Season</p>
          <Card className="p-0 overflow-hidden">
            <SettingsRow title="Archive Season" description="End current season, preserve all progress.">
              <GhostButton onClick={store.archiveSeason}>Archive</GhostButton>
            </SettingsRow>
          </Card>
        </div>

        {/* Danger Zone */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-danger/60 px-1 mb-2">{tUI("settings.danger")}</p>
          <Card className="border-monk-danger/20 p-0 overflow-hidden">
            <SettingsRow title={tUI("settings.reset")} description={tUI("settings.resetDesc")}>
              <button
                type="button"
                className="shrink-0 text-xs font-bold text-monk-danger border border-monk-danger/30 hover:border-monk-danger bg-monk-danger/5 px-3 py-1.5 rounded-full transition active:scale-95"
                onClick={() => setConfirmKind("wipe")}
              >
                {tUI("settings.wipe")}
              </button>
            </SettingsRow>
          </Card>
        </div>

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

function SettingsItem({ title, description, children }: { title: string; description?: string; children: JSX.Element }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-monk-muted">{description}</p> : null}
        </div>
        {children}
      </div>
    </Card>
  );
}

function SettingsRow({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-monk-text">{title}</p>
        {description ? <p className="text-xs text-monk-muted mt-0.5 leading-4">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

