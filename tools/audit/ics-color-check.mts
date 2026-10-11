import { generateIcsContent } from "../../src/lib/ical";
const blocks = [
  { id: "b1", title: "Merchandising Report", startTime: "09:00", endTime: "10:30", category: "deep_work" as const },
  { id: "b2", title: "Business Strategy", startTime: "10:45", endTime: "11:30", category: "learning" as const },
  { id: "b3", title: "Break", startTime: "11:30", endTime: "12:00", category: "rest" as const },
  { id: "b4", title: "Organize Files", startTime: "13:00", endTime: "13:30", category: "shallow" as const },
  { id: "b5", title: "Personal Errands", startTime: "16:00", endTime: "17:00", category: "personal" as const },
];
process.stdout.write(generateIcsContent("2026-10-11", blocks, "Zendo Season I"));
