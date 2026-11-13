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
});
