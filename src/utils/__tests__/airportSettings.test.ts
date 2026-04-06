import { isValidAirportCode, getAirportInfo, DEFAULT_AIRPORT_CODE } from '../airportSettings';

describe('airportSettings', () => {
  describe('isValidAirportCode', () => {
    it('should return true for a valid 3-letter uppercase code', () => {
      expect(isValidAirportCode('PSA')).toBe(true);
      expect(isValidAirportCode('JFK')).toBe(true);
    });

    it('should return true for a valid 3-letter lowercase code', () => {
      expect(isValidAirportCode('psa')).toBe(true);
    });

    it('should return true for codes with non-alphabet characters that normalize to 3 letters', () => {
      expect(isValidAirportCode('P-S A')).toBe(true);
    });

    it('should return false for invalid codes', () => {
      expect(isValidAirportCode('PS')).toBe(false);
      expect(isValidAirportCode('123')).toBe(false);
      expect(isValidAirportCode('')).toBe(false);
      expect(isValidAirportCode(null)).toBe(false);
      expect(isValidAirportCode(undefined)).toBe(false);
    });
  });

  describe('getAirportInfo', () => {
    it('should return the preset info for a known valid code', () => {
      const psaInfo = getAirportInfo('PSA');
      expect(psaInfo).toEqual({
        code: 'PSA',
        name: 'Pisa International',
        city: 'Pisa',
        icao: 'LIRP',
        isCustom: false,
      });
    });

    it('should return custom info for an unknown valid code', () => {
      const customInfo = getAirportInfo('XYZ');
      expect(customInfo).toEqual({
        code: 'XYZ',
        name: 'Aeroporto personalizzato',
        city: 'XYZ',
        isCustom: true,
      });
    });

    it('should fallback to DEFAULT_AIRPORT_CODE for an invalid code', () => {
      const fallbackInfo = getAirportInfo('12');
      // Default code is PSA
      expect(fallbackInfo).toEqual({
        code: 'PSA',
        name: 'Pisa International',
        city: 'Pisa',
        icao: 'LIRP',
        isCustom: false,
      });
    });

    it('should fallback to DEFAULT_AIRPORT_CODE for null/undefined', () => {
      const fallbackInfo = getAirportInfo(null);
      expect(fallbackInfo.code).toBe(DEFAULT_AIRPORT_CODE);
      expect(fallbackInfo.isCustom).toBe(false);
    });
  });
});
