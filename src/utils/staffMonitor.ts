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
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCells(trHTML: string): string[] {
  const cells: string[] = [];
  const regex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(trHTML)) !== null) cells.push(stripHTML(m[1]));
  return cells;
}

/** Reject only obvious junk: very long strings or 8+ continuous digits (phone-like). */
function isPhoneOrJunk(val: string): boolean {
  if (!val) return false;
  if (val.length > 30) return true;
  if (/^\d{8,}$/.test(val.trim())) return true;
  return false;
}

type ColMap = {
  flight: number;
  stand?: number;
  checkin?: number;
  gate?: number;
  belt?: number;
};

function detectColumns(headerCells: string[], nature: 'D' | 'A'): ColMap | null {
  const cells = headerCells.map(c => c.toLowerCase().trim());

  // Flight column: "VOLO / FLIGHT", "VOLO", "FLIGHT", etc.
  const flightIdx = cells.findIndex(c => c.includes('volo') || c.includes('flight') || c === 'flt');
  if (flightIdx === -1) return null;

  const standIdx   = cells.findIndex(c => c.includes('stand') || c.includes('parch'));
  const checkinIdx = cells.findIndex(c => c.includes('check') || c === 'c/i' || c === 'ci' || c === 'banco');
  const gateIdx    = cells.findIndex(c => c === 'gate' || c.includes('uscita') || c.includes('imbarco'));
  const beltIdx    = cells.findIndex(c => c.includes('belt') || c.includes('nastro') || c.includes('tapis'));

  const map: ColMap = { flight: flightIdx };
  if (standIdx   !== -1) map.stand   = standIdx;
  if (checkinIdx !== -1) map.checkin = checkinIdx;
  if (gateIdx    !== -1) map.gate    = gateIdx;
  if (beltIdx    !== -1) map.belt    = beltIdx;

  if (map.stand === undefined && map.checkin === undefined && map.gate === undefined && map.belt === undefined) {
    return null;
  }

  if (__DEV__) console.log('[staffMonitor] detected columns:', map, '| headers:', cells);
  return map;
}

function cell(cells: string[], idx: number | undefined): string | undefined {
  if (idx === undefined) return undefined;
  const v = cells[idx];
  if (!v || isPhoneOrJunk(v)) return undefined;
  return v;
}

/** Extract flight number from a cell that may contain "FR03747 B738" — take first token only. */
function extractFlightCode(raw: string): string | null {
  const token = raw.trim().split(/\s+/)[0];
  if (!/^[A-Z]{1,3}\d/i.test(token)) return null;
  return normalizeFlightNumber(token);
}

function parseSection(sectionHTML: string, nature: 'D' | 'A'): StaffMonitorFlight[] {
  const results: StaffMonitorFlight[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  let colMap: ColMap | null = null;

  while ((match = trRegex.exec(sectionHTML)) !== null) {
    const cells = extractCells(match[1]);
    if (cells.length < 2) continue;

    // Try to detect the header row
    if (!colMap) {
      colMap = detectColumns(cells, nature);
      continue; // header row is not a data row
    }

    const rawFlight = cells[colMap.flight] ?? '';
    const flightNumber = extractFlightCode(rawFlight);
    if (!flightNumber) continue;

    results.push({
      flightNumber,
      stand:   cell(cells, colMap.stand),
      checkin: cell(cells, colMap.checkin),
      gate:    cell(cells, colMap.gate),
      belt:    cell(cells, colMap.belt),
    });
  }

  return results;
}

export async function fetchStaffMonitorData(nature: 'D' | 'A'): Promise<StaffMonitorFlight[]> {
  try {
    // The staffMonitor.html page is a frameset that loads separate HTML files
    // per section — we fetch the frame directly for the requested nature.
    const base = 'https://servizi.pisa-airport.com/staffMonitor/StaffMonitor_files';
    const frameFile = nature === 'D' ? 'staffMonitor_002.htm' : 'staffMonitor_003.htm';
    const urls = [
      `${base}/${frameFile}?aviation=1`,
      `${base}/${frameFile}`,
      // legacy fallback
      `https://servizi.pisa-airport.com/staffMonitor/staffMonitor?trans=true&nature=${nature}`,
    ];

    let html = '';
    for (const url of urls) {
      try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (resp.ok) {
          const body = await resp.text();
          if (body && body.length > 500) { html = body; break; }
        }
      } catch {}
    }

    if (!html) {
      console.warn('[staffMonitor] all URLs failed');
      return [];
    }

    if (__DEV__) {
      console.log(`[staffMonitor] nature=${nature} HTML sample:\n`, html.slice(0, 3000));
    }

    const results = parseSection(html, nature);

    if (__DEV__) {
      console.log(`[staffMonitor] nature=${nature} → ${results.length} flights`, results.slice(0, 5));
    }

    return results;
  } catch (e) {
    console.error(`[staffMonitor] error for nature=${nature}:`, e);
    return [];
  }
}
