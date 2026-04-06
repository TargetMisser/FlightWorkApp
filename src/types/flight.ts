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
    };
    aircraft?: {
      model?: {
        text?: string;
      };
      registration?: string;
    };
    time?: {
      scheduled?: {
        departure?: number;
        arrival?: number;
      };
      real?: {
        departure?: number;
        arrival?: number;
      };
      estimated?: {
        departure?: number;
        arrival?: number;
      };
    };
    airport?: {
      origin?: {
        code?: {
          iata?: string;
        };
        name?: string;
      };
      destination?: {
        code?: {
          iata?: string;
        };
        name?: string;
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
  };
}

export interface PinnedFlightItem {}
export interface WearFlightPayload {}
