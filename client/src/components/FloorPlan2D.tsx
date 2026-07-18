import type { CSSProperties, ReactNode } from 'react';
import type { Stall, FloorMarker, FloorGateSide } from '../types';
import { stallSpans, MARKER_META } from '../floorLayout';
import { stallColors } from './ui';
import { Plus } from './icons';

const CELL = 56;
const STALL_GAP = 8;
const AISLE_H = 44;
/** Matches bay `p-3` (12px) + aisle `my-1` (4px) each side */
const BAY_PAD_Y = 12;
const AISLE_MY = 4;

/** Vertical size of a stall that spans N layout rows (includes aisle between bays). */
function spanBlockHeight(spanRows: number) {
  if (spanRows <= 1) return CELL;
  const betweenRows = BAY_PAD_Y + AISLE_MY + AISLE_H + AISLE_MY + BAY_PAD_Y;
  return spanRows * CELL + (spanRows - 1) * betweenRows;
}

function GateRibbon({
  kind,
  label,
  side,
}: {
  kind: 'enter' | 'exit';
  label: string;
  side: FloorGateSide;
}) {
  const enter = kind === 'enter';
  const vertical = side === 'left' || side === 'right';
  const bg = enter
    ? 'linear-gradient(90deg, #047857, #10b981)'
    : 'linear-gradient(90deg, #cbd5e1, #94a3b8)';
  const text = enter ? 'text-white' : 'text-ink-700';

  if (vertical) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center self-stretch rounded-[1.25rem] px-2 shadow-md ${text}`}
        style={{
          background: bg,
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: side === 'left' ? 'rotate(180deg)' : undefined,
          minWidth: 44,
        }}
        title={label}
      >
        <span className="py-4 text-[11px] font-bold uppercase tracking-[0.2em]">{label}</span>
      </div>
    );
  }

  return (
    <div className={side === 'top' ? 'mb-5' : 'mt-5'}>
      {side === 'bottom' && (
        <div className="mx-auto mt-1 h-2 w-2/3 max-w-xs rounded-t-2xl bg-ink-300/30" />
      )}
      <div
        className={`mx-auto flex max-w-md items-center justify-center gap-2 rounded-[1.25rem] py-3 text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg ${text}`}
        style={{ background: bg }}
      >
        {enter && <span className="h-2 w-2 animate-pulse rounded-full bg-white/90" />}
        {label}
      </div>
      {side === 'top' && (
        <div className="mx-auto mt-1 h-2 w-2/3 max-w-xs rounded-b-2xl bg-emerald-700/20" />
      )}
    </div>
  );
}

function GatesOnSide({
  side,
  entranceSide,
  exitSide,
  entranceLabel,
  exitLabel,
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
    <div className={vertical ? 'flex flex-col gap-2 self-stretch' : 'w-full'}>
      {items.map((g) => (
        <GateRibbon key={`${side}-${g.kind}`} kind={g.kind} label={g.label} side={side} />
      ))}
    </div>
  );
}

export type FootprintCell = {
  key: string;
  row: number;
  col: number;
  kind: 'self' | 'free' | 'empty' | 'absorb' | 'blocked' | 'oob';
};

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
  dimUnavailable?: boolean;
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
  overlay?: ReactNode;
};

/**
 * Row-island 2D floor — each row is a booth bay, aisles between rows,
 * outer + to grow a row. Multi-row stalls (2×2 etc.) overflow across aisles.
 */
export default function FloorPlan2D({
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
  dimUnavailable = false,
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
  overlay,
}: Props) {
  const maxCols = Math.max(...layout, 1);
  const bayW = maxCols * CELL + (maxCols - 1) * STALL_GAP;
  const showOuterAdd = editMode && !!onAddToRow;

  const isSelected = (id: number) =>
    selectedId === id || (selectedIds ? selectedIds.has(id) : false);

  const stallsInRow = (row: number) => stalls.filter((s) => s.grid_row === row);

  /** Columns occupied in this row — includes footprints from taller stalls above. */
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

  const footAt = (row: number, col: number) =>
    footprintCells?.find((c) => c.row === row && c.col === col);

  return (
    <div className={`mx-auto w-full max-w-4xl ${className}`}>
      <div
        className="relative overflow-visible rounded-[2rem] p-4 sm:p-6"
        style={{
          background: 'linear-gradient(165deg, #e8eef5 0%, #f4f0ea 48%, #ebe4d8 100%)',
          boxShadow: 'inset 0 0 0 3px rgba(21,19,33,0.08), 0 28px 60px -24px rgba(21,19,33,0.35)',
        }}
      >
        <div className="pointer-events-none absolute inset-3 rounded-[1.6rem] border-[3px] border-ink-900/10" />
        <div className="pointer-events-none absolute inset-[14px] rounded-[1.35rem] border border-dashed border-ink-900/10" />

        <GatesOnSide
          side="top"
          entranceSide={entranceSide}
          exitSide={exitSide}
          entranceLabel={entranceLabel}
          exitLabel={exitLabel}
        />

        <div className="relative flex items-stretch gap-3">
          <GatesOnSide
            side="left"
            entranceSide={entranceSide}
            exitSide={exitSide}
            entranceLabel={entranceLabel}
            exitLabel={exitLabel}
          />

        <div className="relative mx-auto min-w-0 flex-1" style={{ width: bayW + (showOuterAdd ? 64 : 0), maxWidth: '100%' }}>
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
                /* Earlier rows stack above so tall stalls paint over aisles + next bays */
                style={{ zIndex: layout.length - row + (hasTall ? 8 : 0) }}
              >
                <div className="flex items-stretch gap-2">
                  <div
                    className="relative flex-1 overflow-visible rounded-[1.35rem] border border-ink-900/10 bg-white/75 p-3 shadow-md backdrop-blur-sm"
                    style={{ minHeight: CELL + BAY_PAD_Y * 2 }}
                  >
                    <div className="absolute -left-1 top-[calc(0.75rem+28px)] z-30 -translate-x-1/2 -translate-y-1/2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-[10px] font-extrabold text-white shadow-md">
                        R{row + 1}
                      </span>
                    </div>

                    <div
                      className="relative ml-3"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.max(rowLen, 1)}, ${CELL}px)`,
                        gridTemplateRows: `${CELL}px`,
                        alignItems: 'start',
                        gap: STALL_GAP,
                        width: Math.max(rowLen, 1) * CELL + Math.max(0, rowLen - 1) * STALL_GAP,
                        height: CELL,
                      }}
                    >
                      {Array.from({ length: rowLen }).map((_, col) => {
                        if (filledCols.has(col)) return null;
                        const key = `${row}:${col}`;
                        const inPreview = previewCells?.has(key);
                        const isHover = hoverCell?.row === row && hoverCell?.col === col;
                        const foot = footAt(row, col);
                        const footTone =
                          foot?.kind === 'blocked' || foot?.kind === 'oob'
                            ? 'ring-2 ring-red-400 bg-red-100/80'
                            : foot?.kind === 'absorb'
                              ? 'ring-2 ring-amber-400 bg-amber-100/70'
                              : foot
                                ? 'ring-2 ring-brand-400 bg-brand-100/60'
                                : '';
                        const slotStyle: CSSProperties = {
                          gridColumn: col + 1,
                          gridRow: 1,
                          height: CELL,
                          width: CELL,
                        };

                        if (!editMode) {
                          return (
                            <div
                              key={key}
                              className="rounded-2xl border border-dashed border-ink-200/80 bg-[#f3efe8]/80"
                              style={slotStyle}
                            />
                          );
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={saving}
                            onClick={() => onEmptyClick?.(row, col)}
                            onMouseEnter={() => onHoverCell?.({ row, col })}
                            onMouseLeave={() => onHoverCell?.(null)}
                            onDragOver={(e) => onEmptyDragOver?.(e, row, col)}
                            onDragLeave={() => onEmptyDragLeave?.(row, col)}
                            onDrop={(e) => onEmptyDrop?.(e, row, col)}
                            className={`grid place-items-center rounded-2xl border border-dashed text-lg font-light transition-all ${
                              dragOverKey === key || inPreview || isHover
                                ? 'scale-[1.04] border-brand-500 bg-brand-50 text-brand-600 shadow-md'
                                : 'border-ink-200 bg-ink-50/60 text-ink-300 hover:border-brand-300 hover:bg-brand-soft/40 hover:text-brand-500'
                            } ${footTone}`}
                            style={slotStyle}
                            title={`Add at R${row + 1} · bay ${col + 1}`}
                          >
                            +
                          </button>
                        );
                      })}

                      {rowStalls.map((stall) => {
                        const { span_cols, span_rows } = stallSpans(stall);
                        const tall = span_rows > 1;
                        const c = stallColors[stall.status];
                        const sel = isSelected(stall.id);
                        const match =
                          search &&
                          (stall.code.includes(search) ||
                            (stall.company_name || '').toUpperCase().includes(search));
                        const dim = dimStall
                          ? dimStall(stall)
                          : dimUnavailable && stall.status !== 'available' && !sel;
                        const willAbsorb = absorbStallIds?.has(stall.id);
                        const isPending = pendingStallId === stall.id;
                        const isBeingDragged = dragging && (dragStallIds?.has(stall.id) || sel);
                        const style: CSSProperties = {
                          gridColumn: `${stall.grid_col + 1} / span ${span_cols}`,
                          gridRow: 1,
                          height: spanBlockHeight(span_rows),
                          width: '100%',
                          zIndex: tall ? 30 : 10,
                          opacity: dim ? 0.28 : isBeingDragged ? 0.4 : 1,
                          alignSelf: 'start',
                        };
                        return (
                          <button
                            key={stall.id}
                            type="button"
                            draggable={editMode && !!onStallDragStart}
                            onDragStart={(e) => onStallDragStart?.(e, stall)}
                            onDragEnd={onStallDragEnd}
                            onClick={(e) => onStallClick?.(stall, e)}
                            onDragOver={(e) => onEmptyDragOver?.(e, stall.grid_row, stall.grid_col)}
                            onDrop={(e) => onEmptyDrop?.(e, stall.grid_row, stall.grid_col)}
                            title={
                              stall.company_name
                                ? `${stall.code} · ${stall.company_name} · ${span_cols}×${span_rows}`
                                : `${stall.code} · ${span_cols}×${span_rows}`
                            }
                            style={style}
                            className={`stall-tile relative grid place-items-center rounded-2xl border text-[11px] font-bold shadow-md transition-all ${c.bg} ${c.border} ${c.text} ${
                              stall.status === 'available' ? 'stall-tile-available' : ''
                            } ${sel ? 'stall-tile-selected' : ''} ${match ? 'animate-glow-pulse' : ''} ${
                              justPlacedId === stall.id ? 'animate-pop' : ''
                            } ${isPending ? 'ring-2 ring-amber-500 ring-offset-1' : ''} ${
                              willAbsorb ? 'ring-2 ring-amber-400 ring-offset-1 opacity-75' : ''
                            } ${editMode ? 'cursor-grab active:cursor-grabbing' : ''} ${
                              tall ? 'shadow-lg shadow-ink-900/20' : ''
                            }`}
                          >
                            {stall.company_logo ? (
                              <img src={stall.company_logo} alt="" className="h-8 w-8 rounded-xl object-cover" />
                            ) : (
                              <span className="px-1 text-center leading-tight">{stall.code}</span>
                            )}
                            {willAbsorb && (
                              <span className="absolute inset-x-0 top-0 rounded-t-xl bg-amber-500 py-px text-center text-[7px] font-bold uppercase text-white">
                                Merge
                              </span>
                            )}
                            {span_cols * span_rows > 1 && (
                              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-ink-900/15 px-1.5 py-0.5 text-[8px] font-bold tracking-wide">
                                {span_cols}×{span_rows}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {rowMarkers.map((m) => {
                        const meta = MARKER_META[m.kind] || MARKER_META.custom;
                        const sr = m.span_rows || 1;
                        const sc = m.span_cols || 1;
                        const tall = sr > 1;
                        const isBeingDragged = dragging && selectedMarkerId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            draggable={editMode && !!onMarkerDragStart}
                            onDragStart={(e) => onMarkerDragStart?.(e, m)}
                            onDragEnd={onMarkerDragEnd}
                            onClick={() => onMarkerClick?.(m)}
                            style={{
                              gridColumn: `${m.grid_col + 1} / span ${sc}`,
                              gridRow: 1,
                              height: spanBlockHeight(sr),
                              width: '100%',
                              zIndex: tall ? 28 : 6,
                              opacity: isBeingDragged ? 0.4 : 1,
                              alignSelf: 'start',
                            }}
                            className={`relative grid place-items-center rounded-2xl border p-0.5 text-[10px] font-bold shadow-sm ${meta.className} ${
                              selectedMarkerId === m.id ? 'ring-2 ring-brand-600 ring-offset-1' : ''
                            } ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          >
                            {m.label}
                            {sc * sr > 1 && (
                              <span className="absolute bottom-1 right-1 rounded bg-black/10 px-1 text-[7px] font-bold">
                                {sc}×{sr}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {rowLen < maxCols && (
                      <div
                        className="pointer-events-none absolute bottom-3 right-3 top-3 w-14 rounded-xl border border-dashed border-grape-200/80 bg-grape-50/40"
                        title="Open plaza (shorter row)"
                      />
                    )}
                  </div>

                  {showOuterAdd && (
                    <button
                      type="button"
                      disabled={saving || rowLen >= 24}
                      onClick={() => onAddToRow?.(row)}
                      title={`Extend row ${row + 1} and add a stall`}
                      className="group flex w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-[1.25rem] border-2 border-dashed border-brand-300/70 bg-white/80 text-brand-600 shadow-sm transition-all hover:border-brand-500 hover:bg-brand-50 hover:shadow-md disabled:opacity-40"
                    >
                      <Plus width={18} />
                      <span className="text-[9px] font-bold leading-none">Add</span>
                    </button>
                  )}
                </div>

                {row < layout.length - 1 && (
                  <div className="relative my-1 flex items-center justify-center" style={{ height: AISLE_H }}>
                    <div
                      className="absolute inset-x-4 top-1/2 h-5 -translate-y-1/2 rounded-full"
                      style={{
                        background:
                          'repeating-linear-gradient(90deg, rgba(21,19,33,0.06) 0 12px, transparent 12px 22px)',
                      }}
                    />
                    <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-ink-300/40" />
                    <span className="relative z-[1] rounded-full bg-[#f4f0ea] px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-400">
                      Aisle {row + 1}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {overlay}
        </div>

          <GatesOnSide
            side="right"
            entranceSide={entranceSide}
            exitSide={exitSide}
            entranceLabel={entranceLabel}
            exitLabel={exitLabel}
          />
        </div>

        <GatesOnSide
          side="bottom"
          entranceSide={entranceSide}
          exitSide={exitSide}
          entranceLabel={entranceLabel}
          exitLabel={exitLabel}
        />
      </div>
    </div>
  );
}

export { CELL as FLOOR_2D_CELL, AISLE_H as FLOOR_2D_AISLE };
