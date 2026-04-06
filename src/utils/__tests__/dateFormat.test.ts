import { fmtDateShort, fmtTime, fmtOffset, MONTHS_IT } from '../dateFormat';

describe('dateFormat', () => {
  describe('fmtDateShort', () => {
    it('formats standard dates correctly', () => {
      expect(fmtDateShort('2024-03-05')).toBe('Mar 05/03');
      expect(fmtDateShort('2023-12-31')).toBe('Dom 31/12');
      expect(fmtDateShort('2024-01-01')).toBe('Lun 01/01');
    });

    it('handles leap years correctly', () => {
      expect(fmtDateShort('2024-02-29')).toBe('Gio 29/02');
    });

    it('handles year bounds correctly', () => {
      expect(fmtDateShort('2000-01-01')).toBe('Sab 01/01'); // 2000 was a leap year, started on Saturday
      expect(fmtDateShort('2100-12-31')).toBe('Ven 31/12'); // 2100 will not be a leap year, ends on Friday
    });

    it('handles edge case invalid strings gracefully (NaN matching)', () => {
      // By implementation this returns undefined for day name and NaN for dates
      // But it shouldn't crash
      expect(() => fmtDateShort('invalid')).not.toThrow();
    });
  });

  describe('fmtTime', () => {
    it('formats a Date object to HH:MM', () => {
      const date = new Date(2024, 0, 1, 14, 30);
      expect(fmtTime(date)).toBe('14:30');
    });

    it('formats a unix timestamp in seconds to HH:MM', () => {
      // 1704119400 is 2024-01-01T14:30:00.000Z
      // Timezone might differ depending on environment, so we just test that it returns a string matching \d{2}:\d{2}
      const timeStr = fmtTime(1704119400);
      expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
    });

    it('formats a unix timestamp in milliseconds to HH:MM', () => {
      const timeStr = fmtTime(1704119400000);
      expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('fmtOffset', () => {
    it('formats a departure time minus offset to HH:MM', () => {
      const timeStr = fmtOffset(1704119400, 30); // minus 30 mins
      expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('MONTHS_IT', () => {
    it('contains exactly 12 elements', () => {
      expect(MONTHS_IT).toHaveLength(12);
    });

    it('contains expected first and last months', () => {
      expect(MONTHS_IT[0]).toBe('Gennaio');
      expect(MONTHS_IT[11]).toBe('Dicembre');
    });
  });
});
