/**
 * staffMonitor.ts
 * Fetches live gate / check-in / stand / belt data from the Pisa airport
 * staff monitoring page and exposes a lookup helper for FlightScreen.
 */

const STAFF_MONITOR_URL =
  'https://servizi.pisa-airport.com/staffMonitor/staffMonitor.html';
const FETCH_TIMEOUT_MS = 8000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffFlight = {
  gate?: string;
  checkIn?: string;
  stand?: string;
  belt?: string; // nastro bagagli
};

export type StaffMonitorData = {
  departures: Record<string, StaffFlight>; // normalized flightNum → data
  arrivals: Record<string, StaffFlight>;
  fetchedAt: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize flight number: remove spaces, uppercase, strip leading zeros from digits */
export function normalizeFlightNum(s: string): string {
  // e.g. "FR 1234" → "FR1234", "W4 0234" → "W4234", "EJU1234" → "EJU1234"
  return s
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/([A-Z]{1,3})0+(\d)/, '$1$2');
}

function findColIdx(headers: string[], ...keywords: string[]): number {
  return headers.findIndex(h =>
    keywords.some(kw => h.toLowerCase().includes(kw.toLowerCase())),
  );
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseTables(html: string): StaffMonitorData {
  const result: StaffMonitorData = {
    departures: {},
    arrivals: {},
    fetchedAt: Date.now(),
  };

  // Match every <table>…</table>
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  for (const tableMatch of html.matchAll(tableRe)) {
    const tableHtml = tableMatch[0];

    // All rows
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(
      m => m[1],
    );
    if (rows.length < 2) continue;

    // Header row: accept both <th> and <td>
    const headerCells = [
      ...rows[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
    ].map(m => stripHtml(m[1]).toLowerCase());

    // Must contain a "volo / flight / numero" column to be a flight table
    const voloIdx = findColIdx(
      headerCells,
      'volo',
      'flight',
      'numero',
      'n.volo',
      'n. volo',
    );
    if (voloIdx === -1) continue;

    // Identify columns by keyword
    const gateIdx    = findColIdx(headerCells, 'gate');
    const checkInIdx = findColIdx(headerCells, 'check', 'ci', 'banco', 'accettazione', 'desk');
    const standIdx   = findColIdx(headerCells, 'stand', 'piazzola', 'postaz', 'parcheggio');
    const beltIdx    = findColIdx(headerCells, 'nastro', 'belt', 'bagagli', 'riconsegna', 'tappeto', 'carousel');

    // Parse data rows (skip header)
    for (const row of rows.slice(1)) {
      const cells = [
        ...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
      ].map(m => stripHtml(m[1]));

      if (cells.length <= voloIdx) continue;
      const rawFlight = cells[voloIdx];
      if (!rawFlight) continue;

      const flightNum = normalizeFlightNum(rawFlight);
      // Skip rows that don't look like a flight number (e.g. empty/header repeated)
      if (!/^[A-Z0-9]{2,}\d+$/.test(flightNum)) continue;

      const data: StaffFlight = {};
      if (gateIdx    !== -1 && cells[gateIdx])    data.gate    = cells[gateIdx];
      if (checkInIdx !== -1 && cells[checkInIdx]) data.checkIn = cells[checkInIdx];
      if (standIdx   !== -1 && cells[standIdx])   data.stand   = cells[standIdx];
      if (beltIdx    !== -1 && cells[beltIdx])    data.belt    = cells[beltIdx];

      // Classify into departures / arrivals based on which fields are populated.
      // A row can appear in both if the table is mixed.
      if (data.gate || data.checkIn) {
        result.departures[flightNum] = {
          ...result.departures[flightNum],
          ...data,
        };
      }
      if (data.belt || (data.stand && !data.gate && !data.checkIn)) {
        result.arrivals[flightNum] = {
          ...result.arrivals[flightNum],
          stand: data.stand,
          belt:  data.belt,
        };
      }
    }
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchStaffMonitor(): Promise<StaffMonitorData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(STAFF_MONITOR_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.5',
      },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    return parseTables(html);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up a FR24 flight number in the staffMonitor data.
 * Tries several normalization strategies to handle codeshares and
 * differing airline-code formats between FR24 and staffMonitor.
 */
export function lookupStaff(
  data: StaffMonitorData,
  flightNumber: string,
  tab: 'departures' | 'arrivals',
): StaffFlight | null {
  const pool = tab === 'departures' ? data.departures : data.arrivals;
  if (!pool || Object.keys(pool).length === 0) return null;

  const normalized = normalizeFlightNum(flightNumber);

  // 1. Direct match
  if (pool[normalized]) return pool[normalized];

  // 2. Try without leading zeros in numeric part
  const noZero = normalized.replace(/([A-Z]{1,3})0*(\d+)/, (_, p, n) => p + String(parseInt(n, 10)));
  if (pool[noZero]) return pool[noZero];

  // 3. Match on numeric suffix only (covers codeshare: FR1234 ↔ W41234)
  const numSuffix = normalized.replace(/^[A-Z]+/, '');
  if (numSuffix.length >= 3) {
    const found = Object.entries(pool).find(([k]) =>
      k.replace(/^[A-Z]+/, '') === numSuffix,
    );
    if (found) return found[1];
  }

  return null;
}
