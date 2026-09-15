export interface TimeRange {
  start: string;
  end: string;
}

export interface DaySchedule {
  day: string;
  hours: TimeRange;
  _id?: { $oid: string };
}

/** Legacy single-range group (display helpers). Prefer MultiRangeScheduleGroup. */
export interface GroupedSchedule {
  days: string[];
  hours: TimeRange;
}

/** One schedule group: exclusive weekdays + one or more time ranges (split shifts). */
export interface MultiRangeScheduleGroup {
  id: string;
  days: string[];
  ranges: TimeRange[];
}

const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function rangesSignature(ranges: TimeRange[]): string {
  return [...ranges]
    .map((r) => `${r.start}-${r.end}`)
    .sort()
    .join('|');
}

/** "HH:MM" → minutes from midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = String(time || '0:0').split(':').map((n) => Number(n) || 0);
  return h * 60 + m;
}

/**
 * Interval in minutes; overnight (end <= start) spans past midnight (+24h).
 */
function rangeInterval(range: TimeRange): [number, number] {
  const start = timeToMinutes(range.start);
  let end = timeToMinutes(range.end);
  if (end <= start) end += 24 * 60;
  return [start, end];
}

/** True if two ranges overlap (including overnight). Touching endpoints OK (12:00–12:00 no overlap). */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  if (!a?.start || !a?.end || !b?.start || !b?.end) return false;
  const [a0, a1] = rangeInterval(a);
  const [b0, b1] = rangeInterval(b);
  return a0 < b1 && b0 < a1;
}

/** Indexes of ranges that conflict with at least one other range in the list. */
export function findOverlappingRangeIndexes(ranges: TimeRange[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (rangesOverlap(ranges[i], ranges[j])) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

export function hasOverlappingRanges(ranges: TimeRange[]): boolean {
  return findOverlappingRangeIndexes(ranges).size > 0;
}

export function expandDaysAndRanges(days: string[], ranges: TimeRange[]): DaySchedule[] {
  const out: DaySchedule[] = [];
  for (const day of days) {
    if (!day?.trim()) continue;
    for (const hours of ranges) {
      if (!hours?.start || !hours?.end) continue;
      out.push({ day, hours: { start: hours.start, end: hours.end } });
    }
  }
  return out;
}

/**
 * Group flat schedule rows by "same set of ranges".
 * Days with identical ranges (e.g. Mon+Tue both 08–12 & 13–18) share one group.
 */
export function groupSchedulesByDayRanges(
  schedules: DaySchedule[] | undefined | null
): MultiRangeScheduleGroup[] {
  if (!schedules?.length) return [];

  const byDay = new Map<string, TimeRange[]>();
  for (const s of schedules) {
    if (!s?.day?.trim() || !s.hours?.start || !s.hours?.end) continue;
    const list = byDay.get(s.day) || [];
    if (!list.some((r) => r.start === s.hours.start && r.end === s.hours.end)) {
      list.push({ start: s.hours.start, end: s.hours.end });
    }
    byDay.set(s.day, list);
  }

  const bySig = new Map<string, MultiRangeScheduleGroup>();
  for (const [day, ranges] of byDay) {
    // Keep insertion order for editor focus stability (do NOT sort ranges here).
    const id = rangesSignature(ranges);
    const existing = bySig.get(id);
    if (existing) {
      if (!existing.days.includes(day)) existing.days.push(day);
    } else {
      bySig.set(id, { id, days: [day], ranges: [...ranges] });
    }
  }

  return [...bySig.values()].map((g) => ({
    ...g,
    days: [...g.days].sort(
      (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)
    ),
  }));
}

/** Apply changes to one group: wipe its previous days, write new days × ranges. */
export function replaceScheduleGroup(
  all: DaySchedule[],
  group: MultiRangeScheduleGroup,
  nextDays: string[],
  nextRanges: TimeRange[]
): DaySchedule[] {
  const kept = (all || []).filter((s) => !group.days.includes(s.day));
  const ranges =
    nextRanges.length > 0
      ? nextRanges
      : [{ start: '09:00', end: '17:00' }];
  const days = nextDays.filter((d) => d?.trim());
  return [...kept, ...expandDaysAndRanges(days, ranges)];
}

/**
 * Display helper: one card per time range (legacy).
 * Prefer groupSchedulesByDayRanges for the editor.
 */
export const groupSchedules = (schedules: DaySchedule[]): GroupedSchedule[] => {
  const multi = groupSchedulesByDayRanges(schedules);
  // Flatten for review cards: each range becomes a group with the same days
  return multi.flatMap((g) =>
    g.ranges.map((hours) => ({
      days: g.days,
      hours,
    }))
  );
};
