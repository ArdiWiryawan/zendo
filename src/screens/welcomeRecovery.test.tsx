import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { WelcomeScreen } from "./WelcomeScreen";
import { t } from "../i18n";
import { useMonkStore } from "../store/useMonkStore";

// 2026-10-15 incident: this browser's storage was emptied while the user's
// season lived on in the cloud, and the only sign-in link in the app sat behind
// Settings — unreachable from the onboarding the gates now showed. The welcome
// screen must always offer both ways back: sign in, or restore a JSON backup.
//
// The copy is read through `t()` rather than pinned to English: the app
// defaults to Indonesian, and asserting literals here is what let the welcome
// screen stay the only hardcoded-English surface in the app.
describe("welcome recovery doors", () => {
  const lang = useMonkStore.getState().appSettings.language ?? "id";
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/onboarding/welcome"]}>
      <WelcomeScreen onNext={() => {}} />
    </MemoryRouter>
  );

  it("offers sign-in for people whose season exists in the cloud", () => {
    expect(html).toContain('href="/login"');
    expect(html).toContain(t(lang, "welcome.signIn"));
  });

  it("offers backup-file restore for people whose storage was cleared", () => {
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".json"');
    expect(html).toContain(t(lang, "welcome.restore"));
  });
});
