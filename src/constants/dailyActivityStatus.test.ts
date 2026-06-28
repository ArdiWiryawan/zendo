import assert from "node:assert/strict";
import { getDailyStatusHelper, resolveDailyActivityStatus } from "./dailyActivityStatus";

assert.equal(
  resolveDailyActivityStatus({ focusSessions: [], learningSessions: [] }),
  "not_started"
);

assert.equal(
  resolveDailyActivityStatus({ focusSessions: [{ id: "focus-1" }], learningSessions: [] }),
  "partial"
);

assert.equal(
  resolveDailyActivityStatus({ focusSessions: [], learningSessions: [{ id: "learning-1" }] }),
  "partial"
);

assert.equal(
  resolveDailyActivityStatus({
    focusSessions: [{ id: "focus-1" }],
    learningSessions: [{ id: "learning-1" }]
  }),
  "completed"
);

assert.equal(
  resolveDailyActivityStatus({ focusSessions: [], learningSessions: [] }),
  "not_started"
);

assert.equal(
  getDailyStatusHelper({ focusSessions: [{ id: "focus-1" }], learningSessions: [] }),
  "Focus done · Learning not yet"
);
