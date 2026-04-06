import { isValidAirportCode, getAirportInfo } from '../airportSettings';

describe('airportSettings tests', () => {
  describe('isValidAirportCode', () => {
    it('returns true for valid 3-letter codes', () => {
      expect(isValidAirportCode('PSA')).toBe(true);
      expect(isValidAirportCode('FCO')).toBe(true);
    });

    it('returns true for lowercase or mixed case valid codes, handled via normalization', () => {
      expect(isValidAirportCode('psa')).toBe(true);
      expect(isValidAirportCode('fCo')).toBe(true);
    });

    it('returns true for strings that normalize to 3-letters (e.g. ignoring spaces)', () => {
      // The normalization logic replaces non-alpha chars:
      // replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
      // "P S A" -> "PSA"
      expect(isValidAirportCode('P S A')).toBe(true);
      expect(isValidAirportCode('123PSA')).toBe(true); // "123PSA" -> "PSA"
    });

    it('returns false for invalid inputs (too short)', () => {
      expect(isValidAirportCode('A')).toBe(false);
      expect(isValidAirportCode('AB')).toBe(false);
    });

    it('returns false for empty string, null, or undefined', () => {
      expect(isValidAirportCode('')).toBe(false);
      expect(isValidAirportCode(null)).toBe(false);
      expect(isValidAirportCode(undefined)).toBe(false);
    });
  });

  describe('getAirportInfo', () => {
    it('returns preset info for known codes with isCustom false', () => {
      const info = getAirportInfo('PSA');
      expect(info).toMatchObject({
        code: 'PSA',
        name: 'Pisa International',
        city: 'Pisa',
        isCustom: false,
      });
      expect(info.icao).toBe('LIRP');
    });

    it('handles lower and mixed case known codes correctly via normalization', () => {
      const info = getAirportInfo('fCo');
      expect(info).toMatchObject({
        code: 'FCO',
        name: 'Rome Fiumicino',
        isCustom: false,
      });
    });

    it('returns fallback custom info for unknown but valid 3-letter codes', () => {
      const info = getAirportInfo('XYZ');
      expect(info).toMatchObject({
        code: 'XYZ',
        name: 'Aeroporto personalizzato',
        city: 'XYZ',
        isCustom: true,
      });
    });

    it('falls back to default airport (PSA) for invalid codes', () => {
      // getAirportInfo falls back to DEFAULT_AIRPORT_CODE if code is not valid
      const info1 = getAirportInfo('A');
      const info2 = getAirportInfo(null);
      const info3 = getAirportInfo(undefined);

      const expectedFallback = {
        code: 'PSA',
        name: 'Pisa International',
        city: 'Pisa',
        isCustom: false,
      };

      expect(info1).toMatchObject(expectedFallback);
      expect(info2).toMatchObject(expectedFallback);
      expect(info3).toMatchObject(expectedFallback);
    });
  });
});
