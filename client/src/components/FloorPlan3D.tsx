import type { CSSProperties } from 'react';
import type { Stall, FloorMarker } from '../types';
import { stallSpans, MARKER_META } from '../floorLayout';

const STATUS_3D: Record<string, { top: string; side: string; label: string; h: number }> = {
  available: { top: '#6ee7b7', side: '#047857', label: 'Available', h: 14 },
  reserved: { top: '#fcd34d', side: '#b45309', label: 'Reserved', h: 18 },
  booked: { top: '#f9a8d4', side: '#9d174d', label: 'Booked', h: 24 },
  sponsor: { top: '#c4b5fd', side: '#5b21b6', label: 'Sponsor', h: 28 },
  blocked: { top: '#cbd5e1', side: '#475569', label: 'Blocked', h: 10 },
};

const MARKER_3D: Record<string, { top: string; side: string; h: number }> = {
  enter: { top: '#34d399', side: '#065f46', h: 8 },
  exit: { top: '#94a3b8', side: '#334155', h: 8 },
  lounge: { top: '#93c5fd', side: '#1e40af', h: 12 },
  food: { top: '#fdba74', side: '#c2410c', h: 12 },
  restroom: { top: '#7dd3fc', side: '#0369a1', h: 10 },
  info: { top: '#a5b4fc', side: '#4338ca', h: 10 },
  stage: { top: '#ddd6fe', side: '#5b21b6', h: 32 },
  clinic: { top: '#5eead4', side: '#0f766e', h: 12 },
  fire: { top: '#fca5a5', side: '#b91c1c', h: 10 },
  custom: { top: '#e2e8f0', side: '#475569', h: 10 },
};

type Props = {
  layout: number[];
  stalls: Stall[];
  markers: FloorMarker[];
  entranceLabel?: string;
  exitLabel?: string;
  selectedId?: number | null;
  selectedIds?: Set<number>;
  search?: string;
  dimUnavailable?: boolean;
  onStallClick?: (stall: Stall) => void;
  interactive?: boolean;
  className?: string;
};

/** CSS isometric “3D hall” — same grid data as 2D, no WebGL. */
export default function FloorPlan3D({
  layout,
  stalls,
  markers,
  entranceLabel = 'Main entrance',
  exitLabel = 'Exit / registration',
  selectedId,
  selectedIds,
  search = '',
  dimUnavailable = false,
  onStallClick,
  interactive = true,
  className = '',
}: Props) {
  const maxCols = Math.max(...layout, 1);
  const rowsN = layout.length;
  const CELL = 42;
  const GAP = 7;
  const floorW = maxCols * CELL + (maxCols - 1) * GAP;
  const floorH = rowsN * CELL + (rowsN - 1) * GAP;

  const isSelected = (id: number) =>
    selectedId === id || (selectedIds ? selectedIds.has(id) : false);

  return (
    <div className={`relative overflow-hidden rounded-2xl animate-fade-in ${className}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 18%, rgba(124,58,237,0.18), transparent 50%), linear-gradient(165deg, #1c1628 0%, #2d2444 42%, #12101a 100%)',
        }}
      />
      <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full opacity-40 blur-3xl" style={{ background: '#d6206e' }} />
      <div className="pointer-events-none absolute -right-8 bottom-16 h-48 w-48 rounded-full opacity-30 blur-3xl" style={{ background: '#7c3aed' }} />

      <div className="relative z-10 flex items-center justify-between gap-2 px-4 pb-0 pt-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/85 backdrop-blur">
          3D immersive · {entranceLabel}
        </span>
        <span className="truncate text-[10px] font-medium text-white/40">{exitLabel}</span>
      </div>

      <div
        className="relative z-10 mx-auto w-full overflow-x-auto overflow-y-hidden px-2 pb-2 pt-4"
        style={{ perspective: '1100px', perspectiveOrigin: '50% 35%' }}
      >
        <div
          className="relative mx-auto"
          style={{ width: Math.max(floorW + 120, 320), height: Math.max(floorH * 0.55 + 160, 280) }}
        >
          <div
            className="absolute left-1/2 top-[12%]"
            style={{
              width: floorW + 40,
              height: floorH + 56,
              marginLeft: -(floorW + 40) / 2,
              transform: 'rotateX(60deg) rotateZ(-38deg)',
              transformStyle: 'preserve-3d',
              background: 'linear-gradient(145deg, #3f3658 0%, #2a243c 55%, #1c1828 100%)',
              borderRadius: 18,
              boxShadow:
                '0 50px 90px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(124,58,237,0.25)',
            }}
          >
            <div
              className="absolute inset-4 rounded-xl opacity-50"
              style={{
                backgroundImage:
                  `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                backgroundSize: `${CELL + GAP}px ${CELL + GAP}px`,
              }}
            />
            <div
              className="absolute left-4 right-4 top-2.5 flex h-5 items-center justify-center rounded-md text-[8px] font-bold uppercase tracking-wider text-white"
              style={{ background: 'linear-gradient(90deg, #059669, #34d399)' }}
            >
              {entranceLabel}
            </div>

            <div
              className="absolute"
              style={{
                left: 20,
                top: 32,
                width: floorW,
                height: floorH,
                display: 'grid',
                gridTemplateColumns: `repeat(${maxCols}, ${CELL}px)`,
                gridTemplateRows: `repeat(${rowsN}, ${CELL}px)`,
                gap: GAP,
                transformStyle: 'preserve-3d',
              }}
            >
              {Array.from({ length: rowsN * maxCols }).map((_, idx) => {
                const row = Math.floor(idx / maxCols);
                const col = idx % maxCols;
                if (col >= (layout[row] || 0)) return <div key={idx} />;
                return <div key={idx} className="rounded-[3px]" style={{ background: 'rgba(255,255,255,0.035)' }} />;
              })}

              {markers.map((m) => {
                const meta = MARKER_3D[m.kind] || MARKER_3D.custom;
                return (
                  <Booth
                    key={m.id}
                    col={m.grid_col}
                    row={m.grid_row}
                    spanCols={m.span_cols || 1}
                    spanRows={m.span_rows || 1}
                    cell={CELL}
                    gap={GAP}
                    height={meta.h}
                    top={meta.top}
                    side={meta.side}
                    label={m.label || MARKER_META[m.kind]?.label || m.kind}
                  />
                );
              })}

              {stalls.map((stall, i) => {
                const { span_cols, span_rows } = stallSpans(stall);
                const colors = STATUS_3D[stall.status] || STATUS_3D.available;
                const sel = isSelected(stall.id);
                const match = !!(search && stall.code.includes(search));
                const dim = dimUnavailable && stall.status !== 'available' && !sel;
                return (
                  <Booth
                    key={stall.id}
                    col={stall.grid_col}
                    row={stall.grid_row}
                    spanCols={span_cols}
                    spanRows={span_rows}
                    cell={CELL}
                    gap={GAP}
                    height={colors.h + (sel ? 10 : 0)}
                    top={colors.top}
                    side={colors.side}
                    label={stall.company_logo ? '' : stall.code}
                    logo={stall.company_logo}
                    selected={sel}
                    pulse={match}
                    dim={dim}
                    delay={Math.min(i, 24) * 0.02}
                    title={
                      stall.company_name
                        ? `${stall.code} · ${stall.company_name}`
                        : `${stall.code} · ${colors.label}`
                    }
                    onClick={interactive && onStallClick ? () => onStallClick(stall) : undefined}
                  />
                );
              })}
            </div>

            <div
              className="absolute bottom-2.5 left-4 right-4 flex h-5 items-center justify-center rounded-md text-[8px] font-bold uppercase tracking-wider text-white/90"
              style={{ background: 'rgba(71,85,105,0.92)' }}
            >
              {exitLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 px-4 pb-4">
        {Object.entries(STATUS_3D).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-[10px] text-white/65">
            <span className="h-2.5 w-2.5 rounded-sm shadow-sm" style={{ background: v.top }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function Booth({
  col, row, spanCols, spanRows, cell, gap, height, top, side, label, logo,
  selected, pulse, dim, delay = 0, title, onClick,
}: {
  col: number; row: number; spanCols: number; spanRows: number;
  cell: number; gap: number; height: number; top: string; side: string;
  label: string; logo?: string; selected?: boolean; pulse?: boolean; dim?: boolean;
  delay?: number; title?: string; onClick?: () => void;
}) {
  const w = spanCols * cell + (spanCols - 1) * gap;
  const d = spanRows * cell + (spanRows - 1) * gap;
  const style: CSSProperties = {
    left: col * (cell + gap),
    top: row * (cell + gap),
    width: w,
    height: d,
    animationDelay: `${delay}s`,
    opacity: dim ? 0.35 : undefined,
  };

  const body = (
    <>
      <span
        aria-hidden
        className="absolute left-0 right-0 rounded-b-md"
        style={{
          top: d - 2,
          height,
          background: `linear-gradient(180deg, ${side}, ${shade(side, -25)})`,
          transform: 'skewX(-18deg)',
          transformOrigin: 'top left',
        }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center rounded-md text-[9px] font-extrabold transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-[1.04]"
        style={{
          background: `linear-gradient(145deg, ${top}, ${side})`,
          color: '#1a1625',
          boxShadow: selected
            ? '0 0 0 2px #fff, 0 0 0 4px #d6206e, 0 10px 24px rgba(0,0,0,0.4)'
            : '0 6px 14px rgba(0,0,0,0.28)',
          transform: `translateY(-${height * 0.35}px)`,
        }}
      >
        {logo ? (
          <img src={logo} alt="" className="h-5 w-5 rounded object-cover ring-1 ring-black/10" />
        ) : (
          <span className="px-0.5 text-center leading-tight">{label}</span>
        )}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className={`group absolute z-10 animate-stall-in outline-none ${pulse ? 'animate-glow-pulse' : ''}`}
        style={style}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={`pointer-events-none absolute z-[5] animate-stall-in ${pulse ? 'animate-pulse' : ''}`} style={style} title={title}>
      {body}
    </div>
  );
}

function shade(hex: string, amount: number) {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
