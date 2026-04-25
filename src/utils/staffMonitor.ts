import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // Lookahead instead of requiring </td>: empty cells in the StaffMonitor HTML have no
  // closing tag (SLOT, BLKOFF, TKOFF in departures; LAND, BLKON, STATUS in pending arrivals).
  // Skipping those shifts every subsequent column index, breaking stand/gate/belt detection.
  const regex = /<t[dh]([^>]*)>([\s\S]*?)(?=<t[dh][\s>]|<\/t[rh]|$)/gi;
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

/** Reject phone numbers, names-with-phones, and other junk. */
function isPhoneOrJunk(val: string): boolean {
  if (!val) return false;
  if (val.length > 30) return true;
  // Catch "Albe 3284693677" style: any run of 8+ consecutive digits anywhere in the value
  if (/\d{8,}/.test(val)) return true;
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

  // Use word-boundary checks: 'stand' as a whole word to avoid matching "addetto stand" / "standby"
  const standH   = findPos(n => n === 'stand' || /\bstand\b/.test(n) || n.includes('parch') || n.includes('posiz') || n.includes('piazzola') || n === 'park');
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

  const headerStr = positions.map(p => `${p.start}:"${p.name}"`).join(' ');
  _lastDebugColumns = `map=${JSON.stringify(map)} | ${headerStr}`;
  console.warn('[staffMonitor] columns:', _lastDebugColumns);
  return map;
}

function cell(cells: string[], idx: number | undefined): string | undefined {
  if (idx === undefined) return undefined;
  const v = cells[idx]?.trim();
  if (!v || isPhoneOrJunk(v)) return undefined;
  // Extract only the leading operational code (stand "17", gate "674", desk "4").
  // Cells often contain extra text after the code: "17◆ Federico" or "674 RICCARDO F".
  const m = /^([A-Z0-9][A-Z0-9\-\/]{0,8})/i.exec(v);
  if (!m) return undefined;
  const code = m[1];
  // Reject pure-letter tokens of 3+ chars — handler abbreviations like "ana", "FEDE", "MARCO"
  if (/^[A-Za-z]{3,}$/.test(code)) return undefined;
  return code;
}

/** Extract flight number from a cell that may contain "FR03747 B738" — take first token only. */
function extractFlightCode(raw: string): string | null {
  const token = raw.trim().split(/\s+/)[0];
  if (!/^[A-Z0-9]{1,4}\d/i.test(token)) return null;
  // Require at least one letter to avoid matching pure numbers
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

  if (!colMap) { _lastDebugColumns = 'NESSUNA intestazione trovata'; console.warn('[staffMonitor] header row never detected'); }
  return results;
}

// ─── AsyncStorage flight cache (20-min TTL) ──────────────────────────────────────
const SM_CACHE_KEY = 'sm_flights_v2';

async function loadCached(nature: 'D' | 'A'): Promise<StaffMonitorFlight[] | null> {
  try {
    const raw = await AsyncStorage.getItem(SM_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    const e = c[nature];
    if (!e || Date.now() - e.ts > 20 * 60 * 1000) return null;
    return e.flights as StaffMonitorFlight[];
  } catch { return null; }
}

async function saveCache(nature: 'D' | 'A', flights: StaffMonitorFlight[]): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SM_CACHE_KEY) ?? '{}';
    const c = JSON.parse(raw);
    c[nature] = { flights, ts: Date.now() };
    await AsyncStorage.setItem(SM_CACHE_KEY, JSON.stringify(c));
  } catch {}
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────────
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  'Referer': 'https://servizi.pisa-airport.com/staffMonitor/staffMonitor.html',
};

// Tomcat JSESSIONID captured from D responses and forwarded to A requests.
// The arrivals servlet likely requires an active session; departures may not.
let _sessionCookie: string | null = null;

function captureSessionCookie(resp: Response): void {
  const raw = resp.headers.get('set-cookie') ?? '';
  const m = /JSESSIONID=([^;,\s]+)/i.exec(raw);
  if (m) {
    _sessionCookie = `JSESSIONID=${m[1]}`;
    console.warn('[staffMonitor] JSESSIONID captured');
  }
}

async function tryFetch(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { ...FETCH_HEADERS };
    if (_sessionCookie) headers['Cookie'] = _sessionCookie;

    const resp = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timer);
    captureSessionCookie(resp);
    const body = await resp.text();
    if (!resp.ok || body.length < 200) throw new Error(`${resp.status} len=${body.length}`);
    return body;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/**
 * Fire all URLs simultaneously and resolve with the first successful HTML.
 * Returns null only if every URL fails or times out.
 */
function raceUrls(urls: string[], timeoutMs: number): Promise<string | null> {
  return new Promise(resolve => {
    let done = false;
    let pending = urls.length;
    for (const url of urls) {
      tryFetch(url, timeoutMs)
        .then(html => { if (!done) { done = true; resolve(html); } })
        .catch(() => { pending--; if (pending === 0 && !done) { done = true; resolve(null); } });
    }
  });
}

/**
 * When a combined page (no nature filter) is fetched, split at <table> boundaries
 * and return the chunk whose surrounding text best matches the requested nature.
 */
function extractSectionFor(html: string, nature: 'D' | 'A'): string {
  const arrRx = /arriv[oi]|arrival|inbound/i;
  const depRx = /partenz|departur|outbound/i;
  const chunks = html.split(/(?=<table[\s>])/i).filter(s => /<tr[\s>]/i.test(s));
  if (chunks.length < 2) return html;

  let bestChunk = html;
  let bestScore = -99;
  for (const chunk of chunks) {
    const header = chunk.slice(0, 500);
    const score = nature === 'A'
      ? (arrRx.test(header) ? 2 : depRx.test(header) ? -1 : 0)
      : (depRx.test(header) ? 2 : arrRx.test(header) ? -1 : 0);
    if (score > bestScore) { bestScore = score; bestChunk = chunk; }
  }
  return bestScore > 0 ? bestChunk : html;
}

// ─── Debug state ──────────────────────────────────────────────────────────────────
let _lastDebugStatus = 'init';
let _lastDebugHtml = '';
let _lastDebugColumns = 'non ancora rilevate';
let _lastDebugFlightsD = 'nessun volo';
let _lastDebugFlightsA = 'nessun volo';
export function getStaffMonitorDebugStatus(): string { return _lastDebugStatus; }
export function getStaffMonitorDebugHtml(): string { return _lastDebugHtml; }
export function getStaffMonitorDebugColumns(): string { return _lastDebugColumns; }
export function getStaffMonitorDebugFlights(): string {
  return `D:\n${_lastDebugFlightsD}\n\nA:\n${_lastDebugFlightsA}`;
}

export async function fetchStaffMonitorData(nature: 'D' | 'A'): Promise<StaffMonitorFlight[]> {
  const base = 'https://servizi.pisa-airport.com/staffMonitor/staffMonitor';

  // Primary URLs for the requested nature
  const primaryUrls = [
    `${base}?trans=true&nature=${nature}`,
    `${base}?nature=${nature}`,
    `${base}?nature=${nature}&aviation=1`,
  ];

  // Extra variants for arrivals — all keep nature=A so the servlet returns arrivals data.
  // Do NOT add URLs without nature=A: they return departures and produce garbage parse results.
  const arrivalExtras = [
    `${base}?nature=A&trans=false`,
    `${base}?nature=A&airport=PSA`,
    `${base}?nature=A&refresh=1`,
    `${base}?nature=A&_=${Date.now()}`,
  ];

  try {
    let html = '';

    if (nature === 'D') {
      // Departures: sequential — server is slow, use 25s to avoid false timeouts
      for (const url of primaryUrls) {
        try {
          html = await tryFetch(url, 25_000);
          _lastDebugStatus = `D:200 len=${html.length}`;
          _lastDebugHtml = html.replace(/\s+/g, ' ').slice(0, 300);
          break;
        } catch (e: any) {
          _lastDebugStatus = `D:ERR ${String(e).slice(0, 60)}`;
          console.warn(`[staffMonitor] D fetch error: ${_lastDebugStatus}`);
        }
      }
    } else {
      // Prime session cookie via a quick D request if we don't have one yet.
      // The Tomcat arrivals servlet likely requires an active JSESSIONID.
      if (!_sessionCookie) {
        try {
          await tryFetch(`${base}?trans=true&nature=D`, 12_000);
          console.warn('[staffMonitor] session primed for A:', _sessionCookie ?? 'none');
        } catch {
          console.warn('[staffMonitor] session prime failed, proceeding anyway');
        }
      }

      // Race all nature=A variants in parallel — fastest wins
      html = await raceUrls([...primaryUrls, ...arrivalExtras], 40_000) ?? '';
      if (html) {
        _lastDebugStatus = `A:200 len=${html.length} cookie=${_sessionCookie ? 'yes' : 'no'}`;
        console.warn(`[staffMonitor] A parallel race succeeded len=${html.length}`);
      } else {
        _lastDebugStatus = `A:ERR all ${primaryUrls.length + arrivalExtras.length} URLs failed cookie=${_sessionCookie ? 'yes' : 'no'}`;
        console.warn(`[staffMonitor] ${_lastDebugStatus}`);
      }
    }

    if (!html) {
      console.warn(`[staffMonitor] all URLs failed for ${nature} — trying cache`);
      const cached = await loadCached(nature);
      if (cached) {
        _lastDebugStatus = `${nature}:CACHE(${cached.length})`;
        return cached;
      }
      return [];
    }

    if (__DEV__) console.log(`[staffMonitor] nature=${nature} HTML sample:\n`, html.slice(0, 2000));

    const results = parseSection(html);

    const summary = results.length === 0
      ? 'nessun volo parsato'
      : results.slice(0, 5).map(f => `${f.flightNumber} S=${f.stand ?? '-'} CI=${f.checkin ?? '-'} G=${f.gate ?? '-'} B=${f.belt ?? '-'}`).join('\n');
    if (nature === 'D') _lastDebugFlightsD = summary;
    else _lastDebugFlightsA = summary;

    if (results.length > 0) {
      await saveCache(nature, results);
      return results;
    }

    // Parse returned nothing — fall back to cache if available
    const cached = await loadCached(nature);
    if (cached && cached.length > 0) {
      _lastDebugStatus += '+CACHE';
      return cached;
    }
    return results;
  } catch (e) {
    console.error(`[staffMonitor] error for nature=${nature}:`, e);
    const cached = await loadCached(nature);
    return cached ?? [];
  }
}
