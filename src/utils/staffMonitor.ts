export type StaffMonitorFlight = {
  flightNumber: string;
  stand?: string;
  checkin?: string;
  gate?: string;
  belt?: string;
};

/** Normalize flight number: FR07146 -> FR7146, FR00770 -> FR770 */
export function normalizeFlightNumber(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^([A-Z]{2,3})0+([0-9])/, '$1$2');
}

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/°|&#176;/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function extractTDCells(trHTML: string): string[] {
  const cells: string[] = [];
  const regex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(trHTML)) !== null) {
    cells.push(stripHTML(m[1]));
  }

  return cells;
}

/**
 * Fetch and parse stand/gate/check-in data from Pisa Airport staffMonitor.
 *
 * Departures columns (0-indexed):
 * 0=logo, 1=flight, 2=ACtype, 3=TRtype, 4=REG, 5=dest, 6=SLOT, 7=SCHED,
 * 8=EXP, 9=BLKOFF, 10=TKOFF, 11=STATUS, 12=STAND, 13=CHECKIN, 14=GATE
 *
 * Arrivals columns (0-indexed):
 * 0=logo, 1=flight, 2=ACtype, 3=TRtype, 4=REG, 5=origin, 6=SCHED,
 * 7=EXP, 8=LAND, 9=BLKON, 10=STATUS, 11=STAND, 12=BELT
 */
export async function fetchStaffMonitorData(nature: 'D' | 'A'): Promise<StaffMonitorFlight[]> {
  try {
    const url = `https://servizi.pisa-airport.com/staffMonitor/staffMonitor?trans=true&nature=${nature}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      if (__DEV__) {
        console.warn(`[staffMonitor] HTTP error for nature=${nature}: ${resp.status} ${resp.statusText}`);
      }
      return [];
    }

    const html = await resp.text();
    const results: StaffMonitorFlight[] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match: RegExpExecArray | null;

    while ((match = trRegex.exec(html)) !== null) {
      const rowHTML = match[1];

      // Only rows that carry a flight number cell.
      if (!/class\s*=\s*["'][^"']*clsFlight[^"']*["']/i.test(rowHTML)) continue;

      const cells = extractTDCells(rowHTML);
      if (cells.length < 2) continue;

      const rawFlight = cells[1];
      if (!rawFlight) continue;

      const flightNumber = normalizeFlightNumber(rawFlight);

      if (nature === 'D') {
        results.push({
          flightNumber,
          stand: cells[12] || undefined,
          checkin: cells[13] || undefined,
          gate: cells[14] || undefined,
        });
      } else {
        results.push({
          flightNumber,
          stand: cells[11] || undefined,
          belt: cells[12] || undefined,
        });
      }
    }

    if (__DEV__) {
      console.log(
        `[staffMonitor] nature=${nature} parsed ${results.length} flights.`,
        results.slice(0, 5).map(r => r.flightNumber),
      );
    }

    return results;
  } catch (e) {
    if (__DEV__) {
      console.error(`[staffMonitor] fetch/parse error for nature=${nature}:`, e);
    }
    return [];
  }
}
