import { getAirlineOps, DEFAULT_OPS, AIRLINE_OPS } from './airlineOps';

describe('getAirlineOps', () => {
  it('should return correct ops for exact match', () => {
    const easyjetOps = AIRLINE_OPS.find(a => a.key === 'easyjet')?.ops;
    expect(getAirlineOps('easyjet')).toEqual(easyjetOps);

    const wizzOps = AIRLINE_OPS.find(a => a.key === 'wizz')?.ops;
    expect(getAirlineOps('wizz')).toEqual(wizzOps);
  });

  it('should return correct ops regardless of case', () => {
    const easyjetOps = AIRLINE_OPS.find(a => a.key === 'easyjet')?.ops;
    expect(getAirlineOps('EASYJET')).toEqual(easyjetOps);
    expect(getAirlineOps('EasyJet')).toEqual(easyjetOps);

    const britishAirwaysOps = AIRLINE_OPS.find(a => a.key === 'british airways')?.ops;
    expect(getAirlineOps('BRITISH AIRWAYS')).toEqual(britishAirwaysOps);
  });

  it('should return correct ops for partial matches', () => {
    const wizzOps = AIRLINE_OPS.find(a => a.key === 'wizz')?.ops;
    expect(getAirlineOps('Wizz Air')).toEqual(wizzOps);
    expect(getAirlineOps('WizzAir UK')).toEqual(wizzOps);

    const aerLingusOps = AIRLINE_OPS.find(a => a.key === 'aer lingus')?.ops;
    expect(getAirlineOps('Aer Lingus Regional')).toEqual(aerLingusOps);
  });

  it('should return DEFAULT_OPS for unknown airlines', () => {
    expect(getAirlineOps('Unknown Airlines')).toEqual(DEFAULT_OPS);
    expect(getAirlineOps('Ryanair')).toEqual(DEFAULT_OPS);
    expect(getAirlineOps('Lufthansa')).toEqual(DEFAULT_OPS);
  });

  it('should return DEFAULT_OPS for empty strings', () => {
    expect(getAirlineOps('')).toEqual(DEFAULT_OPS);
  });
});
