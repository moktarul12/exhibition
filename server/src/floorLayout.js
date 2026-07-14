/** Normalize a custom row layout: each entry = stalls in that row. */
export function normalizeRowLayout(input, fallbackRows = 6, fallbackCols = 8) {
  let layout = null;
  if (Array.isArray(input) && input.length) {
    layout = input
      .map((n) => Math.min(Math.max(Number(n) || 0, 0), 24))
      .filter((n) => n > 0)
      .slice(0, 16);
  }
  if (!layout?.length) {
    const rowsN = Math.min(Math.max(Number(fallbackRows) || 6, 1), 16);
    const colsN = Math.min(Math.max(Number(fallbackCols) || 8, 1), 24);
    layout = Array.from({ length: rowsN }, () => colsN);
  }
  const grid_rows = layout.length;
  const grid_cols = Math.max(...layout);
  return { layout, grid_rows, grid_cols };
}

export const MARKER_KINDS = ['enter', 'exit', 'lounge', 'food', 'restroom', 'info', 'stage', 'clinic', 'custom'];

export function defaultHallMarkers() {
  return {
    entrance_label: 'Main entrance',
    exit_label: 'Exit / registration',
    items: [],
  };
}

export function normalizeMarkers(raw, parseJSON) {
  const base = defaultHallMarkers();
  if (!raw) return base;
  const parsed = typeof raw === 'string' ? parseJSON(raw, null) : raw;
  if (!parsed || typeof parsed !== 'object') return base;
  const items = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
  return {
    entrance_label: parsed.entrance_label != null ? String(parsed.entrance_label) : base.entrance_label,
    exit_label: parsed.exit_label != null ? String(parsed.exit_label) : base.exit_label,
    items: items.map((m, i) => ({
      id: String(m.id || `m-${i}-${m.kind || 'x'}`),
      kind: MARKER_KINDS.includes(m.kind) ? m.kind : 'custom',
      label: String(m.label || m.kind || 'Marker'),
      grid_row: Number(m.grid_row) || 0,
      grid_col: Number(m.grid_col) || 0,
      span_cols: Math.min(Math.max(Number(m.span_cols) || 1, 1), 6),
      span_rows: Math.min(Math.max(Number(m.span_rows) || 1, 1), 4),
    })),
  };
}

export function spansForSize(displaySize) {
  const s = String(displaySize || 'medium').toLowerCase();
  if (s === 'small') return { span_cols: 1, span_rows: 1, display_size: 'small' };
  if (s === 'large') return { span_cols: 2, span_rows: 1, display_size: 'large' };
  if (s === 'xlarge' || s === 'xl') return { span_cols: 2, span_rows: 2, display_size: 'xlarge' };
  return { span_cols: 1, span_rows: 1, display_size: 'medium' };
}

export function mapHall(h, parseJSON) {
  if (!h) return h;
  const stored = parseJSON(h.row_layout, null);
  const { layout } = normalizeRowLayout(stored, h.grid_rows, h.grid_cols);
  return {
    ...h,
    row_layout: layout,
    markers: normalizeMarkers(h.markers, parseJSON),
  };
}

/** Whether (row,col) is a valid stall cell for this layout. */
export function cellInLayout(layout, row, col) {
  if (row < 0 || col < 0 || row >= layout.length) return false;
  return col < layout[row];
}

/** All cells occupied by a rectangle. */
export function cellsCovered(row, col, spanRows = 1, spanCols = 1) {
  const out = [];
  for (let r = row; r < row + spanRows; r++) {
    for (let c = col; c < col + spanCols; c++) out.push({ row: r, col: c });
  }
  return out;
}

export function rectFitsLayout(layout, row, col, spanRows = 1, spanCols = 1) {
  const cells = cellsCovered(row, col, spanRows, spanCols);
  return cells.every(({ row: r, col: c }) => cellInLayout(layout, r, c));
}

export function rectsOverlap(a, b) {
  return !(
    a.col + a.span_cols <= b.col
    || b.col + b.span_cols <= a.col
    || a.row + a.span_rows <= b.row
    || b.row + b.span_rows <= a.row
  );
}
