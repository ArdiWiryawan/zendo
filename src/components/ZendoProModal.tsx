import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Shield,
  Crown,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Download,
  MessageCircle,
  Heart,
  Coffee,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { PrimaryButton, SecondaryButton, GhostButton, useCalmToast, useModalA11y } from "./ui";
import { playZenBell } from "../lib/audio";
import { useLanguage, useT } from "../i18n";
import { DEFAULT_STATIC_QRIS } from "../lib/qris";

interface ZendoProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORT_TIERS = [
  {
    id: "coffee",
    amount: 15000,
    titleId: "Traktir Kopi",
    titleEn: "Coffee Tip",
    icon: Coffee,
    descId: "Secangkir kopi hangat penyemangat fokus berkarya",
    descEn: "A warm cup of coffee to fuel development",
  },
  {
    id: "tea",
    amount: 25000,
    titleId: "Teh Hijau Zen",
    titleEn: "Zen Green Tea",
    icon: Sparkles,
    descId: "Dukungan hening untuk ketenangan dan riset audio",
    descEn: "Quiet support for mindfulness and audio research",
    popular: true,
  },
  {
    id: "monk",
    amount: 50000,
    titleId: "Supporter Monk",
    titleEn: "Monk Supporter",
    icon: Heart,
    descId: "Membantu biaya server dan sinkronisasi cloud",
    descEn: "Helps cover cloud servers and sync",
  },
  {
    id: "patron",
    amount: 100000,
    titleId: "Patron Abadi",
    titleEn: "Lifetime Patron",
    icon: Crown,
    descId: "Dukungan penuh untuk visi kemandirian Zendo",
    descEn: "Full patron support for Zendo's vision",
  },
];

export function ZendoProModal({ isOpen, onClose }: ZendoProModalProps) {
  const store = useMonkStore();
  const toast = useCalmToast();
  const lang = useLanguage();
  const t = useT();
  const isId = lang === "id";

  const [selectedTier, setSelectedTier] = useState<string>("tea");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // Escape closes, Tab stays inside, focus returns to the opener on unmount.
  const cardRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open: isOpen, ref: cardRef, onClose });

  const currentAmount = isCustom
    ? Math.max(1000, parseInt(customAmount.replace(/[^0-9]/g, ""), 10) || 10000)
    : SUPPORT_TIERS.find((t) => t.id === selectedTier)?.amount || 25000;

  const currentTierTitle = isCustom
    ? t("pro.customAmount", { amount: currentAmount.toLocaleString("id-ID") })
    : (isId
        ? SUPPORT_TIERS.find((t) => t.id === selectedTier)?.titleId
        : SUPPORT_TIERS.find((t) => t.id === selectedTier)?.titleEn) || "Dukungan Zendo";

  const handleConfirmDonation = () => {
    playZenBell();
    toast.show(
      isId
        ? "Terima Kasih Banyak! Donasi dan dukungan Anda sangat berarti bagi pengembangan Zendo."
        : "Thank You So Much! Your tip and support directly empower Zendo's journey."
    );
    onClose();
  };

  const handleCopyQrisString = () => {
    navigator.clipboard.writeText(DEFAULT_STATIC_QRIS);
    toast.show(isId ? "String kode QRIS tersalin ke clipboard" : "QRIS code string copied to clipboard");
  };

  const handleDownloadQris = () => {
    const a = document.createElement("a");
    a.href = "/qris.jpeg";
    a.download = "QRIS-Zendo-Ardi-Wiryawan.jpeg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.show(isId ? "Poster QRIS berhasil diunduh ke galeri" : "QRIS image downloaded to gallery");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          ref={cardRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="zendo-support-title"
          className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto rounded-monk-lg border border-monk-accent/35 bg-monk-surface p-5 sm:p-6 shadow-2xl my-auto text-monk-text space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Warm Radial Aura */}
          <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-monk-warning/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full bg-monk-warning/10 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-monk-muted hover:text-monk-text hover:bg-monk-soft transition active:scale-90"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="text-center pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-monk-warning/30 bg-monk-warning/10 text-monk-warning text-xs font-bold uppercase tracking-wider mb-2 shadow-xs">
              <Heart size={13} className="fill-monk-warning/20 text-monk-warning" />
              {isId ? "Dukungan & Donasi Sukarela" : "Voluntary Tips & Support"}
            </span>
            <h2 id="zendo-support-title" className="text-xl sm:text-2xl font-serif font-bold text-monk-text tracking-tight">
              {isId ? "Dukung Pengembangan Zendo" : "Support Zendo Creator"}
            </h2>
            <p className="mt-1 text-xs text-monk-muted max-w-md mx-auto leading-relaxed">
              {isId
                ? "Seluruh fitur Zendo gratis & bebas iklan. Jika Zendo membantu fokus Anda, dukung kelanjutan pengembangannya melalui QRIS resmi."
                : "All features in Zendo are 100% free. If Zendo helps your focus, you can support development via official QRIS."}
            </p>
          </div>

          {/* Official Verified QRIS Poster Card */}
          <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/40 p-3 sm:p-4 text-center space-y-3">
            {/* Merchant Badge */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-left">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-monk-success/15 text-monk-success">
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-monk-text">ARDI WIRYAWAN, DIGITAL & KREATIF</p>
                  <p className="text-[10px] text-monk-muted font-mono">NMID: ID1026507210023 · A01</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-monk-success border border-monk-success/30 bg-monk-success/10 px-2 py-0.5 rounded-full">
                QRIS Resmi
              </span>
            </div>

            {/* High-Resolution QRIS Image Frame */}
            <div className="relative mx-auto w-full max-w-[280px] rounded-2xl bg-white p-2.5 shadow-lg border border-gray-200 overflow-hidden group">
              <img
                src="/qris.jpeg"
                alt="QRIS Resmi Ardi Wiryawan - Zendo"
                className="w-full h-auto object-contain rounded-xl select-none"
              />
            </div>

            {/* Quick Action Buttons for QRIS Image */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQris}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-monk-border bg-monk-surface text-xs font-semibold text-monk-text hover:bg-monk-soft transition active:scale-95 shadow-xs"
              >
                <Download size={13} className="text-monk-accent" />
                <span>{isId ? "Simpan ke Galeri HP" : "Save to Gallery"}</span>
              </button>
              <a
                href="/qris.jpeg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-monk-border bg-monk-surface text-xs font-semibold text-monk-muted hover:text-monk-text transition shadow-xs"
              >
                <ExternalLink size={13} />
                <span>{isId ? "Buka Penuh" : "Open Full"}</span>
              </a>
              <button
                type="button"
                onClick={handleCopyQrisString}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-monk-border bg-monk-surface text-xs font-semibold text-monk-muted hover:text-monk-text transition shadow-xs"
              >
                <Copy size={13} />
                <span>{isId ? "Salin Kode" : "Copy Code"}</span>
              </button>
            </div>
          </div>

          {/* Donation Amount Preset Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-monk-text">
                {isId ? "Pilih Nominal Dukungan / Tip:" : "Select Support Amount:"}
              </p>
              <span className="text-xs font-mono font-bold text-monk-warning">
                Rp {currentAmount.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUPPORT_TIERS.map((tier) => {
                const Icon = tier.icon;
                const isSelected = !isCustom && selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setSelectedTier(tier.id);
                      setIsCustom(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "border-monk-accent bg-monk-accent-soft/40 ring-1 ring-monk-accent shadow-xs"
                        : "border-monk-border/60 bg-monk-soft/30 hover:border-monk-border-strong hover:bg-monk-soft"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon size={13} className="text-monk-accent shrink-0" />
                      <span className="text-xs font-bold text-monk-text truncate">
                        {isId ? tier.titleId : tier.titleEn}
                      </span>
                    </div>
                    <p className="text-xs font-bold font-mono text-monk-accent mt-1.5">
                      Rp {tier.amount.toLocaleString("id-ID")}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Button/Input */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`w-full p-2.5 rounded-xl border text-left transition ${
                  isCustom
                    ? "border-monk-accent bg-monk-accent-soft/40 ring-1 ring-monk-accent shadow-xs"
                    : "border-monk-border/60 bg-monk-soft/30 hover:border-monk-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-monk-text">
                    {isId ? "Masukkan Nominal Kustom" : "Custom Amount"}
                  </span>
                  <span className="text-[10px] text-monk-muted">
                    {isId ? "Min. Rp 1.000" : "Min. Rp 1,000"}
                  </span>
                </div>
                {isCustom && (
                  <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-bold text-monk-accent font-mono">Rp</span>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Contoh: 30000"
                      className="flex-1 rounded-lg border border-monk-border bg-monk-surface px-3 py-1 text-xs font-mono text-monk-text focus:border-monk-accent focus:outline-none"
                      autoFocus
                    />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Simple How to Pay Instructions */}
          <div className="rounded-xl bg-monk-soft/30 border border-monk-border/40 p-3 text-[11px] text-monk-muted space-y-1">
            <p className="font-semibold text-monk-text">
              {isId ? "Cara Pembayaran / Donasi:" : "How to Tip:"}
            </p>
            <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
              <li>{isId ? "Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI, dll) atau e-Wallet (GoPay, OVO, ShopeePay, Dana)." : "Open any bank app or e-wallet (BCA, Mandiri, GoPay, OVO, Dana, etc.)."}</li>
              <li>{isId ? "Scan QRIS di atas (atau gunakan fitur Scan dari Galeri jika membuka di HP yang sama)." : "Scan the QRIS code above (or scan from gallery if using same device)."}</li>
              <li>{isId ? `Masukkan nominal donasi: Rp ${currentAmount.toLocaleString("id-ID")}.` : `Enter the tip amount: Rp ${currentAmount.toLocaleString("id-ID")}.`}</li>
            </ol>
          </div>

          {/* Footer Action Buttons */}
          <div className="space-y-2 pt-1">
            <PrimaryButton
              className="w-full !py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98]"
              onClick={handleConfirmDonation}
            >
              <CheckCircle2 size={15} />
              <span>{isId ? "Saya Sudah Donasi (Terima Kasih!)" : "I Have Donated (Thank You!)"}</span>
            </PrimaryButton>

            <a
              href="https://ngl.link/ardiwiryawann"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-2xl border border-monk-success/30 bg-monk-success/10 text-monk-success hover:bg-monk-success/20 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <MessageCircle size={14} />
              <span>{isId ? "Kirim Pesan / Konfirmasi ke Mas Ardi" : "Send Note to Creator"}</span>
              <ExternalLink size={12} className="opacity-60" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

