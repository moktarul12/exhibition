import type { Hall, FloorMarkers, FloorMarker, Stall } from './types';

/** Resolve per-row stall counts for a hall (supports irregular layouts). */
export function hallRowLayout(hall?: Hall | null): number[] {
  if (!hall) return [8, 8, 8, 8, 8, 8];
  if (Array.isArray(hall.row_layout) && hall.row_layout.length) {
    return hall.row_layout.map((n) => Math.max(1, Number(n) || 1));
  }
  const rows = hall.grid_rows || 6;
  const cols = hall.grid_cols || 8;
  return Array.from({ length: rows }, () => cols);
}

export function layoutStallTotal(layout: number[]) {
  return layout.reduce((s, n) => s + n, 0);
}

export function hallMarkers(hall?: Hall | null): FloorMarkers {
  const m = hall?.markers;
  return {
    entrance_label: m?.entrance_label || 'Main entrance',
    exit_label: m?.exit_label || 'Exit / registration',
    items: Array.isArray(m?.items) ? m!.items : [],
  };
}

export function stallSpans(s: Pick<Stall, 'span_cols' | 'span_rows' | 'display_size'>) {
  const cols = Math.max(1, Number(s.span_cols) || 1);
  const rows = Math.max(1, Number(s.span_rows) || 1);
  return { span_cols: cols, span_rows: rows, display_size: s.display_size || 'medium' };
}

export function coversCell(
  item: { grid_row: number; grid_col: number; span_cols?: number; span_rows?: number },
  row: number,
  col: number,
) {
  const sc = Number(item.span_cols) || 1;
  const sr = Number(item.span_rows) || 1;
  return row >= item.grid_row && row < item.grid_row + sr
    && col >= item.grid_col && col < item.grid_col + sc;
}

export function occupiedOriginMap(stalls: Stall[], markers: FloorMarker[]) {
  const map = new Map<string, { type: 'stall' | 'marker'; stall?: Stall; marker?: FloorMarker }>();
  for (const s of stalls) {
    const { span_cols, span_rows } = stallSpans(s);
    for (let r = s.grid_row; r < s.grid_row + span_rows; r++) {
      for (let c = s.grid_col; c < s.grid_col + span_cols; c++) {
        // Only render origin cell as the stall chrome; mark covered for collision
        if (r === s.grid_row && c === s.grid_col) map.set(`${r}:${c}`, { type: 'stall', stall: s });
        else map.set(`${r}:${c}`, { type: 'stall', stall: s }); // covered
      }
    }
  }
  // Re-set origins only for primary rendering helpers — track separately
  for (const m of markers) {
    const sc = m.span_cols || 1;
    const sr = m.span_rows || 1;
    for (let r = m.grid_row; r < m.grid_row + sr; r++) {
      for (let c = m.grid_col; c < m.grid_col + sc; c++) {
        map.set(`${r}:${c}`, { type: 'marker', marker: m });
      }
    }
  }
  return map;
}

export const MARKER_META: Record<string, { label: string; className: string }> = {
  enter: { label: 'Enter', className: 'bg-emerald-600 text-white border-emerald-700' },
  exit: { label: 'Exit', className: 'bg-slate-700 text-white border-slate-800' },
  lounge: { label: 'Lounge', className: 'bg-amber-100 text-amber-900 border-amber-300' },
  food: { label: 'Food', className: 'bg-orange-100 text-orange-900 border-orange-300' },
  restroom: { label: 'Washroom', className: 'bg-sky-100 text-sky-900 border-sky-300' },
  info: { label: 'Info', className: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  stage: { label: 'Stage', className: 'bg-violet-100 text-violet-900 border-violet-300' },
  clinic: { label: 'Clinic', className: 'bg-teal-100 text-teal-900 border-teal-300' },
  fire: { label: 'Fire Exit', className: 'bg-red-500 text-white border-red-600' },
  custom: { label: 'Zone', className: 'bg-ink-100 text-ink-700 border-ink-300' },
};

export const SIZE_META = {
  small: { label: 'Small', hint: '1×1 compact' },
  medium: { label: 'Medium', hint: '1×1 standard' },
  large: { label: 'Large', hint: '2×1 wide' },
  xlarge: { label: 'XL', hint: '2×2 island' },
} as const;
