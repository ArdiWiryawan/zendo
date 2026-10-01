export interface GoalBlueprintTemplate {
  id: string;
  category: string;
  title: string;
  why: string;
  keystoneAction: string;
  weeklyTargetCount: number;
  obstacleMitigation: string;
}

export const GOAL_TEMPLATES: Record<"id" | "en", GoalBlueprintTemplate[]> = {
  id: [
    {
      id: "content_creator",
      category: "Content Creator & Brand (Ali Abdaal)",
      title: "Rilis 12 Konten Edukasi & Validasi Niche Audiens",
      why: "Saya adalah Creator yang konsisten mendistribusikan ide berharga tanpa terjebak perfeksionisme over-editing.",
      keystoneAction: "30 menit tulis 1 Hook tajam & kerangka 3 poin inti (Outline Bullet) atau rekam 1 take",
      weeklyTargetCount: 4,
      obstacleMitigation: "Buka catatan HP, tulis 1 pertanyaan audiens & 1 kalimat hook pembuka"
    },
    {
      id: "solopreneur_business",
      category: "Bisnis & Solopreneur (Pareto 80/20)",
      title: "Dapatkan 3 Klien Berbayar Pertama & Validasi Penawaran Produk",
      why: "Saya adalah Solopreneur yang berani menawarkan solusi nyata dan fokus berbicara langsung dengan calon pembeli.",
      keystoneAction: "45 menit kirim pesan penawaran / DM personal ke 3 prospek nyata",
      weeklyTargetCount: 4,
      obstacleMitigation: "Follow-up 1 percakapan prospek atau catat 1 kontak potensial baru"
    },
    {
      id: "tech_builder",
      category: "Tech Builder (Ship-Fast MVP)",
      title: "Selesaikan & Launch Alur Utama MVP ke 10 Pengguna Aktif",
      why: "Saya adalah Software Builder yang mengukur kemajuan dari fitur yang live di tangan pengguna, bukan over-engineering.",
      keystoneAction: "45 menit deep work coding 1 alur utama fitur pengguna (Happy Path)",
      weeklyTargetCount: 5,
      obstacleMitigation: "Buka IDE & tulis 1 unit test atau perbaiki 1 bug kecil"
    },
    {
      id: "writer_thought_leader",
      category: "Penulis & Thought Leader (Raw Draft)",
      title: "Terbitkan 12 Artikel / Selesaikan 30.000 Kata Draf Kasar",
      why: "Saya adalah Penulis yang mendahulukan volume draf ketimbang ilusi kesempurnaan kata.",
      keystoneAction: "30 menit menulis 250 kata draf kasar tanpa backspace / tanpa editing",
      weeklyTargetCount: 4,
      obstacleMitigation: "Tulis 1 ide pokok & 2 kalimat analogi di catatan HP"
    },
    {
      id: "deep_learning",
      category: "Skill Mastery (Active Recall & Feynman)",
      title: "Kuasai 1 Skill Kritis & Bangun 1 Proyek Portofolio Riil",
      why: "Saya adalah Pembelajar Aktif yang menguji pemahaman lewat praktek nyata, bukan konsumsi video pasif.",
      keystoneAction: "35 menit praktek mandiri studi kasus / uji active recall tanpa melihat contekan",
      weeklyTargetCount: 4,
      obstacleMitigation: "Jelaskan 1 konsep sulit dalam 2 kalimat bahasa anak SD (Feynman Technique)"
    },
    {
      id: "health_energy",
      category: "Stamina & Energi Fisik (Minimum Effective Dose)",
      title: "Bangun Stamina Prima Harian & Pikiran Bebas Brain Fog",
      why: "Saya adalah pribadi berenergi tinggi yang merawat tubuh sebagai fondasi fokus produktivitas terbaik.",
      keystoneAction: "30 menit latihan beban terfokus atau jalan cepat 6.000 langkah",
      weeklyTargetCount: 4,
      obstacleMitigation: "Lakukan 10x push-up & minum 1 gelas air putih dingin"
    }
  ],
  en: [
    {
      id: "content_creator",
      category: "Content Creator & Brand (Ali Abdaal)",
      title: "Publish 12 Educational Pieces & Validate Core Niche",
      why: "I am a consistent Creator who distributes valuable ideas without falling into the over-editing trap.",
      keystoneAction: "30 min drafting 1 killer Hook & 3 bullet outline or recording 1 raw take",
      weeklyTargetCount: 4,
      obstacleMitigation: "Open notes app & write 1 audience question + 1 opening hook sentence"
    },
    {
      id: "solopreneur_business",
      category: "Business & Solopreneur (Pareto 80/20)",
      title: "Close 3 Paying Clients & Validate Flagship Offer",
      why: "I am an action-oriented Solopreneur focused on real customer conversations and direct value delivery.",
      keystoneAction: "45 min personalized outreach / direct pitches to 3 ideal prospects",
      weeklyTargetCount: 4,
      obstacleMitigation: "Follow up on 1 ongoing prospect conversation or note 1 lead profile"
    },
    {
      id: "tech_builder",
      category: "Tech Builder (Ship-Fast MVP)",
      title: "Complete & Launch Core User Flow to 10 Live Users",
      why: "I am a Software Builder who measures progress by working features shipped to users, not over-architecture.",
      keystoneAction: "45 min deep work sprint coding the primary user happy path",
      weeklyTargetCount: 5,
      obstacleMitigation: "Open IDE & write 1 test or fix 1 tiny UI glitch"
    },
    {
      id: "writer_thought_leader",
      category: "Writing & Thought Leadership (Raw Draft)",
      title: "Publish 12 Articles / Complete 30,000-Word Raw Draft",
      why: "I am a dedicated Writer who prioritizes raw draft volume over the illusion of perfection.",
      keystoneAction: "30 min focused writing targeting 250 raw words with zero backspace/editing",
      weeklyTargetCount: 4,
      obstacleMitigation: "Write 1 core premise & 2 analogy sentences in notes"
    },
    {
      id: "deep_learning",
      category: "Skill Mastery (Active Recall & Feynman)",
      title: "Master 1 Core Competency & Build 1 Portfolio Piece",
      why: "I am an Active Learner who validates knowledge through hands-on creation, not passive watching.",
      keystoneAction: "35 min deliberate practice on a real problem without looking at notes",
      weeklyTargetCount: 4,
      obstacleMitigation: "Explain 1 difficult concept in 2 simple sentences (Feynman Technique)"
    },
    {
      id: "health_energy",
      category: "Vitality & Peak Energy (Minimum Effective Dose)",
      title: "Build Peak Daily Stamina & Clear Mind Free of Brain Fog",
      why: "I am a high-energy individual who values physical vitality as the foundation of deep focus.",
      keystoneAction: "30 min focused resistance training or 6,000 brisk steps",
      weeklyTargetCount: 4,
      obstacleMitigation: "Do 10 push-ups & drink 1 glass of cold water"
    }
  ]
};
