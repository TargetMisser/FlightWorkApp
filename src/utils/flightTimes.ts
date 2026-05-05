type FlightDirection = 'arrival' | 'departure';
type FlightTimeBucket = 'real' | 'estimated' | 'scheduled';

function readFlightTs(item: any, bucket: FlightTimeBucket, direction: FlightDirection): number | undefined {
  const value = item?.flight?.time?.[bucket]?.[direction];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function getScheduledFlightTs(item: any, direction: FlightDirection): number | undefined {
  return readFlightTs(item, 'scheduled', direction);
}

export function getBestFlightTs(item: any, direction: FlightDirection): number | undefined {
  return readFlightTs(item, 'real', direction)
    ?? readFlightTs(item, 'estimated', direction)
    ?? readFlightTs(item, 'scheduled', direction);
}

export function getBestArrivalTs(item: any): number | undefined {
  return getBestFlightTs(item, 'arrival');
}

export function getBestDepartureTs(item: any): number | undefined {
  return getBestFlightTs(item, 'departure');
}
