import { fmtTime, fmtOffset, fmtDateShort } from './dateFormat';

describe('dateFormat utils', () => {
  describe('fmtTime', () => {
    it('should format a Date object correctly', () => {
      // toLocaleTimeString might return different formats based on the environment's timezone
      // We will test if the format is HH:MM by creating a date in local time
      const localDate = new Date(2023, 4, 15, 14, 30);
      expect(fmtTime(localDate)).toBe('14:30');
    });

    it('should format a unix-seconds timestamp correctly', () => {
      // 14:30:00 in local time
      const localDate = new Date(2023, 4, 15, 14, 30);
      const timestampSeconds = Math.floor(localDate.getTime() / 1000);
      expect(fmtTime(timestampSeconds)).toBe('14:30');
    });

    it('should format a unix-milliseconds timestamp correctly', () => {
      const localDate = new Date(2023, 4, 15, 14, 30);
      const timestampMs = localDate.getTime();
      expect(fmtTime(timestampMs)).toBe('14:30');
    });
  });

  describe('fmtOffset', () => {
    it('should correctly format a departure with an offset', () => {
      // Departure at 14:30:00 local time
      const localDate = new Date(2023, 4, 15, 14, 30);
      const departureSec = Math.floor(localDate.getTime() / 1000);

      // 30 minutes offset should result in 14:00
      expect(fmtOffset(departureSec, 30)).toBe('14:00');
    });

    it('should handle zero offset', () => {
      const localDate = new Date(2023, 4, 15, 14, 30);
      const departureSec = Math.floor(localDate.getTime() / 1000);
      expect(fmtOffset(departureSec, 0)).toBe('14:30');
    });

    it('should handle negative offset (adding time)', () => {
      const localDate = new Date(2023, 4, 15, 14, 30);
      const departureSec = Math.floor(localDate.getTime() / 1000);
      // -30 minutes offset should result in 15:00
      expect(fmtOffset(departureSec, -30)).toBe('15:00');
    });
  });

  describe('fmtDateShort', () => {
    it('should format a short date string correctly without timezone issues', () => {
      // Provide year, month, day directly in the same timezone context as it runs
      // fmtDateShort parses 'YYYY-MM-DD' as local time.
      // E.g. '2023-03-05' -> new Date(2023, 2, 5) -> Sunday, which is local midnight
      expect(fmtDateShort('2023-03-05')).toBe('Dom 05/03');
      expect(fmtDateShort('2023-03-06')).toBe('Lun 06/03');
      expect(fmtDateShort('2023-12-25')).toBe('Lun 25/12');
    });
  });
});
