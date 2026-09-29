import {
  Footprints, BedDouble, Bath, Soup, Coffee, Brush, Sprout,
  MessageCircle, Dices, Trees, PenLine, Palette, Users,
  type LucideIcon
} from "lucide-react";

const REST_ICONS: Record<RestIconName, LucideIcon> = {
  Footprints,
  BedDouble,
  Bath,
  Soup,
  Coffee,
  Brush,
  Sprout,
  MessageCircle,
  Dices,
  Trees,
  PenLine,
  Palette,
  Users
};

/** Resolves a stored icon name to its lucide component. */
export function restIcon(name: string): LucideIcon {
  return REST_ICONS[name as RestIconName] ?? Trees;
}


export type RestActivityCategory = "physical" | "creative" | "social" | "solitude";

/**
 * Icons are lucide component names, resolved through `restIcon()`. They used to
 * be emoji; Zendo draws its iconography from lucide everywhere else, and emoji
 * render inconsistently across platforms and cannot inherit theme colour.
 */
export type RestIconName =
  | "Footprints"
  | "BedDouble"
  | "Bath"
  | "Soup"
  | "Coffee"
  | "Brush"
  | "Sprout"
  | "MessageCircle"
  | "Dices"
  | "Trees"
  | "PenLine"
  | "Palette"
  | "Users";

export interface RestActivityDef {
  id: string;
  category: RestActivityCategory;
  icon: RestIconName;
  title: {
    id: string;
    en: string;
  };
  description: {
    id: string;
    en: string;
  };
  /** Why this activity suits the depletion the questionnaire detected. */
  rationale: {
    id: string;
    en: string;
  };
  durationMin?: number;
}

export const REST_CATEGORIES: {
  id: RestActivityCategory;
  name: { id: string; en: string };
  icon: RestIconName;
}[] = [
  { id: "physical", name: { id: "Tubuh", en: "Physical" }, icon: "Footprints" },
  { id: "creative", name: { id: "Kreatif & Pikiran", en: "Creative" }, icon: "Palette" },
  { id: "social", name: { id: "Koneksi", en: "Social" }, icon: "Users" },
  { id: "solitude", name: { id: "Ketenangan & Alam", en: "Solitude" }, icon: "Trees" },
];

export const REST_ACTIVITIES: RestActivityDef[] = [
  {
    id: "silent_walk",
    category: "physical",
    icon: "Footprints",
    title: {
      id: "Jalan Kaki Hening (Silent Walk)",
      en: "Silent Nature Walk"
    },
    description: {
      id: "Jalan 30–45 menit di luar tanpa earphone atau distraksi layar.",
      en: "30–45 minute outdoor walk without headphones or phone screens."
    },
    rationale: {
      id: "Tubuh yang lelah paling cepat pulih lewat gerak ringan di luar, bukan rebahan.",
      en: "A tired body recovers fastest through light movement outdoors, not lying down."
    },
    durationMin: 35
  },
  {
    id: "deep_rest_nap",
    category: "physical",
    icon: "BedDouble",
    title: {
      id: "Tidur Siang / Ekstra Rehat",
      en: "Deep Rest Nap"
    },
    description: {
      id: "Rebahkan tubuh dan tidur tanpa alarm untuk memulihkan sistem saraf.",
      en: "Lie down and sleep without alarms to restore your nervous system."
    },
    rationale: {
      id: "Kurang tidur adalah utang yang tidak bisa dibayar dengan disiplin.",
      en: "Sleep debt cannot be repaid with discipline."
    },
    durationMin: 45
  },
  {
    id: "warm_reset",
    category: "physical",
    icon: "Bath",
    title: {
      id: "Peregangan & Mandi Hangat",
      en: "Warm Reset & Stretching"
    },
    description: {
      id: "Lepas ketegangan otot dengan stretching ringan atau air hangat.",
      en: "Release muscle tension with gentle stretching or a warm shower/bath."
    },
    rationale: {
      id: "Ketegangan fisik yang menumpuk menahan pikiran untuk ikut tenang.",
      en: "Accumulated physical tension keeps the mind from settling too."
    },
    durationMin: 25
  },
  {
    id: "unhurried_meal",
    category: "physical",
    icon: "Soup",
    title: {
      id: "Masak & Nikmati Makanan Pelan",
      en: "Unhurried Nourishing Meal"
    },
    description: {
      id: "Nikmati santapan sehat tanpa terburu-buru dan tanpa melihat HP.",
      en: "Savor a healthy, nourishing meal without rushing or watching screens."
    },
    rationale: {
      id: "Energi yang rendah sering hanya soal bahan bakar yang belum masuk.",
      en: "Low energy is often just fuel that has not gone in yet."
    },
    durationMin: 40
  },
  {
    id: "fiction_coffee",
    category: "creative",
    icon: "Coffee",
    title: {
      id: "Baca Buku Fiksi & Ngopi Santai",
      en: "Fiction & Slow Coffee"
    },
    description: {
      id: "Nikmati 1–2 bab buku non-pekerjaan di sudut kafe atau rumah yang tenang.",
      en: "Enjoy 1–2 chapters of non-work reading in a cozy, peaceful corner."
    },
    rationale: {
      id: "Perhatian yang habis kadang hanya butuh cerita, bukan istirahat total.",
      en: "An exhausted attention span sometimes just needs a story, not full rest."
    },
    durationMin: 45
  },
  {
    id: "free_doodling",
    category: "creative",
    icon: "Brush",
    title: {
      id: "Menggambar Bebas (Doodle / Sketch)",
      en: "Free Doodling / Sketch"
    },
    description: {
      id: "Goreskan warna atau gambar di canvas Zendo tanpa target atau penilaian.",
      en: "Expressive sketches or colors on Zendo canvas with zero goal or pressure."
    },
    rationale: {
      id: "Kejenuhan biasanya soal pekerjaan yang serba dinilai, bukan soal usaha.",
      en: "Burnout is usually about being constantly evaluated, not about effort."
    },
    durationMin: 30
  },
  {
    id: "environment_declutter",
    category: "creative",
    icon: "Sprout",
    title: {
      id: "Declutter Meja & Ruangan",
      en: "Gentle Space Declutter"
    },
    description: {
      id: "Rapikan meja kerja atau sudut kamar untuk menghadirkan ketenangan visual.",
      en: "Tidy up your desk or room corner to create soothing visual calm."
    },
    rationale: {
      id: "Pikiran yang penuh sering menenangkan diri lewat ruang yang beres.",
      en: "A crowded mind often settles through an ordered space."
    },
    durationMin: 20
  },
  {
    id: "meaningful_chat",
    category: "social",
    icon: "MessageCircle",
    title: {
      id: "Ngobrol Santai Tanpa Bahas Kerja",
      en: "Meaningful Catch-up"
    },
    description: {
      id: "Temui atau telepon sahabat/keluarga, bicarakan hal yang menghangatkan hati.",
      en: "Meet or call a friend or family member with zero work talk."
    },
    rationale: {
      id: "Hari yang sunyi menipiskan energi sosial; kehadiran orang lain mengisi itu.",
      en: "A quiet stretch drains social energy; another person refills it."
    },
    durationMin: 45
  },
  {
    id: "board_game_or_hobby",
    category: "social",
    icon: "Dices",
    title: {
      id: "Main Board Game / Waktu Bersama",
      en: "Casual Game / Shared Quality Time"
    },
    description: {
      id: "Tertawa dan bersantai bersama orang terdekat secara langsung di dunia nyata.",
      en: "Laugh and connect face-to-face over a game or simple shared activity."
    },
    rationale: {
      id: "Kebersamaan yang sungguh-sungguh memulihkan lebih dari istirahat sendirian.",
      en: "Real company restores more than resting alone does."
    },
    durationMin: 60
  },
  {
    id: "nature_immersion",
    category: "solitude",
    icon: "Trees",
    title: {
      id: "Duduk di Alam / Ruang Terbuka",
      en: "Nature Immersion"
    },
    description: {
      id: "Rasakan angin, pepohonan, atau langit terbuka untuk membersihkan perhatian.",
      en: "Sit in a park, garden, or under open sky to restore focused attention."
    },
    rationale: {
      id: "Kelelahan karena terlalu banyak masukan pulih lewat ruang yang sunyi.",
      en: "Exhaustion from too much input recovers through quiet space."
    },
    durationMin: 30
  },
  {
    id: "stream_journal",
    category: "solitude",
    icon: "PenLine",
    title: {
      id: "Jurnal Aliran Pikiran (Morning Pages)",
      en: "Stream of Consciousness Journal"
    },
    description: {
      id: "Tumpahkan isi kepala tanpa menyunting, menghapus, atau menghakimi.",
      en: "Dump whatever crosses your mind without editing or judging."
    },
    rationale: {
      id: "Pikiran yang berputar biasanya berhenti begitu dituliskan.",
      en: "A spinning mind usually stops once it is written down."
    },
    durationMin: 20
  }
];

