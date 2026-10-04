import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, GhostButton, PageHeader, SectionHeader } from "../components/ui";
import { routes } from "../constants/routes";
import { useT, type MessageKey } from "../i18n";

/**
 * "How Zendo works" — one page, read once. Every concept is a heading, one
 * plain sentence, and one concrete example, so it stays scannable rather than
 * turning into documentation.
 */

type Concept = { title: MessageKey; body: MessageKey; example: MessageKey };
type Group = { heading: MessageKey; concepts: Concept[] };

const GROUPS: Group[] = [
  {
    heading: "guide.todayHeading",
    concepts: [
      { title: "guide.highlightTitle", body: "guide.highlightBody", example: "guide.highlightExample" },
      { title: "guide.mainActionTitle", body: "guide.mainActionBody", example: "guide.mainActionExample" },
      { title: "guide.agendaTitle", body: "guide.agendaBody", example: "guide.agendaExample" },
    ],
  },
  {
    heading: "guide.goalsHeading",
    concepts: [
      { title: "guide.seasonTitle", body: "guide.seasonBody", example: "guide.seasonExample" },
      { title: "guide.goalsTitle", body: "guide.goalsBody", example: "guide.goalsExample" },
      { title: "guide.practicesTitle", body: "guide.practicesBody", example: "guide.practicesExample" },
    ],
  },
  {
    heading: "guide.projectsHeading",
    concepts: [{ title: "guide.projectsTitle", body: "guide.projectsBody", example: "guide.projectsExample" }],
  },
  {
    heading: "guide.focusHeading",
    concepts: [
      { title: "guide.focusTitle", body: "guide.focusBody", example: "guide.focusExample" },
      { title: "guide.focusModesTitle", body: "guide.focusModesBody", example: "guide.focusModesExample" },
    ],
  },
  {
    heading: "guide.notebookHeading",
    concepts: [{ title: "guide.notebookTitle", body: "guide.notebookBody", example: "guide.notebookExample" }],
  },
  {
    heading: "guide.journalHeading",
    concepts: [
      { title: "guide.morningTitle", body: "guide.morningBody", example: "guide.morningExample" },
      { title: "guide.reflectionTitle", body: "guide.reflectionBody", example: "guide.reflectionExample" },
    ],
  },
  {
    heading: "guide.reviewHeading",
    concepts: [
      { title: "guide.timelineTitle", body: "guide.timelineBody", example: "guide.timelineExample" },
      { title: "guide.weeklyTitle", body: "guide.weeklyBody", example: "guide.weeklyExample" },
    ],
  },
];

const FLOW: { label: MessageKey; body: MessageKey }[] = [
  { label: "guide.flowPlan", body: "guide.flowPlanBody" },
  { label: "guide.flowChoose", body: "guide.flowChooseBody" },
  { label: "guide.flowDo", body: "guide.flowDoBody" },
  { label: "guide.flowReflect", body: "guide.flowReflectBody" },
];

function ConceptRow({ title, body, example }: Concept) {
  const t = useT();
  return (
    <div className="border-t border-monk-border/40 px-4 py-3 first:border-t-0">
      <h3 className="text-sm font-semibold text-monk-text">{t(title)}</h3>
      <p className="mt-1 text-sm leading-6 text-monk-muted">{t(body)}</p>
      <p className="mt-1 text-xs leading-5 text-monk-muted/70">
        {t("guide.exampleLabel")}: {t(example)}
      </p>
    </div>
  );
}

export default function GuideScreen() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <PageHeader
        title={t("guide.title")}
        subtitle={t("guide.subtitle")}
        rightSlot={
          <GhostButton onClick={() => navigate(routes.settings)} aria-label={t("guide.back")} className="shrink-0">
            <span className="flex items-center gap-1.5">
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
              {t("guide.back")}
            </span>
          </GhostButton>
        }
      />

      <div className="space-y-6">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-monk-text">{t("guide.introHeading")}</h2>
          <p className="mt-1 text-sm leading-6 text-monk-muted">{t("guide.introBody")}</p>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-monk-text">{t("guide.coreHeading")}</h2>
          <p className="mt-2 text-sm leading-6 text-monk-muted">{t("guide.coreBody")}</p>
          <p className="mt-1 text-sm font-medium leading-6 text-monk-text">{t("guide.coreList")}</p>
          <p className="mt-3 text-sm leading-6 text-monk-muted">{t("guide.optionalBody")}</p>
          <p className="mt-2 text-sm leading-6 text-monk-muted">{t("guide.optionalNote")}</p>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-monk-text">{t("guide.flowHeading")}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FLOW.map((step) => (
              <div key={step.label} className="rounded-monk border border-monk-border bg-monk-soft px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-monk-accent">{t(step.label)}</p>
                <p className="mt-0.5 text-xs leading-5 text-monk-muted">{t(step.body)}</p>
              </div>
            ))}
          </div>
        </Card>

        {GROUPS.map((group) => (
          <section key={group.heading}>
            <SectionHeader title={t(group.heading)} />
            <Card className="overflow-hidden p-0">
              {group.concepts.map((concept) => (
                <ConceptRow key={concept.title} {...concept} />
              ))}
            </Card>
          </section>
        ))}

        <p className="px-1 text-xs leading-5 text-monk-muted/70">{t("guide.footer")}</p>
      </div>
    </div>
  );
}
