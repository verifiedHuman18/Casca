export interface CalendarDay {
  date: Date;
  dayNumber: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateKey: string; // YYYY-MM-DD
}

// Fixed reference anchor for deterministic calendar simulation: Nov 12, 2026
export const SIMULATED_TODAY_KEY = '2026-11-12';
export const SIMULATED_TODAY = new Date('2026-11-12T18:38:18.000+05:30');

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function getMonthWeeks(year: number, month: number): (number | null)[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const fh = h % 12 || 12;
  return `${fh}:${m === 0 ? '00' : String(m).padStart(2, '0')} ${ampm}`;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export interface WeekDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  dayShort: string;
}

export function getWeekDays(dateKey: string): WeekDay[] {
  const [y, m, d] = dateKey.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  const dow = cur.getDay(); // 0 = Sunday
  const sunday = new Date(y, m - 1, d - dow);

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    days.push({
      date,
      dateKey: toDateKey(date.getFullYear(), date.getMonth(), date.getDate()),
      dayNumber: date.getDate(),
      dayShort: DAY_SHORT[date.getDay()],
    });
  }
  return days;
}

export function getPreviousDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return toDateKey(prev.getFullYear(), prev.getMonth(), prev.getDate());
}

export function getNextDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return toDateKey(next.getFullYear(), next.getMonth(), next.getDate());
}

export function getMonthMatrix(year: number, monthIndex: number): CalendarDay[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const days: CalendarDay[] = [];

  // Previous month padding
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const date = new Date(year, monthIndex - 1, dayNum);
    const key = formatDateKey(date);
    days.push({
      date,
      dayNumber: dayNum,
      month: monthIndex - 1,
      year,
      isCurrentMonth: false,
      isToday: key === SIMULATED_TODAY_KEY,
      dateKey: key,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, monthIndex, i);
    const key = formatDateKey(date);
    days.push({
      date,
      dayNumber: i,
      month: monthIndex,
      year,
      isCurrentMonth: true,
      isToday: key === SIMULATED_TODAY_KEY,
      dateKey: key,
    });
  }

  // Trailing next month padding to complete 5 or 6 weeks (multiples of 7)
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, monthIndex + 1, i);
      const key = formatDateKey(date);
      days.push({
        date,
        dayNumber: i,
        month: monthIndex + 1,
        year,
        isCurrentMonth: false,
        isToday: key === SIMULATED_TODAY_KEY,
        dateKey: key,
      });
    }
  }

  return days;
}

export function formatTimeRange(
  startIso: string,
  endIso: string
): { range: string; duration: string } {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const startHours = start.getHours();
  const startMins = start.getMinutes();
  const startAmPm = startHours >= 12 ? 'PM' : 'AM';
  const startFormatted = `${startHours % 12 || 12}:${String(startMins).padStart(2, '0')} ${startAmPm}`;

  const endHours = end.getHours();
  const endMins = end.getMinutes();
  const endAmPm = endHours >= 12 ? 'PM' : 'AM';
  const endFormatted = `${endHours % 12 || 12}:${String(endMins).padStart(2, '0')} ${endAmPm}`;

  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.round((diffMs % 3600000) / 60000);

  let duration = '';
  if (diffHours > 0) duration += `${diffHours}h `;
  if (diffMins > 0) duration += `${diffMins}m`;

  return {
    range: `${startFormatted} – ${endFormatted}`,
    duration: duration.trim() || '1h',
  };
}

/**
 * Builds an exact ISO 8601 string given a date key (YYYY-MM-DD) and a 24h time string (HH:mm).
 * Respects the user's local timezone and converts to a proper ISO string.
 */
export function buildIsoDateTime(dateKey: string, time24: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hours, minutes] = time24.split(':').map(Number);
  const date = new Date(y, m - 1, d, hours || 0, minutes || 0, 0, 0);
  return date.toISOString();
}

export interface TimeParts {
  hour12: number;
  minute: number;
  isPm: boolean;
  time24: string;
  formatted: string;
}

/**
 * Parses an ISO 8601 string or Date into 12-hour and 24-hour time parts in local time.
 */
export function parseIsoToTimeParts(isoOrDate: string | Date): TimeParts {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const isPm = hours >= 12;
  const hour12 = hours % 12 || 12;
  const minutePadded = String(minutes).padStart(2, '0');
  const time24 = `${String(hours).padStart(2, '0')}:${minutePadded}`;
  const formatted = `${hour12}:${minutePadded} ${isPm ? 'PM' : 'AM'}`;

  return {
    hour12,
    minute: minutes,
    isPm,
    time24,
    formatted,
  };
}

/**
 * Computes an end time (HH:mm) given a start time (HH:mm) and a duration in minutes.
 */
export function calculateEndTime24(startTime24: string, durationMinutes: number): string {
  const [startH, startM] = startTime24.split(':').map(Number);
  const totalMinutes = (startH || 0) * 60 + (startM || 0) + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export interface DurationResult {
  durationMinutes: number;
  formatted: string;
  isValid: boolean;
}

/**
 * Computes the duration between two 24-hour time strings on the same day.
 */
export function getTimeDuration(startTime24: string, endTime24: string): DurationResult {
  const [sh, sm] = startTime24.split(':').map(Number);
  const [eh, em] = endTime24.split(':').map(Number);
  const startMins = (sh || 0) * 60 + (sm || 0);
  const endMins = (eh || 0) * 60 + (em || 0);
  const diff = endMins - startMins;

  if (diff <= 0) {
    return { durationMinutes: diff, formatted: '0m', isValid: false };
  }

  const h = Math.floor(diff / 60);
  const m = diff % 60;
  let formatted = '';
  if (h > 0) formatted += `${h}h `;
  if (m > 0) formatted += `${m}m`;

  return {
    durationMinutes: diff,
    formatted: formatted.trim() || `${diff}m`,
    isValid: true,
  };
}

/**
 * Formats a 24-hour time string (HH:mm) into a 12-hour string (e.g. "10:00 AM", "3:30 PM").
 */
export function formatTime24(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const isPm = (h || 0) >= 12;
  const h12 = (h || 0) % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
}

/**
 * Sorts event items chronologically ascending by startTime.
 */
export function sortEventsChronologically<T extends { startTime: string }>(events: T[]): T[] {
  return [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}
