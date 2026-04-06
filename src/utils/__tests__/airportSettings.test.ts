import { normalizeAirportCode, isValidAirportCode } from '../airportSettings';

describe('airportSettings normalization functions', () => {
  describe('normalizeAirportCode', () => {
    it('returns uppercase for lowercase valid codes', () => {
      expect(normalizeAirportCode('psa')).toBe('PSA');
      expect(normalizeAirportCode('lhr')).toBe('LHR');
    });

    it('returns uppercase without changes for valid uppercase codes', () => {
      expect(normalizeAirportCode('JFK')).toBe('JFK');
      expect(normalizeAirportCode('FCO')).toBe('FCO');
    });

    it('strips non-alphabetic characters', () => {
      expect(normalizeAirportCode('P S A')).toBe('PSA');
      expect(normalizeAirportCode('123PSA')).toBe('PSA');
      expect(normalizeAirportCode('P-S-A')).toBe('PSA');
      expect(normalizeAirportCode('  P S A  ')).toBe('PSA');
      expect(normalizeAirportCode('PSA123')).toBe('PSA');
    });

    it('truncates to 3 characters', () => {
      expect(normalizeAirportCode('ABCD')).toBe('ABC');
      expect(normalizeAirportCode('P S A B')).toBe('PSA');
      expect(normalizeAirportCode('ROME')).toBe('ROM');
    });

    it('handles empty strings', () => {
      expect(normalizeAirportCode('')).toBe('');
      expect(normalizeAirportCode('   ')).toBe('');
      expect(normalizeAirportCode('123')).toBe('');
    });

    it('handles null and undefined', () => {
      expect(normalizeAirportCode(null)).toBe('');
      expect(normalizeAirportCode(undefined)).toBe('');
    });
  });

  describe('isValidAirportCode', () => {
    it('returns true for exactly 3 letters', () => {
      expect(isValidAirportCode('PSA')).toBe(true);
      expect(isValidAirportCode('psa')).toBe(true);
      expect(isValidAirportCode('LHR')).toBe(true);
    });

    it('returns true for 3 letters mixed with invalid characters', () => {
      expect(isValidAirportCode(' P S A ')).toBe(true);
      expect(isValidAirportCode('P-S-A')).toBe(true);
      expect(isValidAirportCode('PSA123')).toBe(true); // normalize strips 123
      expect(isValidAirportCode('123PSA')).toBe(true);
    });

    it('returns false for less than 3 letters', () => {
      expect(isValidAirportCode('PS')).toBe(false);
      expect(isValidAirportCode('P')).toBe(false);
      expect(isValidAirportCode('')).toBe(false);
      expect(isValidAirportCode('12')).toBe(false);
    });

    it('returns true for more than 3 letters (it truncates to 3)', () => {
      expect(isValidAirportCode('ABCD')).toBe(true); // normalizes to ABC
      expect(isValidAirportCode('ROME')).toBe(true); // normalizes to ROM
    });

    it('returns false for null and undefined', () => {
      expect(isValidAirportCode(null)).toBe(false);
      expect(isValidAirportCode(undefined)).toBe(false);
    });
  });
});
