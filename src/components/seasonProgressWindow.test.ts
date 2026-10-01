import { describe, expect, it } from "vitest";
import { formatSeasonWindow } from "./SeasonWidgets";

/**
 * The season card's time line used to read "N hari lagi" — ambiguous between
 * elapsed and remaining — and the bar had no numeric readout, so 2% and 0% were
 * indistinguishable. These pin the unambiguous `elapsed/total · close date`
 * string and the guard rails around a season whose dates are degenerate.
 */
const season = (startDate: string, endDate: string, durationDays: number) => ({
  startDate,
  endDate,
  durationDays,
});

describe("season window string", () => {
  it("shows elapsed of total plus the close date, mid-season", () => {
    expect(formatSeasonWindow(season("2026-09-01", "2026-10-30", 60), "en-US", "2026-09-05")).toBe(
      "5/60 · Oct 30"
    );
  });

  it("pins elapsed at the total once the season is over", () => {
    expect(formatSeasonWindow(season("2026-09-01", "2026-10-30", 60), "en-US", "2026-12-01")).toBe(
      "60/60 · Oct 30"
    );
  });

  it("reads 0 elapsed for a season that has not started", () => {
    expect(formatSeasonWindow(season("2026-09-10", "2026-11-08", 60), "en-US", "2026-09-01")).toBe(
      "0/60 · Nov 8"
    );
  });

  it("keeps a season that crosses the year boundary on its real close month", () => {
    expect(formatSeasonWindow(season("2026-12-01", "2027-01-29", 60), "en-US", "2026-12-31")).toBe(
      "31/60 · Jan 29"
    );
  });

  it("falls back to the close date alone when the duration is unusable", () => {
    expect(formatSeasonWindow(season("2026-09-01", "2026-10-30", 0), "en-US", "2026-09-05")).toBe("Oct 30");
    expect(formatSeasonWindow(season("2026-09-01", "2026-10-30", NaN), "en-US", "2026-09-05")).toBe("Oct 30");
  });
});
