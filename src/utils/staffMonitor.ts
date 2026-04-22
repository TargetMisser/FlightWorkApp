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

type HeaderColumns = {
  flight?: number;
  stand?: number;
  checkin?: number;
  gate?: number;
  belt?: number;
};

type StaffMonitorColumnOffsets = {
  stand?: number;
  checkin?: number;
  gate?: number;
  belt?: number;
};

/** Normalize flight number: FR07146 → FR7146, FR00770 → FR770 */
export function normalizeFlightNumber(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact.replace(/^([A-Z]{2,3})0+([0-9])/, '$1$2');
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

function normalizeHeaderToken(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '');
}

function extractColumnsFromHeader(cells: StaffMonitorCell[]): HeaderColumns {
  const columns: HeaderColumns = {};

  for (let i = 0; i < cells.length; i++) {
    const token = normalizeHeaderToken(cells[i].text);
    if (!token) continue;

    if (token === 'VOLOFLIGHT' || token === 'FLIGHT' || token === 'VOLO') {
      columns.flight = i;
      continue;
    }
    if (token === 'STAND') {
      columns.stand = i;
      continue;
    }
    if (token === 'CHECKIN' || token === 'CHECKINDESK' || token === 'CHECKINDESKS') {
      columns.checkin = i;
      continue;
    }
    if (token === 'GATE') {
      columns.gate = i;
      continue;
    }
    if (token === 'BELT' || token === 'NASTROBELT' || token === 'NASTRO') {
      columns.belt = i;
      continue;
    }
  }

  return columns;
}

function hasAtLeastOneColumn(columns: HeaderColumns, nature: 'D' | 'A'): boolean {
  if (nature === 'D') {
    return columns.stand !== undefined || columns.checkin !== undefined || columns.gate !== undefined;
  }
  return columns.stand !== undefined || columns.belt !== undefined;
}

function toOffsets(columns: HeaderColumns): StaffMonitorColumnOffsets {
  if (columns.flight === undefined) return {};
  const offsets: StaffMonitorColumnOffsets = {};
  if (columns.stand !== undefined) offsets.stand = columns.stand - columns.flight;
  if (columns.checkin !== undefined) offsets.checkin = columns.checkin - columns.flight;
  if (columns.gate !== undefined) offsets.gate = columns.gate - columns.flight;
  if (columns.belt !== undefined) offsets.belt = columns.belt - columns.flight;
  return offsets;
}

function isPhoneOrJunk(value: string): boolean {
  // Reject anything that looks like a phone number (8+ digits anywhere).
  if ((value.match(/\d/g) || []).length >= 8) return true;
  return false;
}

function sanitizeStandGateBelt(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase().trim();
  if (!upper || isPhoneOrJunk(upper)) return undefined;

  const tokenWithDigits = upper.match(/\b[A-Z]*\d+[A-Z]*\b/);
  if (tokenWithDigits) return tokenWithDigits[0];

  const shortAlphaToken = upper.match(/\b[A-Z]\b/);
  return shortAlphaToken ? shortAlphaToken[0] : undefined;
}

function sanitizeCheckin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = value
    .toUpperCase()
    .replace(/[^0-9A-Z\s\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean || isPhoneOrJunk(clean) || !/\d/.test(clean)) return undefined;
  return clean;
}

/**
 * Fetch and parse stand/gate/check-in data from the Pisa Airport staffMonitor.
 *
 * We resolve columns from header labels when available, with an offset fallback
 * from the flight-number cell for layout variants.
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
    let offsets: StaffMonitorColumnOffsets = {};

    while ((match = trRegex.exec(html)) !== null) {
      const rowHTML = match[1];

      const cells = extractTDCells(rowHTML);
      if (cells.length < 2) continue;

      const headerColumns = extractColumnsFromHeader(cells);
      if (headerColumns.flight !== undefined || hasAtLeastOneColumn(headerColumns, nature)) {
        offsets = { ...offsets, ...toOffsets(headerColumns) };
      }

      const flightCellIndexFromClass = cells.findIndex(cell => /\bclsFlight\b/i.test(cell.className));
      const flightCellIndex = flightCellIndexFromClass;
      if (flightCellIndex === -1) continue;

      const rawFlight = getCellText(cells, flightCellIndex);
      if (!rawFlight) continue;

      const flightNumber = normalizeFlightNumber(rawFlight);
      if (!flightNumber || flightNumber === 'VOLOFLIGHT') continue;

      if (nature === 'D') {
        const standIdx = flightCellIndex + (offsets.stand ?? 11);
        const checkinIdx = flightCellIndex + (offsets.checkin ?? 12);
        const gateIdx = flightCellIndex + (offsets.gate ?? 13);
        results.push({
          flightNumber,
          stand: sanitizeStandGateBelt(getCellText(cells, standIdx)),
          checkin: sanitizeCheckin(getCellText(cells, checkinIdx)),
          gate: sanitizeStandGateBelt(getCellText(cells, gateIdx)),
        });
      } else {
        const standIdx = flightCellIndex + (offsets.stand ?? 10);
        const beltIdx = flightCellIndex + (offsets.belt ?? 11);
        results.push({
          flightNumber,
          stand: sanitizeStandGateBelt(getCellText(cells, standIdx)),
          belt: sanitizeStandGateBelt(getCellText(cells, beltIdx)),
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
