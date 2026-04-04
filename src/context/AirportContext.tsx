import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_AIRPORT_CODE,
  getAirportInfo,
  getStoredAirportCode,
  setStoredAirportCode,
  type AirportInfo,
} from '../utils/airportSettings';

type AirportContextValue = {
  airportCode: string;
  airport: AirportInfo;
  setAirportCode: (code: string) => Promise<void>;
  isLoading: boolean;
};

const defaultAirport = getAirportInfo(DEFAULT_AIRPORT_CODE);

const AirportContext = createContext<AirportContextValue>({
  airportCode: defaultAirport.code,
  airport: defaultAirport,
  setAirportCode: async () => {},
  isLoading: false,
});

export function AirportProvider({ children }: { children: React.ReactNode }) {
  const [airportCode, setAirportCodeState] = useState(DEFAULT_AIRPORT_CODE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredAirportCode()
      .then(code => setAirportCodeState(code))
      .finally(() => setIsLoading(false));
  }, []);

  const setAirportCode = useCallback(async (code: string) => {
    const savedCode = await setStoredAirportCode(code);
    setAirportCodeState(savedCode);
  }, []);

  const airport = useMemo(() => getAirportInfo(airportCode), [airportCode]);

  return (
    <AirportContext.Provider value={{ airportCode, airport, setAirportCode, isLoading }}>
      {children}
    </AirportContext.Provider>
  );
}

export function useAirport() {
  return useContext(AirportContext);
}
