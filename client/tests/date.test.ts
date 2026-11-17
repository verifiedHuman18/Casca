import { describe, it, expect } from 'vitest';
import {
  MONTH_NAMES,
  MONTH_SHORT,
  DAY_SHORT,
  getDaysInMonth,
  getFirstDayOfWeek,
  toDateKey,
  formatTime,
  formatTimeRange,
  getMonthMatrix,
  getMonthWeeks,
  getWeekDays,
  getPreviousDayKey,
  getNextDayKey,
  buildIsoDateTime,
  parseIsoToTimeParts,
  calculateEndTime24,
  getTimeDuration,
  formatTime24,
  sortEventsChronologically,
} from '../src/utils/date';

describe('Date Utilities (client/src/utils/date.ts)', () => {
  describe('Constants', () => {
    it('has 12 months with correct names and abbreviations', () => {
      expect(MONTH_NAMES).toHaveLength(12);
      expect(MONTH_SHORT).toHaveLength(12);
      expect(MONTH_NAMES[0]).toBe('January');
      expect(MONTH_NAMES[11]).toBe('December');
      expect(MONTH_SHORT[0]).toBe('JAN');
      expect(MONTH_SHORT[11]).toBe('DEC');
    });

    it('has 7 day abbreviations starting on Sunday', () => {
      expect(DAY_SHORT).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    });
  });

  describe('toDateKey', () => {
    it('formats single digit month and day with leading zeroes', () => {
      expect(toDateKey(2026, 0, 5)).toBe('2026-01-05');
      expect(toDateKey(2026, 8, 9)).toBe('2026-09-09');
    });

    it('formats double digit month and day correctly', () => {
      expect(toDateKey(2026, 10, 12)).toBe('2026-11-12');
      expect(toDateKey(2026, 11, 31)).toBe('2026-12-31');
    });
  });

  describe('getDaysInMonth', () => {
    it('returns 31 days for January, March, May, July, August, October, December', () => {
      [0, 2, 4, 6, 7, 9, 11].forEach(month => {
        expect(getDaysInMonth(2026, month)).toBe(31);
      });
    });

    it('returns 30 days for April, June, September, November', () => {
      [3, 5, 8, 10].forEach(month => {
        expect(getDaysInMonth(2026, month)).toBe(30);
      });
    });

    it('handles February in common years (28 days) and leap years (29 days)', () => {
      expect(getDaysInMonth(2026, 1)).toBe(28); // Non-leap year
      expect(getDaysInMonth(2024, 1)).toBe(29); // Leap year
      expect(getDaysInMonth(2000, 1)).toBe(29); // Century leap year
      expect(getDaysInMonth(1900, 1)).toBe(28); // Century non-leap year
    });
  });

  describe('getFirstDayOfWeek', () => {
    it('returns correct day of week index (0 = Sun, 1 = Mon, ..., 6 = Sat)', () => {
      // Nov 1, 2026 is Sunday (0)
      expect(getFirstDayOfWeek(2026, 10)).toBe(0);
      // Dec 1, 2026 is Tuesday (2)
      expect(getFirstDayOfWeek(2026, 11)).toBe(2);
    });
  });

  describe('formatTime', () => {
    it('formats morning hours with AM', () => {
      const morning = new Date(2026, 10, 12, 9, 30).toISOString();
      expect(formatTime(morning)).toBe('9:30 AM');
    });

    it('formats noon as 12:00 PM', () => {
      const noon = new Date(2026, 10, 12, 12, 0).toISOString();
      expect(formatTime(noon)).toBe('12:00 PM');
    });

    it('formats afternoon and evening hours with PM', () => {
      const afternoon = new Date(2026, 10, 12, 15, 45).toISOString();
      expect(formatTime(afternoon)).toBe('3:45 PM');
    });

    it('formats midnight as 12:00 AM', () => {
      const midnight = new Date(2026, 10, 12, 0, 0).toISOString();
      expect(formatTime(midnight)).toBe('12:00 AM');
    });

    it('zero-pads single-digit minutes', () => {
      const singleDigitMin = new Date(2026, 10, 12, 8, 5).toISOString();
      expect(formatTime(singleDigitMin)).toBe('8:05 AM');
    });
  });

  describe('formatTimeRange', () => {
    it('formats a start and end ISO range correctly', () => {
      const start = new Date(2026, 10, 12, 10, 0).toISOString();
      const end = new Date(2026, 10, 12, 11, 30).toISOString();
      const res = formatTimeRange(start, end);
      expect(res.range).toBe('10:00 AM – 11:30 AM');
      expect(res.duration).toBe('1h 30m');
    });
  });

  describe('getMonthMatrix', () => {
    it('generates a grid of days for a month including previous and next month paddings', () => {
      const days = getMonthMatrix(2026, 10);
      // Total days should be a multiple of 7
      expect(days.length % 7).toBe(0);
      // At least 28 days
      expect(days.length).toBeGreaterThanOrEqual(28);

      // Verify the simulated today marker
      const todayCell = days.find(d => d.dateKey === '2026-11-12');
      expect(todayCell).toBeDefined();
      expect(todayCell?.isToday).toBe(true);
      expect(todayCell?.isCurrentMonth).toBe(true);
      expect(todayCell?.dayNumber).toBe(12);
    });
  });

  describe('getMonthWeeks', () => {
    it('always chunks month cells into rows of exactly 7 days', () => {
      for (let month = 0; month < 12; month++) {
        const weeks = getMonthWeeks(2026, month);
        weeks.forEach(week => {
          expect(week).toHaveLength(7);
        });
      }
    });

    it('aligns November 2026 starting on Sunday with 5 full 7-day rows', () => {
      const weeks = getMonthWeeks(2026, 10); // November 2026
      expect(weeks).toHaveLength(5);
      // Week 0: Nov 1 (Sunday) to Nov 7 (Saturday)
      expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
      // Week 4: Nov 29 (Sun), Nov 30 (Mon), followed by 5 null padding cells
      expect(weeks[4]).toEqual([29, 30, null, null, null, null, null]);
    });

    it('aligns December 2026 starting on Tuesday with leading nulls', () => {
      const weeks = getMonthWeeks(2026, 11); // December 2026
      expect(weeks).toHaveLength(5);
      // Dec 1 is Tuesday -> index 0 (Sun) and 1 (Mon) are null
      expect(weeks[0]).toEqual([null, null, 1, 2, 3, 4, 5]);
      // Dec 31 is Thursday -> index 5 (Fri) and 6 (Sat) are null
      expect(weeks[4]).toEqual([27, 28, 29, 30, 31, null, null]);
    });

    it('preserves all consecutive calendar days without omission or duplication', () => {
      const weeks = getMonthWeeks(2026, 10);
      const days = weeks.flat().filter((d): d is number => d !== null);
      expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    });
  });

  describe('getPreviousDayKey and getNextDayKey', () => {
    it('steps forward and backward within the same month', () => {
      expect(getPreviousDayKey('2026-11-12')).toBe('2026-11-11');
      expect(getNextDayKey('2026-11-12')).toBe('2026-11-13');
    });

    it('crosses month boundaries correctly', () => {
      expect(getPreviousDayKey('2026-11-01')).toBe('2026-10-31');
      expect(getNextDayKey('2026-10-31')).toBe('2026-11-01');
    });

    it('crosses year boundaries correctly', () => {
      expect(getPreviousDayKey('2026-01-01')).toBe('2025-12-31');
      expect(getNextDayKey('2025-12-31')).toBe('2026-01-01');
    });

    it('handles leap year boundaries correctly', () => {
      expect(getNextDayKey('2024-02-28')).toBe('2024-02-29');
      expect(getNextDayKey('2024-02-29')).toBe('2024-03-01');
      expect(getPreviousDayKey('2024-03-01')).toBe('2024-02-29');
    });
  });

  describe('getWeekDays', () => {
    it('returns a 7-day array starting on Sunday for the given date', () => {
      // 2026-11-12 is Thursday, so Sunday of that week is 2026-11-08
      const week = getWeekDays('2026-11-12');
      expect(week).toHaveLength(7);
      expect(week[0].dateKey).toBe('2026-11-08');
      expect(week[0].dayShort).toBe('SUN');
      expect(week[0].dayNumber).toBe(8);

      expect(week[4].dateKey).toBe('2026-11-12');
      expect(week[4].dayShort).toBe('THU');
      expect(week[4].dayNumber).toBe(12);

      expect(week[6].dateKey).toBe('2026-11-14');
      expect(week[6].dayShort).toBe('SAT');
      expect(week[6].dayNumber).toBe(14);
    });

    it('handles week crossing month boundaries', () => {
      // 2026-11-02 is Monday, Sunday is 2026-11-01
      const week = getWeekDays('2026-11-01');
      expect(week[0].dateKey).toBe('2026-11-01');
      expect(week[0].dayShort).toBe('SUN');
    });
  });

  describe('buildIsoDateTime', () => {
    it('creates an ISO date-time string matching dateKey and time24 in local time', () => {
      const iso = buildIsoDateTime('2026-11-20', '14:30');
      const parsed = new Date(iso);
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(10); // Nov
      expect(parsed.getDate()).toBe(20);
      expect(parsed.getHours()).toBe(14);
      expect(parsed.getMinutes()).toBe(30);
    });
  });

  describe('parseIsoToTimeParts', () => {
    it('parses morning time correctly', () => {
      const d = new Date(2026, 10, 20, 9, 15);
      const parts = parseIsoToTimeParts(d.toISOString());
      expect(parts.hour12).toBe(9);
      expect(parts.minute).toBe(15);
      expect(parts.isPm).toBe(false);
      expect(parts.time24).toBe('09:15');
      expect(parts.formatted).toBe('9:15 AM');
    });

    it('parses afternoon/evening time correctly', () => {
      const d = new Date(2026, 10, 20, 16, 45);
      const parts = parseIsoToTimeParts(d.toISOString());
      expect(parts.hour12).toBe(4);
      expect(parts.minute).toBe(45);
      expect(parts.isPm).toBe(true);
      expect(parts.time24).toBe('16:45');
      expect(parts.formatted).toBe('4:45 PM');
    });
  });

  describe('calculateEndTime24', () => {
    it('adds 90 minutes correctly to morning time', () => {
      expect(calculateEndTime24('10:00', 90)).toBe('11:30');
    });

    it('handles hour rollovers across noon', () => {
      expect(calculateEndTime24('11:30', 60)).toBe('12:30');
    });

    it('handles 30 minute durations', () => {
      expect(calculateEndTime24('09:15', 30)).toBe('09:45');
    });
  });

  describe('getTimeDuration', () => {
    it('calculates duration between two 24h times', () => {
      const res = getTimeDuration('10:00', '11:30');
      expect(res.isValid).toBe(true);
      expect(res.durationMinutes).toBe(90);
      expect(res.formatted).toBe('1h 30m');
    });

    it('identifies invalid time ranges where end is before start', () => {
      const res = getTimeDuration('14:00', '13:00');
      expect(res.isValid).toBe(false);
      expect(res.durationMinutes).toBeLessThan(0);
    });

    it('identifies zero duration as invalid', () => {
      const res = getTimeDuration('10:00', '10:00');
      expect(res.isValid).toBe(false);
    });
  });

  describe('formatTime24', () => {
    it('formats 24h string into 12h representation', () => {
      expect(formatTime24('09:00')).toBe('9:00 AM');
      expect(formatTime24('13:45')).toBe('1:45 PM');
      expect(formatTime24('00:00')).toBe('12:00 AM');
      expect(formatTime24('12:00')).toBe('12:00 PM');
    });
  });

  describe('sortEventsChronologically', () => {
    it('sorts events in ascending order by startTime', () => {
      const e1 = { id: '1', startTime: '2026-11-20T14:00:00Z' };
      const e2 = { id: '2', startTime: '2026-11-20T09:00:00Z' };
      const e3 = { id: '3', startTime: '2026-11-20T11:30:00Z' };

      const sorted = sortEventsChronologically([e1, e2, e3]);
      expect(sorted.map(e => e.id)).toEqual(['2', '3', '1']);
    });
  });
});
