import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Moon, Heart, Coffee, Gamepad2, BatteryCharging, Check, ArrowRight } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { hapticPress } from "../lib/haptics";
import { Card, PrimaryButton, SecondaryButton, GhostButton, useCalmToast } from "./ui";
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
  title: string;
  subtitle: string;
  icon: string;
}

const ENERGISERS: RestActivity[] = [
  // 🎮 PLAY: Curiosity & Joy
  {
    id: "play_film",
    type: "play",
    title: "Tonton Film / Serial Favorit",
    subtitle: "Nikmati cerita tanpa rasa bersalah atau memikirkan kerjaan.",
    icon: "🎬"
  },
  {
    id: "play_music",
    type: "play",
    title: "Eksplorasi Musik / Podcast Santai",
    subtitle: "Dengarkan album favorit atau topik hobi dengan headphone yang nyaman.",
    icon: "🎧"
  },
  {
    id: "play_hobby",
    type: "play",
    title: "Hobi Kreatif / Gaming Ringan",
    subtitle: "Menggambar, merakit, menulis fiksi, atau main game santai.",
    icon: "🎮"
  },

  // 👥 PEOPLE: Connection & Warmth
  {
    id: "people_hangout",
    type: "people",
    title: "Ngopi / Makan Bareng Teman",
    subtitle: "Bertemu sahabat dekat untuk obrolan santai yang menghangatkan hati.",
    icon: "☕"
  },
  {
    id: "people_call",
    type: "people",
    title: "Telepon Orang Tua / Keluarga",
    subtitle: "Tanyakan kabar dan berbagi cerita tanpa terburu-buru waktu.",
    icon: "📞"
  },
  {
    id: "people_walk",
    type: "people",
    title: "Jalan Santai Berdua",
    subtitle: "Habiskan waktu bersama pasangan atau sahabat di ruang terbuka.",
    icon: "🌿"
  },

  // ⚡ POWER: Recharge & Autonomy
  {
    id: "power_nap",
    type: "power",
    title: "Tidur Siang / Rehat Total",
    subtitle: "Istirahatkan mata dan sistem saraf tanpa pasang alarm terburu-buru.",
    icon: "🛌"
  },
  {
    id: "power_walk",
    type: "power",
    title: "Silent Nature Walk",
    subtitle: "Jalan santai 30 menit di luar tanpa layar HP dan earphone.",
    icon: "🌲"
  },
  {
    id: "power_meal",
    type: "power",
    title: "Masak Santai & Santap Makanan Sehat",
    subtitle: "Nikmati proses menyiapkan makanan bergizi secara pelan-pelan.",
    icon: "🍲"
  }
];

export function FeelGoodRestCanvas({ onOpenWeeklyReview, className = "" }: FeelGoodRestCanvasProps) {
  const t = useT();
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
    store.createOrUpdateDayPlan(today, {
      dayType: "rest",
      mainAction: `rest:${act.id}`,
      highlight: act.title,
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
                <Check size={11} strokeWidth={2.5} /> Streak Terjaga
              </span>
            </div>
            <h3 className="mt-1.5 text-base font-bold text-monk-text tracking-tight">
              Pemulihan Sadar (Sharpen the Saw)
            </h3>
            <p className="mt-1 text-xs text-monk-muted leading-relaxed">
              Istirahat bukanlah hilangnya produktivitas, melainkan bahan bakar untuk performa minggu depan. Pilih aktivitas yang menyegarkan energimu hari ini.
            </p>
          </div>
        </div>

        {/* Energy Check-In Pill Row */}
        <div className="mt-4 pt-3.5 border-t border-monk-border/40 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-monk-muted/90 flex items-center gap-1.5">
            <BatteryCharging size={13} className="text-monk-accent" />
            Energi bateraimu saat ini:
          </span>
          <div className="flex items-center gap-1.5">
            {(
              [
                { lvl: "low", label: "Rendah", icon: "🪫", color: "hover:border-rose-400 text-rose-300" },
                { lvl: "medium", label: "Sedang", icon: "⚡", color: "hover:border-amber-400 text-amber-300" },
                { lvl: "high", label: "Penuh", icon: "🚀", color: "hover:border-emerald-400 text-emerald-300" }
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
            { id: "all", label: "Semua", icon: "✨" },
            { id: "play", label: "Play (Joy)", icon: "🎮" },
            { id: "people", label: "People (Koneksi)", icon: "👥" },
            { id: "power", label: "Power (Rejuvenasi)", icon: "⚡" }
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
                      {item.title}
                    </p>
                    {isSelected && (
                      <span className="rounded-full bg-monk-rest/20 px-2 py-0.5 text-[10px] font-bold text-monk-rest">
                        Dipilih
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-monk-muted leading-relaxed line-clamp-2">
                    {item.subtitle}
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
              <p className="text-xs font-bold text-monk-text">Aktivitas Istirahat Pilihanmu:</p>
              <input
                type="text"
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                placeholder="Contoh: Baca buku di taman, bersepeda sore..."
                className="w-full rounded-xl border border-monk-border bg-monk-soft px-3 py-2 text-xs text-monk-text placeholder:text-monk-muted focus:border-monk-rest focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <GhostButton className="text-xs py-1.5 px-3" onClick={() => setIsEditingCustom(false)}>
                  Batal
                </GhostButton>
                <PrimaryButton className="text-xs py-1.5 px-4 w-auto" onClick={handleSaveCustom}>
                  Simpan
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingCustom(true)}
              className="w-full text-center py-2 text-xs font-medium text-monk-muted hover:text-monk-rest transition"
            >
              + Tulis aktivitas istirahat kustom sendiri
            </button>
          )}
        </div>
      </div>

      {/* Direct Transition to Weekly Review */}
      <Card className="p-4 border-monk-accent/30 bg-monk-accent-soft/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-bold text-monk-text flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles size={14} className="text-monk-accent" />
            Siap untuk evaluasi mingguan?
          </p>
          <p className="mt-0.5 text-[11px] text-monk-muted">
            Tutup minggu dengan tenang: renungkan apa yang berhasil dan rencanakan prioritas berikutnya.
          </p>
        </div>
        <PrimaryButton
          onClick={onOpenWeeklyReview}
          className="text-xs py-2 px-4 w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5"
        >
          <span>Mulai Refleksi Mingguan</span>
          <ArrowRight size={13} />
        </PrimaryButton>
      </Card>
    </div>
  );
}
