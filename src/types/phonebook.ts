export type Contact = {
  id: string;
  name: string;
  number: string;
  category: string;
  note: string;
};

export const CATEGORIES = ['Ops', 'Handling', 'Compagnia', 'Aeroporto', 'Hotel', 'Altro'];

export const CATEGORY_COLORS: Record<string, string> = {
  'Ops':        '#F47B16',
  'Handling':   '#16A34A',
  'Compagnia':  '#FF6600',
  'Aeroporto':  '#7C3AED',
  'Hotel':      '#DB2777',
  'Altro':      '#64748B',
};

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
