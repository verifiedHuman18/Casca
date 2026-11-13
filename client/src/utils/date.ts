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
