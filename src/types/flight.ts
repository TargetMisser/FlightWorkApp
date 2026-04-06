import { AirlineOps, HexColor } from '../utils/airlineOps';

export interface FR24Flight {
  flight?: {
    identification?: {
      id?: string;
      number?: {
        default?: string;
      };
    };
    airline?: {
      name?: string;
      code?: {
        iata?: string;
      };
    };
    airport?: {
      origin?: {
        name?: string;
        code?: {
          iata?: string;
        };
      };
      destination?: {
        name?: string;
        code?: {
          iata?: string;
        };
      };
    };
    time?: {
      scheduled?: {
        departure?: number;
        arrival?: number;
      };
      estimated?: {
        departure?: number;
        arrival?: number;
      };
      real?: {
        departure?: number;
        arrival?: number;
      };
    };
    status?: {
      text?: string;
      generic?: {
        status?: {
          color?: string;
        };
      };
    };
    aircraft?: {
      registration?: string;
    };
  };
}

export interface PinnedFlightItem extends FR24Flight {
  _pinTab?: 'arrivals' | 'departures';
  _pinnedAt?: number;
  _inboundArrival?: number;
}

export interface WearFlightPayload {
  flightNumber: string;
  airline: string;
  airlineColor: HexColor;
  iataCode: string;
  tab: 'arrivals' | 'departures';
  destination: string;
  origin: string;
  scheduledTime: number;
  pinnedAt: number;
  estimatedTime?: number;
  realDeparture?: number;
  realArrival?: number;
  inboundArrival?: number;
  ops?: AirlineOps;
}
