import {
  addDays,
  differenceInCalendarDays,
  format,
  isAfter,
} from "date-fns";
import type { Season } from "../types/app";

export function getTodayDateString(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function parseLocalDateKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDaysToDate(date: string, days: number) {
  return format(addDays(parseLocalDateKey(date), days), "yyyy-MM-dd");
}

export function getDaysPassed(startDate: string, today = getTodayDateString()) {
  return Math.max(1, differenceInCalendarDays(parseLocalDateKey(today), parseLocalDateKey(startDate)) + 1);
}

export function getDaysLeft(endDate: string, today = getTodayDateString()) {
  return Math.max(0, differenceInCalendarDays(parseLocalDateKey(endDate), parseLocalDateKey(today)));
}

export function getSeasonProgress(season: Season, today = getTodayDateString()) {
  const daysPassed = Math.min(season.durationDays, getDaysPassed(season.startDate, today));
  return Math.max(0, Math.min(100, (daysPassed / season.durationDays) * 100));
}

export function getCurrentWeekNumber(startDate: string, today = getTodayDateString()) {
  return Math.max(1, Math.ceil(getDaysPassed(startDate, today) / 7));
}

export function getWeekStartDate(startDate: string, weekNumber: number) {
  return addDaysToDate(startDate, (weekNumber - 1) * 7);
}

export function getWeekEndDate(startDate: string, weekNumber: number) {
  return addDaysToDate(getWeekStartDate(startDate, weekNumber), 6);
}

export function isDatePast(date: string, today = getTodayDateString()) {
  return isAfter(parseLocalDateKey(today), parseLocalDateKey(date));
}

export function isSeasonEnded(season: Season, today = getTodayDateString()) {
  return isDatePast(season.endDate, today) || season.status === "ended";
}

export function getSeasonDayLabel(season: Season, today = getTodayDateString()) {
  const day = Math.min(season.durationDays, getDaysPassed(season.startDate, today));
  return `Day ${day} of ${season.durationDays}`;
}

export function getDayNumber(date: string, startDate: string) {
  return differenceInCalendarDays(parseLocalDateKey(date), parseLocalDateKey(startDate)) + 1;
}

export function formatHumanDate(date: string) {
  return format(parseLocalDateKey(date), "MMM d");
}

export function datesInRange(startDate: string, count: number) {
  return Array.from({ length: count }, (_, index) => addDaysToDate(startDate, index));
}
