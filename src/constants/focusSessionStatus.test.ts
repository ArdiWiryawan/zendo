import assert from "node:assert/strict";
import { resolveFocusSessionStatus } from "./focusSessionStatus";

assert.equal(
  resolveFocusSessionStatus({
    mode: "deepWork",
    focusDurationSeconds: 100 * 60,
    breakDurationSeconds: 20 * 60,
    totalDurationSeconds: 120 * 60,
    segmentsCompleted: 4,
    status: "partial"
  }),
  "completed"
);

assert.equal(
  resolveFocusSessionStatus({
    mode: "pomodoro",
    focusDurationSeconds: 100 * 60,
    breakDurationSeconds: 20 * 60,
    totalDurationSeconds: 120 * 60,
    segmentsCompleted: 8,
    status: "partial"
  }),
  "completed"
);

assert.equal(
  resolveFocusSessionStatus({
    mode: "deepWork",
    focusDurationSeconds: 50 * 60,
    breakDurationSeconds: 10 * 60,
    totalDurationSeconds: 60 * 60,
    segmentsCompleted: 2
  }),
  "partial"
);

assert.equal(
  resolveFocusSessionStatus({
    mode: "deepWork",
    focusDurationSeconds: 100 * 60,
    totalDurationSeconds: 120 * 60,
    status: "partial"
  }),
  "completed"
);
