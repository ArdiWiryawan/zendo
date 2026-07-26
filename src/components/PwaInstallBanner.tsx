import { useEffect, useState } from "react";
import { useT } from "../i18n";
import {
  canShowInstallBanner,
  dismissInstall,
  initPwaInstallCapture,
  promptInstall,
  subscribeInstallPrompt,
} from "../lib/pwaInstall";
import { GhostButton, PrimaryButton } from "./ui";

export default function PwaInstallBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stopCapture = initPwaInstallCapture();
    const sync = () => setVisible(canShowInstallBanner());
    sync();
    const unsub = subscribeInstallPrompt(sync);
    return () => {
      stopCapture();
      unsub();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("pwa.installTitle")}
      className="fixed inset-x-0 z-40 mx-auto max-w-[430px] px-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
    >
      <div className="rounded-monk border border-monk-border bg-monk-surface p-4 shadow-soft">
        <p className="text-sm font-semibold text-monk-text">{t("pwa.installTitle")}</p>
        <p className="mt-1 text-sm text-monk-muted">{t("pwa.installBody")}</p>
        <div className="mt-3 flex items-center gap-2">
          <PrimaryButton
            type="button"
            className="min-h-11 flex-1 text-sm"
            onClick={async () => {
              await promptInstall();
              setVisible(false);
            }}
          >
            {t("pwa.installCta")}
          </PrimaryButton>
          <GhostButton
            type="button"
            onClick={() => {
              dismissInstall();
              setVisible(false);
            }}
          >
            {t("pwa.dismiss")}
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
