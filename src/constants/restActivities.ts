export type RestActivityCategory = "physical" | "creative" | "social" | "solitude";

export interface RestActivityDef {
  id: string;
  category: RestActivityCategory;
  icon: string;
  title: {
    id: string;
    en: string;
  };
  description: {
    id: string;
    en: string;
  };
  durationMin?: number;
}

export const REST_CATEGORIES: {
  id: RestActivityCategory;
  name: { id: string; en: string };
  icon: string;
}[] = [
  { id: "physical", name: { id: "Tubuh", en: "Physical" }, icon: "🏃" },
  { id: "creative", name: { id: "Kreatif & Pikiran", en: "Creative" }, icon: "🎨" },
  { id: "social", name: { id: "Koneksi", en: "Social" }, icon: "💬" },
  { id: "solitude", name: { id: "Ketenangan & Alam", en: "Solitude" }, icon: "🌲" },
];

export const REST_ACTIVITIES: RestActivityDef[] = [
  {
    id: "silent_walk",
    category: "physical",
    icon: "🚶",
    title: {
      id: "Jalan Kaki Hening (Silent Walk)",
      en: "Silent Nature Walk"
    },
    description: {
      id: "Jalan 30–45 menit di luar tanpa earphone atau distraksi layar.",
      en: "30–45 minute outdoor walk without headphones or phone screens."
    },
    durationMin: 35
  },
  {
    id: "deep_rest_nap",
    category: "physical",
    icon: "🛌",
    title: {
      id: "Tidur Siang / Ekstra Rehat",
      en: "Deep Rest Nap"
    },
    description: {
      id: "Rebahkan tubuh dan tidur tanpa alarm untuk memulihkan sistem saraf.",
      en: "Lie down and sleep without alarms to restore your nervous system."
    },
    durationMin: 45
  },
  {
    id: "warm_reset",
    category: "physical",
    icon: "🛁",
    title: {
      id: "Peregangan & Mandi Hangat",
      en: "Warm Reset & Stretching"
    },
    description: {
      id: "Lepas ketegangan otot dengan stretching ringan atau air hangat.",
      en: "Release muscle tension with gentle stretching or a warm shower/bath."
    },
    durationMin: 25
  },
  {
    id: "unhurried_meal",
    category: "physical",
    icon: "🍲",
    title: {
      id: "Masak & Nikmati Makanan Pelan",
      en: "Unhurried Nourishing Meal"
    },
    description: {
      id: "Nikmati santapan sehat tanpa terburu-buru dan tanpa melihat HP.",
      en: "Savor a healthy, nourishing meal without rushing or watching screens."
    },
    durationMin: 40
  },
  {
    id: "fiction_coffee",
    category: "creative",
    icon: "☕",
    title: {
      id: "Baca Buku Fiksi & Ngopi Santai",
      en: "Fiction & Slow Coffee"
    },
    description: {
      id: "Nikmati 1–2 bab buku non-pekerjaan di sudut kafe atau rumah yang tenang.",
      en: "Enjoy 1–2 chapters of non-work reading in a cozy, peaceful corner."
    },
    durationMin: 45
  },
  {
    id: "free_doodling",
    category: "creative",
    icon: "🎨",
    title: {
      id: "Menggambar Bebas (Doodle / Sketch)",
      en: "Free Doodling / Sketch"
    },
    description: {
      id: "Goreskan warna atau gambar di canvas Zendo tanpa target atau penilaian.",
      en: "Expressive sketches or colors on Zendo canvas with zero goal or pressure."
    },
    durationMin: 30
  },
  {
    id: "environment_declutter",
    category: "creative",
    icon: "🪴",
    title: {
      id: "Declutter Meja & Ruangan",
      en: "Gentle Space Declutter"
    },
    description: {
      id: "Rapikan meja kerja atau sudut kamar untuk menghadirkan ketenangan visual.",
      en: "Tidy up your desk or room corner to create soothing visual calm."
    },
    durationMin: 20
  },
  {
    id: "meaningful_chat",
    category: "social",
    icon: "💬",
    title: {
      id: "Ngobrol Santai Tanpa Bahas Kerja",
      en: "Meaningful Catch-up"
    },
    description: {
      id: "Temui atau telepon sahabat/keluarga, bicarakan hal yang menghangatkan hati.",
      en: "Meet or call a friend or family member with zero work talk."
    },
    durationMin: 45
  },
  {
    id: "board_game_or_hobby",
    category: "social",
    icon: "🎲",
    title: {
      id: "Main Board Game / Waktu Bersama",
      en: "Casual Game / Shared Quality Time"
    },
    description: {
      id: "Tertawa dan bersantai bersama orang terdekat secara langsung di dunia nyata.",
      en: "Laugh and connect face-to-face over a game or simple shared activity."
    },
    durationMin: 60
  },
  {
    id: "nature_immersion",
    category: "solitude",
    icon: "🌲",
    title: {
      id: "Duduk di Alam / Ruang Terbuka",
      en: "Nature Immersion"
    },
    description: {
      id: "Rasakan angin, pepohonan, atau langit terbuka untuk membersihkan perhatian.",
      en: "Sit in a park, garden, or under open sky to restore focused attention."
    },
    durationMin: 30
  },
  {
    id: "stream_journal",
    category: "solitude",
    icon: "✍️",
    title: {
      id: "Jurnal Aliran Pikiran (Morning Pages)",
      en: "Stream of Consciousness Journal"
    },
    description: {
      id: "Tumpahkan isi kepala tanpa menyunting, menghapus, atau menghakimi.",
      en: "Dump whatever crosses your mind without editing or judging."
    },
    durationMin: 20
  }
];
