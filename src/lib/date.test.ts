import assert from "node:assert/strict";
import { addDaysToDate, getDayNumber, getDaysPassed } from "./date";

const startDate = "2026-06-28";

assert.equal(getDayNumber("2026-06-28", startDate), 1);
assert.equal(getDayNumber("2026-06-29", startDate), 2);
assert.equal(getDayNumber("2026-06-30", startDate), 3);
assert.equal(getDayNumber("2026-06-27", startDate), 0);

assert.equal(addDaysToDate(startDate, 1), "2026-06-29");
assert.equal(getDaysPassed(startDate, "2026-06-30"), 3);
