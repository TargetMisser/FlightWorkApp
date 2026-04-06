export interface FR24Flight {
  flight?: {
    time?: {
      scheduled?: {
        departure?: number;
        arrival?: number;
      };
    };
    identification?: {
      number?: {
        default?: string;
      };
    };
    airline?: {
      name?: string;
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
  };
}

export interface PinnedFlightItem {
  flightNumber: string;
  ts: number;
}

export interface WearFlightPayload {
  flightNumber: string;
  dest: string;
  time: string;
  isCheckinOpen: boolean;
  isGateOpen: boolean;
}
