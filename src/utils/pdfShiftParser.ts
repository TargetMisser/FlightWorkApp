/**
 * Parses a shift-schedule PDF (base64) inside a WebView using pdf.js,
 * returns structured data: dates[], employees[{name, shifts[]}].
 *
 * The HTML/JS is injected into a hidden WebView by the caller.
 */

export type ParsedShift = { date: string; type: 'work' | 'rest'; start?: string; end?: string };
export type ParsedEmployee = { name: string; shifts: ParsedShift[] };
export type ParsedSchedule = { dates: string[]; employees: ParsedEmployee[] };

type Cell = { text: string; x: number; y: number; page: number };

export function parseShiftCells(cells: Cell[]): ParsedSchedule {
  // 1. Find dates (format dd/mm/yyyy) and build dynamic column ranges
  const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
  const dateCells = cells.filter(c => datePattern.test(c.text)).sort((a, b) => a.x - b.x);
  const dates = dateCells.map(c => {
    const [d, m, y] = c.text.split('/');
    return `${y}-${m}-${d}`; // ISO format
  });

  if (dates.length === 0) return { dates: [], employees: [] };

  // Build column ranges dynamically from date cell positions
  const colCenters = dateCells.map(c => c.x);
  const colRanges: { min: number; max: number }[] = colCenters.map((cx, i) => {
    const prev = i > 0 ? colCenters[i - 1] : cx - 80;
    const next = i < colCenters.length - 1 ? colCenters[i + 1] : cx + 80;
    return {
      min: (prev + cx) / 2,
      max: (cx + next) / 2,
    };
  });

  function colIndex(x: number): number {
    for (let i = 0; i < colRanges.length; i++) {
      if (x >= colRanges[i].min && x < colRanges[i].max) return i;
    }
    return -1;
  }

  // 2. Separate name cells (x < first column min) and shift cells
  const nameThreshold = colRanges[0].min;
  const nameCells = cells.filter(c => c.x < nameThreshold && !datePattern.test(c.text) && !/^(luned|marted|mercoled|gioved|venerd|sabato|domenica)/i.test(c.text));
  const shiftCells = cells.filter(c => c.x >= nameThreshold && !datePattern.test(c.text) && !/^(luned|marted|mercoled|gioved|venerd|sabato|domenica)/i.test(c.text));

  // 3. Group name cells into employee names (multi-line names within 20px y)
  const shiftPattern = /^\d{1,2}[,.:]\d{2}-\d{1,2}[,.:]\d{2,3}$/;
  const nameOnly = nameCells.filter(c => !shiftPattern.test(c.text) && c.text !== 'R' && c.text !== 'F');
  nameOnly.sort((a, b) => a.page - b.page || a.y - b.y);

  const employees: { name: string; y: number; page: number }[] = [];
  let i = 0;
  while (i < nameOnly.length) {
    let name = nameOnly[i].text;
    const baseY = nameOnly[i].y;
    const basePage = nameOnly[i].page;
    let j = i + 1;
    while (j < nameOnly.length && nameOnly[j].page === basePage && nameOnly[j].y - baseY < 20) {
      name += ' ' + nameOnly[j].text;
      j++;
    }
    employees.push({ name: name.trim(), y: baseY, page: basePage });
    i = j;
  }

  // 4. For each employee, find their shift values by matching nearby cells to columns
  const result: ParsedEmployee[] = employees.map(emp => {
    const nearby = shiftCells.filter(c => c.page === emp.page && Math.abs(c.y - emp.y) < 20);
    const shifts: ParsedShift[] = dates.map((date, di) => {
      const cell = nearby.find(c => colIndex(c.x) === di);
      if (!cell) return { date, type: 'rest' as const };
      if (cell.text.toUpperCase() === 'R' || cell.text.toUpperCase() === 'F') return { date, type: 'rest' as const };
      const match = cell.text.match(/^(\d{1,2})[,.:.](\d{2})-(\d{1,2})[,.:.](\d{2})/);
      if (match) {
        return {
          date,
          type: 'work' as const,
          start: `${match[1].padStart(2, '0')}:${match[2]}`,
          end: `${match[3].padStart(2, '0')}:${match[4]}`,
        };
      }
      return { date, type: 'rest' as const };
    });
    return { name: emp.name, shifts };
  });

  return { dates, employees: result };
}

/** HTML to inject into a hidden WebView for PDF text extraction */
export function getPdfExtractorHtml(base64Data: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs" type="module"></script>
</head><body><script type="module">
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs';

async function extract() {
  try {
    const raw = atob('${base64Data}');
    const uint8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

    const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
    const cells = [];

    for (let p = 0; p < pdf.numPages; p++) {
      const page = await pdf.getPage(p + 1);
      const content = await page.getTextContent();
      for (const item of content.items) {
        const text = item.str.trim();
        if (!text) continue;
        cells.push({
          text,
          x: Math.round(item.transform[4] * 10) / 10,
          y: Math.round((page.view[3] - item.transform[5]) * 10) / 10,
          page: p
        });
      }
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, cells }));
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ ok: false, error: e.message }));
  }
}
extract();
</script></body></html>`;
}
