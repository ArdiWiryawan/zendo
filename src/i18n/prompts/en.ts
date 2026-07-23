import type { JournalAnswers } from "../../types/app";

export const promptsBig90Days = [
  "If the next 90 days go really well, what looks different in your life?",
  "Who do you want to become by the end of these 90 days?",
  "What three things do you most want to fix first?",
  "What is making your life feel stuck right now?",
  "What one decision, made today, would make your direction clearer?",
  "What have you been putting off, even though you know it matters?",
  "What habit or pattern do you need to stop so these 90 days can work?",
  "What small thing, done every day, would compound into something big?",
];

export const promptsFocusGoal = [
  "What one goal is most worth chasing for the next 90 days?",
  "Why does that goal matter to you right now?",
  "If you could only focus on one area of life, which needs you most?",
  "Which goal looks impressive but is mostly a distraction?",
  "Which goal, if reached, would make other things easier too?",
  "If nothing changed in 90 days, what would you regret most?",
  "What real proof shows you are serious — not just intending?",
];

export const promptsLifeAudit = [
  "Which habit is actually helping you move forward?",
  "Which habit is quietly working against you?",
  "What three activities are eating most of your time lately?",
  "When are you usually most focused, and what makes that possible?",
  "When do you scatter most easily, and what usually triggers it?",
  "What has been draining your mind lately?",
  "When did you last feel alive, energized, and clear on direction?",
];

export const promptsSystemDesign = [
  "What kind of morning helps you start the day ready?",
  "What kind of evening helps you close the day calmly?",
  "What simple system keeps you moving even when motivation is low?",
  "What around you needs to change so good habits get easier?",
  "What pulls your attention most, and how will you keep it away for 90 days?",
  "What personal rule would keep you from drifting?",
  "What simple sign means: today was enough?",
  "When you are tired, what is the minimum you still do?",
];

export const promptsIdentityDiscipline = [
  "In 90 days, what kind of person do you want to be known as?",
  "If your more disciplined self acted today, what would they do?",
  "What do you need to prove to yourself — not to anyone else?",
  "What small promise will you keep every day?",
  "What new standard do you want to hold yourself to?",
  "Which old habit no longer fits the person you want to become?",
  "If you truly cared about your future self, what would you do today?",
];

export const promptsWeeklyReview = [
  "What was the best thing you did this week?",
  "What did not go the way you hoped?",
  "What one lesson are you taking from this week?",
  "What scattered you most this week?",
  "What gave you energy this week?",
  "What should you cut back next week?",
  "What one small change would make next week better?",
  "Did this week's actions move you closer to your 90-day goal?",
];

export const promptsDailyJournal = [
  "What is actually on your mind right now?",
  "If only one good thing happened today, what was it?",
  "What did you avoid all day?",
  "When today did you feel most present?",
  "From today, what do you want to change tomorrow?",
  "What feels heavy — and what are you still grateful for?",
  "When today did you pause, even briefly?",
  "If you could relive one moment from today, which would you pick?",
  "What do you actually need right now?",
  "From today, what might you still remember a month from now?",
];

export const promptsClosing90Days = [
  "What is the biggest change in you after these 90 days?",
  "Which habit made the biggest difference?",
  "Which goals landed, and which are still open?",
  "What did you learn most about yourself?",
  "What turned out to matter less than you thought?",
  "What do you want to carry into the next 90 days?",
  "If you could tell your past self one thing from 90 days ago, what would it be?",
  "What do you want to build next?",
];

export const journalQuestionLabels: Record<keyof JournalAnswers, string> = {
  whatMovedToday: "What stood out most today?",
  whatDistractedMe: "What pulled your attention most today?",
  whatDidILearn: "What did you notice today that you didn't before?",
  whatShouldBeEasierTomorrow: "What felt heavier or more complicated than it needed to be?",
  whatShouldBeHarderTomorrow: "Where were you too loose or putting things off?",
  morningPages: "Morning pages",
};
