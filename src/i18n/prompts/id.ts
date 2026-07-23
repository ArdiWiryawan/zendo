import type { JournalAnswers } from "../../types/app";

export const promptsBig90Days = [
  "Kalau 90 hari ke depan berjalan bagus, apa yang beda di hidupmu?",
  "Kamu ingin jadi orang yang seperti apa di akhir 90 hari ini?",
  "Tiga hal apa yang paling ingin kamu benahi dulu?",
  "Apa yang bikin hidupmu terasa mandek sekarang?",
  "Satu keputusan apa yang, kalau diambil hari ini, bikin arahmu lebih jelas?",
  "Apa yang sudah lama kamu tunda, padahal kamu tahu itu penting?",
  "Kebiasaan atau pola mana yang perlu kamu hentikan supaya 90 hari ini jalan?",
  "Hal kecil apa yang, kalau dikerjakan tiap hari, dampaknya besar nanti?",
];

export const promptsFocusGoal = [
  "Satu tujuan apa yang paling layak kamu kejar 90 hari ke depan?",
  "Kenapa tujuan itu penting buatmu sekarang?",
  "Kalau cuma boleh pilih satu area hidup, mana yang paling butuh perhatian?",
  "Tujuan mana yang kelihatannya keren, tapi sebenarnya cuma mengalihkanmu?",
  "Tujuan mana yang, kalau berhasil, bikin urusan lain ikut lebih gampang?",
  "Kalau 90 hari lagi kamu masih di tempat yang sama, apa yang paling kamu sesali?",
  "Bukti nyata apa yang nunjukin kamu serius — bukan cuma niat?",
];

export const promptsLifeAudit = [
  "Kebiasaan mana yang lagi bantu kamu maju?",
  "Kebiasaan mana yang diam-diam ngerusakmu?",
  "Tiga aktivitas apa yang paling banyak nyedot waktumu minggu-minggu ini?",
  "Kapan biasanya kamu paling fokus, dan apa yang bikin begitu?",
  "Kapan kamu paling gampang buyar, dan biasanya pemicunya apa?",
  "Apa yang belakangan bikin kepalamu lelah?",
  "Kapan terakhir kamu merasa hidup, semangat, dan punya arah?",
];

export const promptsSystemDesign = [
  "Pagi seperti apa yang bikin kamu siap mulai hari?",
  "Malam seperti apa yang bantu kamu menutup hari dengan tenang?",
  "Cara sederhana apa yang bikin kamu tetap jalan, meski lagi males?",
  "Apa di sekitarmu yang perlu diubah biar kebiasaan baik lebih gampang?",
  "Hal apa yang paling sering bikin kamu buyar, dan bagaimana menjauhkannya 90 hari ini?",
  "Aturan pribadi apa yang perlu kamu pegang biar nggak gampang goyah?",
  "Tanda sederhana apa yang bilang: hari ini sudah cukup?",
  "Saat capek, hal minimum apa yang tetap kamu kerjakan?",
];

export const promptsIdentityDiscipline = [
  "Dalam 90 hari ke depan, kamu ingin dikenal sebagai orang yang seperti apa?",
  "Kalau dirimu yang lebih disiplin yang bertindak hari ini, apa yang dia lakukan?",
  "Apa yang perlu kamu buktikan ke dirimu sendiri — bukan ke orang lain?",
  "Janji kecil apa yang kamu tepati tiap hari?",
  "Standar baru apa yang ingin kamu pegang buat dirimu?",
  "Kebiasaan lama mana yang sudah nggak cocok sama orang yang ingin kamu jadi?",
  "Kalau kamu benar-benar peduli sama masa depanmu, apa yang kamu lakukan hari ini?",
];

export const promptsWeeklyReview = [
  "Hal terbaik yang kamu kerjakan minggu ini apa?",
  "Apa yang nggak jalan seperti yang kamu harapkan?",
  "Satu pelajaran apa yang kamu bawa dari minggu ini?",
  "Apa yang paling sering bikin kamu buyar minggu ini?",
  "Apa yang memberimu energi minggu ini?",
  "Apa yang perlu kamu kurangi minggu depan?",
  "Satu perubahan kecil apa yang bikin minggu depan lebih baik?",
  "Apakah langkahmu minggu ini mendekatkanmu ke tujuan 90 hari?",
];

export const promptsDailyJournal = [
  "Apa yang sebenarnya ada di kepalamu sekarang?",
  "Kalau hari ini cuma ada satu hal yang bagus, apa itu?",
  "Apa yang kamu hindari seharian ini?",
  "Kapan hari ini kamu merasa paling hadir?",
  "Dari hari ini, apa yang mau kamu ubah besok?",
  "Apa yang lagi berat — dan apa yang masih kamu syukuri?",
  "Kapan hari ini kamu berhenti sejenak, meski cuma sebentar?",
  "Kalau bisa mengulang satu momen hari ini, mana yang kamu pilih?",
  "Apa yang sebenarnya kamu butuhkan sekarang?",
  "Dari hari ini, apa yang kemungkinan masih kamu ingat sebulan lagi?",
];

export const promptsClosing90Days = [
  "Perubahan terbesar dalam dirimu setelah 90 hari ini apa?",
  "Kebiasaan mana yang paling terasa dampaknya?",
  "Tujuan mana yang tercapai, dan mana yang masih menggantung?",
  "Apa yang paling kamu pelajari tentang dirimu?",
  "Apa yang ternyata nggak sepenting yang kamu kira?",
  "Apa yang ingin kamu bawa ke 90 hari berikutnya?",
  "Kalau bisa bilang sesuatu ke dirimu 90 hari yang lalu, apa itu?",
  "Sekarang, apa yang ingin kamu bangun selanjutnya?",
];

export const journalQuestionLabels: Record<keyof JournalAnswers, string> = {
  whatMovedToday: "Apa yang paling berkesan dari hari ini?",
  whatDistractedMe: "Apa yang paling sering bikin kamu buyar hari ini?",
  whatDidILearn: "Apa yang baru kamu sadari hari ini?",
  whatShouldBeEasierTomorrow: "Apa yang terasa terlalu ribet atau berat hari ini?",
  whatShouldBeHarderTomorrow: "Di mana kamu terlalu longgar atau menunda hari ini?",
  morningPages: "Tulisan pagi",
};
