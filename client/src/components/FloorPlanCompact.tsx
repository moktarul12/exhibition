import type { CSSProperties } from 'react';
import type { Stall, FloorMarker, FloorGateSide, StallStatus } from '../types';
import { stallSpans, MARKER_META } from '../floorLayout';
import type { FootprintCell } from './FloorPlan2D';
import { Plus } from './icons';

/**
 * Compact schematic view — the whole hall as one flat outlined rectangle
 * with small pastel stall tiles, blueprint style.
 */

const CELL = 46;
const GAP = 6;
const ROW_GAP = 22;

const TONE: Record<StallStatus, { fill: string; border: string; text: string; dot: string; label: string }> = {
  available: { fill: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Available' },
  reserved: { fill: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Reserved' },
  booked: { fill: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-500', label: 'Booked' },
  blocked: { fill: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Blocked' },
  sponsor: { fill: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Sponsor' },
};

/** Flat pastel look for amenity blocks in this view. */
const MARKER_TONE: Record<string, string> = {
  enter: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  exit: 'bg-slate-100 border-slate-300 text-slate-600',
  fire: 'bg-red-50 border-red-300 text-red-600',
  stage: 'bg-violet-100 border-violet-300 text-violet-800',
  food: 'bg-orange-50 border-orange-200 text-orange-700',
  lounge: 'bg-amber-50 border-amber-200 text-amber-700',
  restroom: 'bg-sky-50 border-sky-200 text-sky-700',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  clinic: 'bg-teal-50 border-teal-200 text-teal-700',
  custom: 'bg-ink-50 border-ink-200 text-ink-600',
};

function Arrow({ dir, className = '' }: { dir: 'up' | 'down' | 'left' | 'right'; className?: string }) {
  const rot = { up: '-rotate-90', down: 'rotate-90', left: 'rotate-180', right: '' }[dir];
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${rot} ${className}`} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function GateTag({ kind, label, side }: { kind: 'enter' | 'exit'; label: string; side: FloorGateSide }) {
  const enter = kind === 'enter';
  const color = enter ? 'text-ink-700' : 'text-red-500';
  const arrowColor = 'text-red-500';
  const vertical = side === 'left' || side === 'right';

  if (vertical) {
    return (
      <div className={`flex flex-col items-center gap-1.5 ${color}`} title={label}>
        <Arrow dir={side === 'left' ? 'right' : 'left'} className={arrowColor} />
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {label}
        </span>
        <Arrow dir={side === 'left' ? 'right' : 'left'} className={arrowColor} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${color}`} title={label}>
      {side === 'bottom' && <Arrow dir="up" className={arrowColor} />}
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      {side === 'top' && <Arrow dir="down" className={arrowColor} />}
    </div>
  );
}

function GatesOnSide({
  side, entranceSide, exitSide, entranceLabel, exitLabel,
}: {
  side: FloorGateSide;
  entranceSide: FloorGateSide;
  exitSide: FloorGateSide;
  entranceLabel: string;
  exitLabel: string;
}) {
  const items: { kind: 'enter' | 'exit'; label: string }[] = [];
  if (entranceSide === side) items.push({ kind: 'enter', label: entranceLabel });
  if (exitSide === side) items.push({ kind: 'exit', label: exitLabel });
  if (!items.length) return null;
  const vertical = side === 'left' || side === 'right';
  return (
    <div className={vertical ? 'flex flex-col justify-center gap-6 self-stretch px-1' : `flex justify-center gap-10 ${side === 'top' ? 'mb-2' : 'mt-2'}`}>
      {items.map((g) => <GateTag key={`${side}-${g.kind}`} kind={g.kind} label={g.label} side={side} />)}
    </div>
  );
}

type Props = {
  layout: number[];
  stalls: Stall[];
  markers?: FloorMarker[];
  entranceLabel?: string;
  exitLabel?: string;
  entranceSide?: FloorGateSide;
  exitSide?: FloorGateSide;
  selectedId?: number | null;
  selectedIds?: Set<number>;
  selectedMarkerId?: string | null;
  search?: string;
  dimStall?: (stall: Stall) => boolean;
  onStallClick?: (stall: Stall, e: React.MouseEvent) => void;
  onMarkerClick?: (marker: FloorMarker) => void;
  onEmptyClick?: (row: number, col: number) => void;
  onAddToRow?: (row: number) => void;
  hoverCell?: { row: number; col: number } | null;
  onHoverCell?: (cell: { row: number; col: number } | null) => void;
  previewCells?: Set<string>;
  footprintCells?: FootprintCell[];
  justPlacedId?: number | null;
  pendingStallId?: number | null;
  absorbStallIds?: Set<number>;
  saving?: boolean;
  editMode?: boolean;
  dragging?: boolean;
  dragStallIds?: Set<number>;
  onStallDragStart?: (e: React.DragEvent, stall: Stall) => void;
  onStallDragEnd?: (e: React.DragEvent) => void;
  onMarkerDragStart?: (e: React.DragEvent, marker: FloorMarker) => void;
  onMarkerDragEnd?: (e: React.DragEvent) => void;
  onEmptyDragOver?: (e: React.DragEvent, row: number, col: number) => void;
  onEmptyDrop?: (e: React.DragEvent, row: number, col: number) => void;
  onEmptyDragLeave?: (row: number, col: number) => void;
  dragOverKey?: string | null;
  className?: string;
};

export default function FloorPlanCompact({
  layout,
  stalls,
  markers = [],
  entranceLabel = 'Main entrance',
  exitLabel = 'Exit / registration',
  entranceSide = 'top',
  exitSide = 'bottom',
  selectedId,
  selectedIds,
  selectedMarkerId,
  search = '',
  dimStall,
  onStallClick,
  onMarkerClick,
  onEmptyClick,
  onAddToRow,
  hoverCell,
  onHoverCell,
  previewCells,
  footprintCells,
  justPlacedId,
  pendingStallId,
  absorbStallIds,
  saving,
  editMode = false,
  dragging,
  dragStallIds,
  onStallDragStart,
  onStallDragEnd,
  onMarkerDragStart,
  onMarkerDragEnd,
  onEmptyDragOver,
  onEmptyDrop,
  onEmptyDragLeave,
  dragOverKey,
  className = '',
}: Props) {
  const stallsInRow = (row: number) => stalls.filter((s) => s.grid_row === row);

  /** Columns occupied in this row — includes footprints of taller stalls above. */
  const filledColsForRow = (row: number) => {
    const filled = new Set<number>();
    stalls.forEach((s) => {
      const { span_cols, span_rows } = stallSpans(s);
      if (row < s.grid_row || row >= s.grid_row + span_rows) return;
      for (let c = s.grid_col; c < s.grid_col + span_cols; c++) filled.add(c);
    });
    markers.forEach((m) => {
      const sc = m.span_cols || 1;
      const sr = m.span_rows || 1;
      if (row < m.grid_row || row >= m.grid_row + sr) return;
      for (let c = m.grid_col; c < m.grid_col + sc; c++) filled.add(c);
    });
    return filled;
  };

  const spanHeight = (spanRows: number) => spanRows * CELL + (spanRows - 1) * ROW_GAP;
  const isSelected = (id: number) => selectedId === id || !!selectedIds?.has(id);
  const footAt = (row: number, col: number) =>
    footprintCells?.find((cell) => cell.row === row && cell.col === col);

  return (
    <div className={`mx-auto w-full max-w-5xl ${className}`}>
      <div className="rounded-2xl border border-ink-100 bg-[#fafafc] p-3 sm:p-5">
        <GatesOnSide side="top" entranceSide={entranceSide} exitSide={exitSide} entranceLabel={entranceLabel} exitLabel={exitLabel} />

        <div className="flex items-stretch gap-2">
          <GatesOnSide side="left" entranceSide={entranceSide} exitSide={exitSide} entranceLabel={entranceLabel} exitLabel={exitLabel} />

          <div className="min-w-0 flex-1 overflow-x-auto">
            <div
              className="mx-auto rounded-lg border-2 border-dashed border-ink-300/70 bg-white p-4 sm:p-5"
              style={{ width: 'max-content', minWidth: '60%', paddingRight: editMode && onAddToRow ? 58 : undefined }}
            >
              <div className="flex flex-col" style={{ rowGap: ROW_GAP }}>
                {layout.map((rowLen, row) => {
                  const rowStalls = stallsInRow(row);
                  const rowMarkers = markers.filter((m) => m.grid_row === row);
                  const filledCols = filledColsForRow(row);
                  const hasTall =
                    rowStalls.some((s) => stallSpans(s).span_rows > 1) ||
                    rowMarkers.some((m) => (m.span_rows || 1) > 1);

                  return (
                    <div
                      key={`row-${row}`}
                      className="relative"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.max(rowLen, 1)}, ${CELL}px)`,
                        gridTemplateRows: `${CELL}px`,
                        gap: GAP,
                        alignItems: 'start',
                        zIndex: layout.length - row + (hasTall ? 8 : 0),
                      }}
                    >
                      {Array.from({ length: rowLen }).map((_, col) => {
                        if (filledCols.has(col)) return null;
                        const key = `${row}:${col}`;
                        const preview = previewCells?.has(key);
                        const hover = hoverCell?.row === row && hoverCell?.col === col;
                        const foot = footAt(row, col);
                        const footprintTone =
                          foot?.kind === 'blocked' || foot?.kind === 'oob'
                            ? 'border-red-400 bg-red-100 ring-2 ring-red-300'
                            : foot?.kind === 'absorb'
                              ? 'border-amber-400 bg-amber-100 ring-2 ring-amber-300'
                              : foot
                                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-300'
                                : '';
                        const style: CSSProperties = {
                          gridColumn: col + 1,
                          gridRow: 1,
                          width: CELL,
                          height: CELL,
                        };
                        if (editMode) {
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={saving}
                              onClick={() => onEmptyClick?.(row, col)}
                              onMouseEnter={() => onHoverCell?.({ row, col })}
                              onMouseLeave={() => onHoverCell?.(null)}
                              onDragOver={(e) => onEmptyDragOver?.(e, row, col)}
                              onDrop={(e) => onEmptyDrop?.(e, row, col)}
                              onDragLeave={() => onEmptyDragLeave?.(row, col)}
                              style={style}
                              title={`Add at row ${row + 1}, bay ${col + 1}`}
                              className={`grid place-items-center rounded-md border border-dashed text-base transition-all ${
                                dragOverKey === key || preview || hover
                                  ? 'scale-105 border-brand-500 bg-brand-50 text-brand-600 shadow-sm'
                                  : 'border-ink-200 bg-ink-50/40 text-ink-300 hover:border-brand-300 hover:text-brand-500'
                              } ${footprintTone}`}
                            >
                              +
                            </button>
                          );
                        }
                        return (
                          <div
                            key={key}
                            className="rounded-md border border-dashed border-ink-200/70 bg-ink-50/40"
                            style={style}
                          />
                        );
                      })}

                      {rowStalls.map((stall) => {
                        const { span_cols, span_rows } = stallSpans(stall);
                        const tone = TONE[stall.status];
                        const sel = isSelected(stall.id);
                        const match =
                          search &&
                          (stall.code.includes(search) || (stall.company_name || '').toUpperCase().includes(search));
                        const dim = dimStall ? dimStall(stall) : false;
                        const beingDragged = dragging && (dragStallIds?.has(stall.id) || sel);
                        const absorbs = absorbStallIds?.has(stall.id);
                        const style: CSSProperties = {
                          gridColumn: `${stall.grid_col + 1} / span ${span_cols}`,
                          gridRow: 1,
                          height: spanHeight(span_rows),
                          width: '100%',
                          zIndex: span_rows > 1 ? 20 : 5,
                          opacity: dim ? 0.25 : beingDragged ? 0.4 : 1,
                          alignSelf: 'start',
                        };
                        return (
                          <button
                            key={stall.id}
                            type="button"
                            draggable={editMode && !!onStallDragStart}
                            onDragStart={(e) => onStallDragStart?.(e, stall)}
                            onDragEnd={onStallDragEnd}
                            onDragOver={(e) => onEmptyDragOver?.(e, stall.grid_row, stall.grid_col)}
                            onDrop={(e) => onEmptyDrop?.(e, stall.grid_row, stall.grid_col)}
                            onClick={(e) => onStallClick?.(stall, e)}
                            title={stall.company_name ? `${stall.code} · ${stall.company_name}` : stall.code}
                            style={style}
                            className={`relative grid place-items-center rounded-md border text-[10px] font-bold leading-tight transition-all hover:shadow-md ${tone.fill} ${tone.border} ${tone.text} ${
                              sel ? 'border-dashed border-violet-500 ring-2 ring-violet-400 ring-offset-1' : ''
                            } ${match ? 'animate-glow-pulse' : ''} ${
                              justPlacedId === stall.id ? 'animate-pop' : ''
                            } ${pendingStallId === stall.id ? 'ring-2 ring-amber-500 ring-offset-1' : ''} ${
                              absorbs ? 'ring-2 ring-amber-400 ring-offset-1' : ''
                            } ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          >
                            <span className="px-0.5 text-center">{stall.code}</span>
                            {absorbs && (
                              <span className="absolute inset-x-0 top-0 bg-amber-500 py-px text-[6px] uppercase text-white">
                                Merge
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {rowMarkers.map((m) => {
                        const sc = m.span_cols || 1;
                        const sr = m.span_rows || 1;
                        const toneCls = MARKER_TONE[m.kind] || MARKER_TONE.custom;
                        const label = m.label || (MARKER_META[m.kind] || MARKER_META.custom).label;
                        const markerDragging = dragging && selectedMarkerId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            draggable={editMode && !!onMarkerDragStart}
                            onDragStart={(e) => onMarkerDragStart?.(e, m)}
                            onDragEnd={onMarkerDragEnd}
                            onClick={() => onMarkerClick?.(m)}
                            onDragOver={(e) => onEmptyDragOver?.(e, m.grid_row, m.grid_col)}
                            onDrop={(e) => onEmptyDrop?.(e, m.grid_row, m.grid_col)}
                            title={label}
                            style={{
                              gridColumn: `${m.grid_col + 1} / span ${sc}`,
                              gridRow: 1,
                              height: spanHeight(sr),
                              width: '100%',
                              zIndex: sr > 1 ? 18 : 4,
                              alignSelf: 'start',
                              opacity: markerDragging ? 0.4 : 1,
                            }}
                            className={`grid place-items-center rounded-md border px-0.5 text-center text-[9px] font-bold uppercase tracking-wide ${toneCls} ${
                              selectedMarkerId === m.id ? 'ring-2 ring-violet-400 ring-offset-1' : ''
                            } ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          >
                            {label}
                          </button>
                        );
                      })}

                      {editMode && onAddToRow && (
                        <button
                          type="button"
                          disabled={saving || rowLen >= 24}
                          onClick={() => onAddToRow(row)}
                          title={`Extend row ${row + 1}`}
                          className="absolute -right-11 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border border-dashed border-brand-300 bg-white text-brand-600 shadow-sm transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-40"
                        >
                          <Plus width={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <GatesOnSide side="right" entranceSide={entranceSide} exitSide={exitSide} entranceLabel={entranceLabel} exitLabel={exitLabel} />
        </div>

        <GatesOnSide side="bottom" entranceSide={entranceSide} exitSide={exitSide} entranceLabel={entranceLabel} exitLabel={exitLabel} />

        {/* Legend only on public view — admin already has a footer legend */}
        {!editMode && (
          <div className="mt-4 inline-flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-ink-100 bg-white px-3.5 py-2">
            {(Object.keys(TONE) as StallStatus[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
                <span className={`h-2.5 w-2.5 rounded-[3px] ${TONE[k].dot}`} /> {TONE[k].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-violet-500" /> Selected
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
