// src/utils/staffMonitor.ts

export type StaffMonitorInfo = {
  stand: string;   // es. "27"
  checkin: string; // es. "17" oppure "33 / 34" per più banchi
  gate: string;    // es. "11"
};

const BASE_URL = 'https://servizi.pisa-airport.com/staffMonitor/staffMonitor';
const TIMEOUT_MS = 8_000;

/**
 * Rimuove gli zeri iniziali dalla parte numerica del numero volo.
 * Il codice IATA è sempre i primi 2 caratteri (lettere o cifre).
 *   FR08973  → FR8973
 *   U202490  → U22490
 *   HV05424  → HV5424
 */
function normalizeFlightNumber(raw: string): string {
  const s = raw.trim().toUpperCase();  // normalizza a maiuscolo per match con dati FR24
  if (s.length < 3) return s;
  const iata = s.slice(0, 2);
  const num = parseInt(s.slice(2), 10);
  if (isNaN(num)) return s;
  return `${iata}${num}`;
}

/** Rimuove tutti i tag HTML e decodifica le entity comuni. */
function extractText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')  // converti <br> in newline prima di strippare i tag
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

/**
 * Estrae il contenuto di ogni TD da un blocco TR.
 * Normalizza i TD self-closing (<TD ... />) prima del parsing.
 */
function extractCells(rowHtml: string): string[] {
  const normalised = rowHtml.replace(/<TD(\s[^>]*)?\s*\/>/gi, '<TD$1></TD>');
  const cells: string[] = [];
  const tdRe = /<TD(?:\s[^>]*)?>([\s\S]*?)<\/TD>/gi;
  let m: RegExpExecArray | null;
  while ((m = tdRe.exec(normalised)) !== null) {
    cells.push(m[1]);
  }
  return cells;
}

/**
 * Parsa una riga della tabella (array di celle) estraendo:
 *   - colonna 1:  numero volo (class="clsFlight")
 *   - colonna 12: stand
 *   - colonna 13: banco/i check-in
 *   - colonna 14: gate
 */
function parseRow(cells: string[]): { flightNumber: string; info: StaffMonitorInfo } | null {
  if (cells.length < 15) return null;

  const rawFlight = extractText(cells[1]);
  if (!rawFlight || rawFlight.length < 3) return null;
  // Solo righe con codice IATA valido (2 alfanumerici + cifre)
  if (!/^[A-Z0-9]{2}\d+$/i.test(rawFlight)) return null;

  const flightNumber = normalizeFlightNumber(rawFlight);

  const stand = extractText(cells[12]).replace(/°/g, '').trim();

  // Il banco CI può avere più valori su righe separate, es. "33°\n34°"
  const checkin = extractText(cells[13])
    .split(/[\n\r]+/)
    .map(d => d.replace(/°/g, '').trim())
    .filter(d => d.length > 0)
    .join(' / ');

  const gate = extractText(cells[14]).replace(/°/g, '').trim();

  return { flightNumber, info: { stand, checkin, gate } };
}

/** Parsa una pagina HTML del monitor in una Map flightNumber → StaffMonitorInfo. */
function parseHtml(html: string): Map<string, StaffMonitorInfo> {
  const result = new Map<string, StaffMonitorInfo>();
  const trRe = /<TR(?:\s[^>]*)?>([\s\S]*?)<\/TR>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const parsed = parseRow(extractCells(trMatch[1]));
    if (parsed) result.set(parsed.flightNumber, parsed.info);
  }
  return result;
}

async function fetchPage(nature: 'D' | 'A', signal: AbortSignal): Promise<string> {
  const res = await fetch(`${BASE_URL}?trans=true&nature=${nature}`, { signal });
  if (!res.ok) throw new Error(`staffMonitor ${nature}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Fetcha e parsa le pagine partenze (D) e arrivi (A) dello StaffMonitor di Pisa in parallelo.
 *
 * Restituisce una Map keyed per numero volo normalizzato (es. "FR8973") con
 * i dati operativi reali: stand, banco check-in, gate.
 *
 * Non rigetta mai — restituisce Map vuota in caso di qualsiasi errore.
 */
export async function fetchStaffMonitorData(): Promise<Map<string, StaffMonitorInfo>> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const [depHtml, arrHtml] = await Promise.all([
      fetchPage('D', controller.signal),
      fetchPage('A', controller.signal),
    ]);
    // Arrival data ha precedenza sulle departure per voli in transito/turnaround (intenzionale)
    return new Map<string, StaffMonitorInfo>([
      ...parseHtml(depHtml),
      ...parseHtml(arrHtml),
    ]);
  } catch (err) {
    controller.abort(); // cancella l'eventuale fetch gemella ancora in volo
    if (__DEV__) console.warn('[staffMonitor] fetch failed:', err);
    return new Map();
  } finally {
    clearTimeout(tid);
  }
}
