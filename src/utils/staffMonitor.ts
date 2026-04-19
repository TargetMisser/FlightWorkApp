export type StaffMonitorFlight = {
  flightNumber: string;
  stand?: string;
  checkin?: string;
  gate?: string;
  belt?: string;
};

type StaffMonitorCell = {
  className: string;
  text: string;
};

/** Normalize flight number: FR07146 → FR7146, FR00770 → FR770 */
export function normalizeFlightNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/^([A-Z]{2,3})0+([0-9])/, '$1$2');
}

function stripHTML(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#176;/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTDCells(trHTML: string): StaffMonitorCell[] {
  const cells: StaffMonitorCell[] = [];
  const regex = /<td([^>]*?)\/>|<td([^>]*)>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(trHTML)) !== null) {
    const attrs = m[1] || m[2] || '';
    const classMatch = attrs.match(/class\s*=\s*["']([^"']+)["']/i);
    cells.push({
      className: (classMatch?.[1] || '').trim(),
      text: stripHTML(m[3] || ''),
    });
  }
  return cells;
}

function getCellText(cells: StaffMonitorCell[], index: number): string | undefined {
  const value = cells[index]?.text?.trim();
  return value ? value : undefined;
}

/**
 * Fetch and parse stand/gate/check-in data from the Pisa Airport staffMonitor.
 *
 * The live staff monitor currently includes a logo column before the flight
 * number, but we key off the `clsFlight` cell so the parser survives either
 * layout.
 *
 * Relative to the flight-number cell:
 * Departures: +11=STAND, +12=CHECKIN, +13=GATE
 * Arrivals:   +10=STAND, +11=BELT
 */
export async function fetchStaffMonitorData(nature: 'D' | 'A'): Promise<StaffMonitorFlight[]> {
  try {
    const url = `https://servizi.pisa-airport.com/staffMonitor/staffMonitor?trans=true&nature=${nature}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[staffMonitor] HTTP error for nature=${nature}: ${resp.status} ${resp.statusText}`);
      return [];
    }
    const html = await resp.text();

    const results: StaffMonitorFlight[] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match: RegExpExecArray | null;

    while ((match = trRegex.exec(html)) !== null) {
      const rowHTML = match[1];
      // Only rows that carry a flight number cell (match clsFlight as a substring of the class attribute)
      if (!/class\s*=\s*["'][^"']*clsFlight[^"']*["']/i.test(rowHTML)) continue;

      const cells = extractTDCells(rowHTML);
      if (cells.length < 2) continue;

      const flightCellIndex = cells.findIndex(cell => /\bclsFlight\b/i.test(cell.className));
      if (flightCellIndex === -1) continue;

      const rawFlight = cells[flightCellIndex]?.text;
      if (!rawFlight) continue;

      const flightNumber = normalizeFlightNumber(rawFlight);

      if (nature === 'D') {
        results.push({
          flightNumber,
          stand: getCellText(cells, flightCellIndex + 11),
          checkin: getCellText(cells, flightCellIndex + 12),
          gate: getCellText(cells, flightCellIndex + 13),
        });
      } else {
        results.push({
          flightNumber,
          stand: getCellText(cells, flightCellIndex + 10),
          belt: getCellText(cells, flightCellIndex + 11),
        });
      }
    }

    if (__DEV__) {
      console.log(`[staffMonitor] nature=${nature} parsed ${results.length} flights.`, results.slice(0, 5).map(r => r.flightNumber));
    }

    return results;
  } catch (e) {
    console.error(`[staffMonitor] fetch/parse error for nature=${nature}:`, e);
    return [];
  }
}
