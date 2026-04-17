export type StaffMonitorFlight = {
  flightNumber: string;
  stand?: string;
  checkin?: string;
  gate?: string;
  belt?: string;
};

/** Normalize flight number: FR07146 → FR7146, FR00770 → FR770 */
export function normalizeFlightNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/^([A-Z]{2,3})0+([0-9])/, '$1$2');
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

/** Extract all cell contents from a <tr> — handles both <td> and <th> */
function extractCells(trHTML: string): string[] {
  const cells: string[] = [];
  const regex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(trHTML)) !== null) cells.push(stripHTML(m[1]));
  return cells;
}

/** Returns true if the string looks like a phone number (6+ digits) — used to reject junk. */
function isPhoneOrJunk(val: string): boolean {
  if (!val) return false;
  const digits = val.replace(/\D/g, '');
  return digits.length >= 6 || val.length > 15;
}

type ColMap = {
  flight: number;
  stand?: number;
  checkin?: number;
  gate?: number;
  belt?: number;
};

/**
 * Scan the HTML for a header row that contains recognisable column names and
 * build a map of field → column index. Falls back to the historically-observed
 * indices if no header can be found.
 */
function detectColumns(html: string, nature: 'D' | 'A'): ColMap {
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;

  while ((m = trRegex.exec(html)) !== null) {
    const cells = extractCells(m[1]).map(c => c.toLowerCase().trim());

    // Look for the row that contains a recognisable "flight number" header
    const flightIdx = cells.findIndex(c =>
      c === 'volo' || c === 'n. volo' || c === 'flight' || c === 'flt' || c === 'vol',
    );
    if (flightIdx === -1) continue;

    const standIdx   = cells.findIndex(c => c.includes('stand') || c.includes('parch'));
    const checkinIdx = cells.findIndex(c => c.includes('check') || c === 'c/i' || c === 'ci' || c === 'banco');
    const gateIdx    = cells.findIndex(c => c === 'gate' || c.includes('uscita') || c.includes('imbarco'));
    const beltIdx    = cells.findIndex(c => c.includes('belt') || c.includes('nastro') || c.includes('tapis'));

    const map: ColMap = { flight: flightIdx };
    if (standIdx   !== -1) map.stand   = standIdx;
    if (checkinIdx !== -1) map.checkin = checkinIdx;
    if (gateIdx    !== -1) map.gate    = gateIdx;
    if (beltIdx    !== -1) map.belt    = beltIdx;

    // Only accept this header row if we found at least one operational field
    if (map.stand !== undefined || map.checkin !== undefined || map.gate !== undefined || map.belt !== undefined) {
      if (__DEV__) console.log('[staffMonitor] detected columns:', map, '| sample headers:', cells);
      return map;
    }
  }

  // Fallback: historically-observed indices
  if (__DEV__) console.warn('[staffMonitor] header detection failed — using hardcoded indices');
  return nature === 'D'
    ? { flight: 1, stand: 12, checkin: 13, gate: 14 }
    : { flight: 1, stand: 11, belt: 12 };
}

function cell(cells: string[], idx: number | undefined): string | undefined {
  if (idx === undefined) return undefined;
  const v = cells[idx];
  if (!v || isPhoneOrJunk(v)) return undefined;
  return v;
}

/**
 * Fetch and parse stand/gate/check-in/belt data from the Pisa Airport staffMonitor.
 * Column positions are detected dynamically from the header row.
 */
export async function fetchStaffMonitorData(nature: 'D' | 'A'): Promise<StaffMonitorFlight[]> {
  try {
    const url = `https://servizi.pisa-airport.com/staffMonitor/staffMonitor?trans=true&nature=${nature}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[staffMonitor] HTTP ${resp.status} for nature=${nature}`);
      return [];
    }
    const html = await resp.text();
    const colMap = detectColumns(html, nature);

    const results: StaffMonitorFlight[] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match: RegExpExecArray | null;

    while ((match = trRegex.exec(html)) !== null) {
      const rowHTML = match[1];
      const cells = extractCells(rowHTML);
      if (cells.length < 2) continue;

      const rawFlight = cells[colMap.flight];
      if (!rawFlight) continue;
      // Accept only rows where the flight column looks like a real flight number
      if (!/^[A-Z]{2,3}\s*\d{1,5}$/i.test(rawFlight.trim())) continue;

      const flightNumber = normalizeFlightNumber(rawFlight);

      results.push({
        flightNumber,
        stand:   cell(cells, colMap.stand),
        checkin: cell(cells, colMap.checkin),
        gate:    cell(cells, colMap.gate),
        belt:    cell(cells, colMap.belt),
      });
    }

    if (__DEV__) {
      console.log(`[staffMonitor] nature=${nature} → ${results.length} flights`, results.slice(0, 5));
    }

    return results;
  } catch (e) {
    console.error(`[staffMonitor] error for nature=${nature}:`, e);
    return [];
  }
}
