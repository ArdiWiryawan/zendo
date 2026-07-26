import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { useCalmToast } from "../components/ui";
import { getTodayDateString } from "../lib/date";
import { routes } from "../constants/routes";
import {
  Card,
  ChoiceChip,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from "../components/ui";
import { FrictionWhy } from "../components/SeasonWidgets";

export function RelapseScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const why = store.activeSeason?.why;
  const obstacles = (store.activeSeason?.obstacles ?? []).filter(Boolean).slice(0, 4);
  const [trigger, setTrigger] = useState<"boredom" | "stress" | "fatigue" | "loneliness" | "trigger_app" | "no_clear_plan" | "other">("boredom");
  const [note, setNote] = useState("");
  const [recoveryAction, setRecoveryAction] = useState("");
  const [saved, setSaved] = useState(false);
  const triggers = [
    "boredom",
    "stress",
    "fatigue",
    "loneliness",
    "trigger_app",
    "no_clear_plan",
    "other"
  ] as const;

  const startCustom = (minutes: number) => {
    store.startFocusSession("custom", minutes);
    navigate(routes.focus);
  };

  if (saved) {
    return (
      <>
        <PageHeader title={t("relapse.savedTitle")} subtitle={t("relapse.savedSubtitle")} />
        <FrictionWhy className="mb-4" />
        {why?.identity || why?.consequenceOfInaction ? null : (
          <Card className="mb-4 p-4">
            <p className="text-sm text-monk-muted">{t("relapse.noWhy")}</p>
            <SecondaryButton className="mt-3" onClick={() => navigate(routes.timeline)}>
              {t("relapse.addWhy")}
            </SecondaryButton>
          </Card>
        )}
        <Card className="mb-4 space-y-2 p-4">
          <p className="text-sm font-semibold">{t("relapse.chooseNext")}</p>
          <PrimaryButton onClick={() => startCustom(10)}>{t("relapse.ten")}</PrimaryButton>
          <SecondaryButton className="w-full" onClick={() => startCustom(25)}>
            {t("relapse.twentyFive")}
          </SecondaryButton>
          <SecondaryButton
            className="w-full"
            onClick={() => {
              store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "rest" });
              navigate(routes.today);
            }}
          >
            {t("relapse.rest")}
          </SecondaryButton>
        </Card>
        <GhostButton className="w-full" onClick={() => navigate(routes.today)}>
          {t("relapse.backToday")}
        </GhostButton>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("relapse.title")} subtitle={t("relapse.subtitle")} />
      <FrictionWhy className="mb-4" />
      <Card>
        <p className="mb-3 font-semibold">{t("relapse.whatPulled")}</p>
        <div className="flex flex-wrap gap-2">
          {triggers.map((value) => (
            <ChoiceChip
              key={value}
              label={t(`relapse.trigger.${value}`)}
              selected={trigger === value}
              onClick={() => setTrigger(value)}
            />
          ))}
        </div>
      </Card>
      {obstacles.length ? (
        <Card className="mt-4 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("relapse.knownObstacles")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {obstacles.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full border border-monk-border bg-monk-soft px-2.5 py-1 text-[11px] text-monk-text-soft transition hover:border-monk-accent hover:text-monk-accent"
                onClick={() =>
                  setRecoveryAction((prev) =>
                    prev.includes(item) ? prev : prev ? `${prev}\nHarder: ${item}` : `Make harder: ${item}`
                  )
                }
              >
                + {item}
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      <div className="mt-5 space-y-4">
        <Textarea placeholder={t("relapse.whatHappened")} value={note} onChange={(event) => setNote(event.target.value)} />
        <Textarea
          placeholder={t("relapse.harderTomorrow")}
          value={recoveryAction}
          onChange={(event) => setRecoveryAction(event.target.value)}
        />
        <PrimaryButton
          onClick={() => {
            store.saveRelapseLog({ trigger, note, recoveryAction });
            setSaved(true);
          }}
        >
          {t("relapse.save")}
        </PrimaryButton>
      </div>
    </>
  );
}


