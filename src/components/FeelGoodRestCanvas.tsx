import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Moon, BatteryCharging, Check, ArrowRight } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage } from "../i18n";
import { hapticPress } from "../lib/haptics";
import { Card, PrimaryButton, GhostButton, useCalmToast } from "./ui";
import { getTodayDateString } from "../lib/date";
import type { EnergyLevel } from "../types/app";

interface FeelGoodRestCanvasProps {
  onOpenWeeklyReview: () => void;
  className?: string;
}

type EnergiserType = "play" | "people" | "power";

interface RestActivity {
  id: string;
  type: EnergiserType;
  titleId: string;
  titleEn: string;
  subtitleId: string;
  subtitleEn: string;
  icon: string;
}

const ENERGISERS: RestActivity[] = [
  // 🎮 PLAY: Curiosity & Joy
  {
    id: "play_film",
    type: "play",
    titleId: "Tonton Film / Serial Favorit",
    titleEn: "Watch a Favorite Movie or Show",
    subtitleId: "Nikmati cerita tanpa rasa bersalah atau memikirkan kerjaan.",
    subtitleEn: "Enjoy a story without guilt or thinking about work.",
    icon: "🎬"
  },
  {
    id: "play_music",
    type: "play",
    titleId: "Eksplorasi Musik / Podcast Santai",
    titleEn: "Explore Music or Relaxing Podcast",
    subtitleId: "Dengarkan album favorit atau topik hobi dengan headphone yang nyaman.",
    subtitleEn: "Listen to a favorite album or hobby topic with comfortable headphones.",
    icon: "🎧"
  },
  {
    id: "play_hobby",
    type: "play",
    titleId: "Hobi Kreatif / Gaming Ringan",
    titleEn: "Creative Hobby or Light Gaming",
    subtitleId: "Menggambar, merakit, menulis fiksi, atau main game santai.",
    subtitleEn: "Draw, craft, write fiction, or play a cozy game.",
    icon: "🎮"
  },

  // 👥 PEOPLE: Connection & Warmth
  {
    id: "people_hangout",
    type: "people",
    titleId: "Ngopi / Makan Bareng Teman",
    titleEn: "Coffee or Meal with a Friend",
    subtitleId: "Bertemu sahabat dekat untuk obrolan santai yang menghangatkan hati.",
    subtitleEn: "Meet a close friend for a relaxing, heartwarming chat.",
    icon: "☕"
  },
  {
    id: "people_call",
    type: "people",
    titleId: "Telepon Orang Tua / Keluarga",
    titleEn: "Call Parents or Family",
    subtitleId: "Tanyakan kabar dan berbagi cerita tanpa terburu-buru waktu.",
    subtitleEn: "Catch up and share stories without rushing.",
    icon: "📞"
  },
  {
    id: "people_walk",
    type: "people",
    titleId: "Jalan Santai Berdua",
    titleEn: "Casual Walk Together",
    subtitleId: "Habiskan waktu bersama pasangan atau sahabat di ruang terbuka.",
    subtitleEn: "Spend time with your partner or friend outdoors.",
    icon: "🌿"
  },

  // ⚡ POWER: Recharge & Autonomy
  {
    id: "power_nap",
    type: "power",
    titleId: "Tidur Siang / Rehat Total",
    titleEn: "Power Nap / Total Rest",
    subtitleId: "Istirahatkan mata dan sistem saraf tanpa pasang alarm terburu-buru.",
    subtitleEn: "Rest your eyes and nervous system without an urgent alarm.",
    icon: "🛌"
  },
  {
    id: "power_walk",
    type: "power",
    titleId: "Jalan Sunyi di Alam (Silent Walk)",
    titleEn: "Silent Nature Walk",
    subtitleId: "Jalan santai 30 menit di luar tanpa layar HP dan earphone.",
    subtitleEn: "Take a 30-minute stroll outside without screens or earbuds.",
    icon: "🌲"
  },
  {
    id: "power_meal",
    type: "power",
    titleId: "Masak Santai & Santap Makanan Sehat",
    titleEn: "Mindful Cooking & Nourishing Meal",
    subtitleId: "Nikmati proses menyiapkan makanan bergizi secara pelan-pelan.",
    subtitleEn: "Enjoy preparing a nutritious meal at an unhurried pace.",
    icon: "🍲"
  }
];

export function FeelGoodRestCanvas({ onOpenWeeklyReview, className = "" }: FeelGoodRestCanvasProps) {
  const t = useT();
  const lang = useLanguage();
  const isId = lang === "id";
  const toast = useCalmToast();
  const store = useMonkStore();
  const today = getTodayDateString();

  const [activeTab, setActiveTab] = useState<"all" | EnergiserType>("all");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const todayPlan = store.dayPlans.find((p) => p.date === today);
    return todayPlan?.mainAction?.startsWith("rest:") ? todayPlan.mainAction.replace("rest:", "") : null;
  });

  const [customAction, setCustomAction] = useState("");
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const todayPlan = store.dayPlans.find((p) => p.date === today);
  const currentEnergy = todayPlan?.energyLevel ?? store.energyLogs.find((e) => e.date === today)?.level;

  const filteredEnergisers = activeTab === "all"
    ? ENERGISERS
    : ENERGISERS.filter((e) => e.type === activeTab);

  const handleSelectActivity = (act: RestActivity) => {
    hapticPress("light");
    setSelectedId(act.id);
    const actTitle = isId ? act.titleId : act.titleEn;
    store.createOrUpdateDayPlan(today, {
      dayType: "rest",
      mainAction: `rest:${act.id}`,
      highlight: actTitle,
      status: "rest"
    });
    toast.show(t("toast.saved"));
  };

  const handleSaveCustom = () => {
    if (!customAction.trim()) return;
    hapticPress("light");
    setSelectedId("custom");
    store.createOrUpdateDayPlan(today, {
      dayType: "rest",
      mainAction: `rest:custom:${customAction.trim()}`,
      highlight: customAction.trim(),
      status: "rest"
    });
    setIsEditingCustom(false);
    toast.show(t("toast.saved"));
  };

  const handleSetEnergy = (lvl: EnergyLevel) => {
    hapticPress("medium");
    store.logEnergy(lvl);
    if (todayPlan) {
      store.createOrUpdateDayPlan(today, {
        dayType: "rest",
        energyLevel: lvl,
        status: "rest"
      });
    }
    toast.show(t("toast.saved"));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Banner */}
      <Card className="relative overflow-hidden border-monk-rest/35 bg-gradient-to-b from-monk-rest-soft/50 via-monk-surface to-monk-surface p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-monk-rest/20 text-monk-rest shadow-inner">
            <Moon size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-monk-rest/40 bg-monk-rest-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-monk-rest">
                Feel-Good Rest Day
              </span>
              <span className="text-[10px] font-medium text-emerald-400/90 flex items-center gap-1">
                <Check size={11} strokeWidth={2.5} /> {isId ? "Streak Terjaga" : "Streak Preserved"}
              </span>
            </div>
            <h3 className="mt-1.5 text-base font-bold text-monk-text tracking-tight">
              {isId ? "Pemulihan Sadar (Sharpen the Saw)" : "Mindful Recovery (Sharpen the Saw)"}
            </h3>
            <p className="mt-1 text-xs text-monk-muted leading-relaxed">
              {isId
                ? "Istirahat bukanlah hilangnya produktivitas, melainkan bahan bakar untuk performa minggu depan. Pilih aktivitas yang menyegarkan energimu hari ini."
                : "Rest is not lost productivity, but fuel for next week's focus. Choose an activity that rejuvenates your energy today."}
            </p>
          </div>
        </div>

        {/* Energy Check-In Pill Row */}
        <div className="mt-4 pt-3.5 border-t border-monk-border/40 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-monk-muted/90 flex items-center gap-1.5">
            <BatteryCharging size={13} className="text-monk-accent" />
            {isId ? "Energi bateraimu saat ini:" : "Current energy level:"}
          </span>
          <div className="flex items-center gap-1.5">
            {(
              [
                { lvl: "low", label: isId ? "Rendah" : "Low", icon: "🪫", color: "hover:border-rose-400 text-rose-300" },
                { lvl: "medium", label: isId ? "Sedang" : "Steady", icon: "⚡", color: "hover:border-amber-400 text-amber-300" },
                { lvl: "high", label: isId ? "Penuh" : "Full", icon: "🚀", color: "hover:border-emerald-400 text-emerald-300" }
              ] as const
            ).map((item) => {
              const active = currentEnergy === item.lvl;
              return (
                <button
                  key={item.lvl}
                  type="button"
                  onClick={() => handleSetEnergy(item.lvl)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 border ${
                    active
                      ? "border-monk-accent bg-monk-accent/15 text-monk-text font-bold shadow-xs"
                      : `border-monk-border/60 bg-monk-soft/50 text-monk-muted ${item.color}`
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 3 Energisers Selector */}
      <div className="flex rounded-xl bg-monk-soft p-1 border border-monk-border/40">
        {(
          [
            { id: "all", label: isId ? "Semua" : "All", icon: "✨" },
            { id: "play", label: isId ? "Play (Joy)" : "Play (Joy)", icon: "🎮" },
            { id: "people", label: isId ? "People (Koneksi)" : "People (Connection)", icon: "👥" },
            { id: "power", label: isId ? "Power (Rejuvenasi)" : "Power (Recharge)", icon: "⚡" }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              hapticPress("light");
              setActiveTab(tab.id);
            }}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold tracking-wide transition whitespace-nowrap px-1.5 ${
              activeTab === tab.id
                ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-xs font-bold"
                : "text-monk-muted hover:text-monk-text"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Energisers Grid */}
      <div className="grid grid-cols-1 gap-2.5">
        <AnimatePresence mode="popLayout">
          {filteredEnergisers.map((item) => {
            const isSelected = selectedId === item.id;
            const title = isId ? item.titleId : item.titleEn;
            const subtitle = isId ? item.subtitleId : item.subtitleEn;
            return (
              <motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                type="button"
                onClick={() => handleSelectActivity(item)}
                className={`w-full flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] ${
                  isSelected
                    ? "border-monk-rest bg-monk-rest-soft/60 shadow-sm ring-1 ring-monk-rest"
                    : "border-monk-border/60 bg-monk-surface hover:border-monk-rest/50 hover:bg-monk-soft/30"
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-monk-soft text-xl">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold ${isSelected ? "text-monk-rest font-extrabold" : "text-monk-text"}`}>
                      {title}
                    </p>
                    {isSelected && (
                      <span className="rounded-full bg-monk-rest/20 px-2 py-0.5 text-[10px] font-bold text-monk-rest">
                        {isId ? "Dipilih" : "Selected"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-monk-muted leading-relaxed line-clamp-2">
                    {subtitle}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Custom activity option */}
        <div className="mt-1">
          {isEditingCustom ? (
            <div className="rounded-2xl border border-monk-rest/50 bg-monk-surface p-3.5 space-y-2.5">
              <p className="text-xs font-bold text-monk-text">
                {isId ? "Aktivitas Istirahat Pilihanmu:" : "Your Chosen Rest Activity:"}
              </p>
              <input
                type="text"
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                placeholder={isId ? "Contoh: Baca buku di taman, bersepeda sore..." : "E.g. Read a book in the park, evening bike ride..."}
                className="w-full rounded-xl border border-monk-border bg-monk-soft px-3 py-2 text-xs text-monk-text placeholder:text-monk-muted focus:border-monk-rest focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <GhostButton className="text-xs py-1.5 px-3" onClick={() => setIsEditingCustom(false)}>
                  {isId ? "Batal" : "Cancel"}
                </GhostButton>
                <PrimaryButton className="text-xs py-1.5 px-4 w-auto" onClick={handleSaveCustom}>
                  {isId ? "Simpan" : "Save"}
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingCustom(true)}
              className="w-full text-center py-2 text-xs font-medium text-monk-muted hover:text-monk-rest transition"
            >
              {isId ? "+ Tulis aktivitas istirahat kustom sendiri" : "+ Write your own custom rest activity"}
            </button>
          )}
        </div>
      </div>

      {/* Direct Transition to Weekly Review */}
      <Card className="p-4 border-monk-accent/30 bg-monk-accent-soft/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-bold text-monk-text flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles size={14} className="text-monk-accent" />
            {isId ? "Siap untuk evaluasi mingguan?" : "Ready for weekly review?"}
          </p>
          <p className="mt-0.5 text-[11px] text-monk-muted">
            {isId
              ? "Tutup minggu dengan tenang: renungkan apa yang berhasil dan rencanakan prioritas berikutnya."
              : "Close the week with clarity: reflect on what worked and plan your next priorities."}
          </p>
        </div>
        <PrimaryButton
          onClick={onOpenWeeklyReview}
          className="text-xs py-2 px-4 w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5"
        >
          <span>{isId ? "Mulai Refleksi Mingguan" : "Start Weekly Review"}</span>
          <ArrowRight size={13} />
        </PrimaryButton>
      </Card>
    </div>
  );
}
