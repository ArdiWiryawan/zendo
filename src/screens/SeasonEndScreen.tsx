import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { routes } from "../constants/routes";
import {
  Card,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from "../components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-monk-muted mb-2">{title}</p>
      {children}
    </div>
  );
}

export function SeasonEndScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const t = useT();
  const questions = [t("seasonEnd.q1"), t("seasonEnd.q2"), t("seasonEnd.q3"), t("seasonEnd.q4"), t("seasonEnd.q5")];
  return (
    <>
      <PageHeader title={t("seasonEnd.title")} subtitle={t("seasonEnd.subtitle")} />
      <div className="space-y-4">
        {questions.map((question) => (
          <Card key={question}>
            <label className="mb-3 block font-semibold">{question}</label>
            <Textarea value={answers[question] ?? ""} onChange={(event) => setAnswers((value) => ({ ...value, [question]: event.target.value }))} />
          </Card>
        ))}
        <PrimaryButton onClick={() => {
          store.startNewSeason();
          navigate(routes.onboardingGoals);
        }}>
          {t("seasonEnd.startNew")}
        </PrimaryButton>
        <SecondaryButton onClick={() => {
          store.archiveSeason();
          navigate(routes.onboardingWelcome);
        }}>
          {t("seasonEnd.archive")}
        </SecondaryButton>
      </div>
    </>
  );
}

