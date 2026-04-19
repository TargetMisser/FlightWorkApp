export type StaffMonitorFlight = {
  flightNumber: string;
  stand?: string;
  checkin?: string;
  gate?: string;
  belt?: string;
};

/** Normalize flight number: FR07146 → FR7146, W405032 → W45032, U208320 → U28320.
 *  Handles both pure-letter IATA codes (FR, BA) and mixed codes (W4, U2, D8). */
export function normalizeFlightNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/^([A-Z][A-Z0-9]{1,2})0+([0-9])/, '$1$2');
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

type RawCell = { text: string; colspan: number };

function extractCellsRaw(trHTML: string): RawCell[] {
  const cells: RawCell[] = [];
  const regex = /<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(trHTML)) !== null) {
    const attrs = m[1];
    const text = stripHTML(m[2]);
    const csMatch = /colspan\s*=\s*["']?(\d+)/i.exec(attrs);
    const colspan = csMatch ? Math.max(1, parseInt(csMatch[1], 10)) : 1;
    cells.push({ text, colspan });
  }
  return cells;
}

function extractCells(trHTML: string): string[] {
  return extractCellsRaw(trHTML).map(c => c.text);
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

/**
 * Build absolute data-column positions from a header row.
 * Headers with colspan>1 span multiple data columns — e.g. "VOLO / FLIGHT"
 * with colspan=2 covers [logo_col, flight_number_col]. For the flight column
 * specifically, data rows put the flight code in the LAST sub-column.
 */
function detectColumns(headerRow: RawCell[]): ColMap | null {
  type HPos = { name: string; start: number; span: number };
  const positions: HPos[] = [];
  let col = 0;
  for (const h of headerRow) {
    positions.push({ name: h.text.toLowerCase().trim(), start: col, span: h.colspan });
    col += h.colspan;
  }

  const findPos = (pred: (n: string) => boolean) => positions.find(p => pred(p.name));

  const flightH = findPos(n => n.includes('volo') || n.includes('flight') || n.includes('flt') || n === 'num' || n.includes('numero'));
  if (!flightH) return null;

  // For "VOLO / FLIGHT" with colspan=2, logo is first sub-col, flight # is last.
  const flightCol = flightH.start + flightH.span - 1;

  const standH   = findPos(n => n.includes('stand') || n.includes('parch') || n.includes('posiz') || n === 'pos' || n.includes('piazzola') || n.includes('park'));
  const checkinH = findPos(n => n.includes('check') || n === 'c/i' || n === 'ci' || n === 'banco' || n.includes('desk') || n.includes('bancone'));
  // gate: match 'gate', 'uscita', 'imbarco' exactly (avoid partial matches on status cols)
  const gateH    = findPos(n => n === 'gate' || n === 'uscita' || n === 'imbarco' || n.includes('uscit'));
  const beltH    = findPos(n => n.includes('belt') || n.includes('nastro') || n.includes('tapis') || n.includes('baggage') || n.includes('reclam') || n.includes('bggl'));

  const map: ColMap = { flight: flightCol };
  if (standH)   map.stand   = standH.start;
  if (checkinH) map.checkin = checkinH.start;
  if (gateH)    map.gate    = gateH.start;
  if (beltH)    map.belt    = beltH.start;
  // Do NOT return null when only flight column is found — better to parse flight numbers
  // with empty stand/gate/belt than to skip every row because keyword didn't match.

  console.warn('[staffMonitor] columns detected:', JSON.stringify(map), '| headers:', positions.map(p => `${p.start}:"${p.name}"`).join(' '));
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
  if (!/^[A-Z0-9]{1,4}\d/i.test(token)) return null;
  // Require at least 2 chars and at least one letter to avoid matching pure numbers
  if (!/[A-Z]/i.test(token)) return null;
  return normalizeFlightNumber(token);
}

function parseSection(sectionHTML: string): StaffMonitorFlight[] {
  const results: StaffMonitorFlight[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  let colMap: ColMap | null = null;

  while ((match = trRegex.exec(sectionHTML)) !== null) {
    const rawCells = extractCellsRaw(match[1]);
    if (rawCells.length < 2) continue;

    if (!colMap) {
      colMap = detectColumns(rawCells);
      // Always skip this row whether it was the header or a pre-header title row.
      // If colMap is still null we'll keep trying on the next row.
      continue;
    }

    const cells = rawCells.map(c => c.text);
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

  if (!colMap) console.warn('[staffMonitor] header row never detected — table may use unknown column names');
  return results;
}

let _lastDebugStatus = 'init';
let _lastDebugHtml = '';
export function getStaffMonitorDebugStatus(): string { return _lastDebugStatus; }
export function getStaffMonitorDebugHtml(): string { return _lastDebugHtml; }

export async function fetchStaffMonitorData(nature: 'D' | 'A'): Promise<StaffMonitorFlight[]> {
  try {
    // The dynamic Tomcat servlet that returns real data. The static .html
    // wrapper is a saved-page frameset whose frame files don't exist on the server.
    const urls = [
      `https://servizi.pisa-airport.com/staffMonitor/staffMonitor?trans=true&nature=${nature}`,
      `https://servizi.pisa-airport.com/staffMonitor/staffMonitor?nature=${nature}`,
      `https://servizi.pisa-airport.com/staffMonitor/staffMonitor?nature=${nature}&aviation=1`,
    ];

    let html = '';
    for (const url of urls) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      try {
        const resp = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
              'Referer': 'https://servizi.pisa-airport.com/staffMonitor/staffMonitor.html',
            },
          });
        clearTimeout(timer);
        const body = await resp.text();
        _lastDebugStatus = `${nature}:${resp.status} len=${body.length}`;
        console.warn(`[staffMonitor] ${_lastDebugStatus} url=${url}`);
        // Accept any 200 OK; parser returns [] naturally for "no flights" pages
        if (resp.ok && body.length > 200) {
          html = body;
          if (nature === 'D') _lastDebugHtml = body.replace(/\s+/g, ' ').slice(0, 300);
          break;
        }
      } catch (e: any) {
        clearTimeout(timer);
        _lastDebugStatus = `${nature}:ERR ${String(e).slice(0, 60)}`;
        console.warn(`[staffMonitor] fetch error: ${_lastDebugStatus}`);
      }
    }

    if (!html) {
      console.warn('[staffMonitor] all URLs failed');
      return [];
    }

    if (__DEV__) {
      console.log(`[staffMonitor] nature=${nature} HTML sample:\n`, html.slice(0, 2000));
    }

    const results = parseSection(html);

    if (__DEV__) {
      console.log(`[staffMonitor] nature=${nature} → ${results.length} flights`, results.slice(0, 5));
    }

    return results;
  } catch (e) {
    console.error(`[staffMonitor] error for nature=${nature}:`, e);
    return [];
  }
}
