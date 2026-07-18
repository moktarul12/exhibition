import { useMemo, type CSSProperties } from 'react';
import type { Stall, FloorMarker, FloorGateSide } from '../types';
import { stallSpans, MARKER_META } from '../floorLayout';

/** Soft exhibition palette — light hall, clear status */
const PALETTE: Record<string, { top: string; side: string; rim: string; label: string; h: number }> = {
  available: { top: '#86efac', side: '#16a34a', rim: '#bbf7d0', label: 'Available', h: 14 },
  reserved: { top: '#fde68a', side: '#d97706', rim: '#fef3c7', label: 'Reserved', h: 16 },
  booked: { top: '#f9a8d4', side: '#db2777', rim: '#fce7f3', label: 'Booked', h: 20 },
  sponsor: { top: '#c4b5fd', side: '#7c3aed', rim: '#ede9fe', label: 'Sponsor', h: 24 },
  blocked: { top: '#e2e8f0', side: '#64748b', rim: '#f1f5f9', label: 'Blocked', h: 10 },
};

const AMENITY: Record<string, { top: string; side: string; h: number }> = {
  enter: { top: '#4ade80', side: '#15803d', h: 8 },
  exit: { top: '#94a3b8', side: '#475569', h: 8 },
  lounge: { top: '#7dd3fc', side: '#0284c7', h: 12 },
  food: { top: '#fdba74', side: '#ea580c', h: 12 },
  restroom: { top: '#67e8f9', side: '#0891b2', h: 10 },
  info: { top: '#a5b4fc', side: '#4f46e5', h: 10 },
  stage: { top: '#ddd6fe', side: '#6d28d9', h: 28 },
  clinic: { top: '#5eead4', side: '#0d9488', h: 12 },
  fire: { top: '#fca5a5', side: '#dc2626', h: 10 },
  custom: { top: '#e2e8f0', side: '#64748b', h: 10 },
};

type Props = {
  layout: number[];
  stalls: Stall[];
  markers: FloorMarker[];
  entranceLabel?: string;
  exitLabel?: string;
  entranceSide?: FloorGateSide;
  exitSide?: FloorGateSide;
  selectedId?: number | null;
  selectedIds?: Set<number>;
  search?: string;
  dimUnavailable?: boolean;
  onStallClick?: (stall: Stall) => void;
  interactive?: boolean;
  className?: string;
};

/**
 * Fresh isometric hall — light venue floor, soft booths, gentle visitors, real row gaps.
 */
export default function FloorPlan3D({
  layout,
  stalls,
  markers,
  entranceLabel = 'Main entrance',
  exitLabel = 'Exit / registration',
  entranceSide = 'top',
  exitSide = 'bottom',
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
  const CELL = 48;
  const GAP = 10;
  const ROW_PAD = 14; // extra aisle when adjacent rows differ in length
  const floorW = maxCols * CELL + (maxCols - 1) * GAP;

  const rowY = useMemo(() => {
    const ys: number[] = [];
    let y = 0;
    for (let r = 0; r < rowsN; r++) {
      ys.push(y);
      const gap = r < rowsN - 1 && layout[r] !== layout[r + 1] ? ROW_PAD : 0;
      y += CELL + GAP + gap;
    }
    return ys;
  }, [layout, rowsN]);

  const floorH = (rowY[rowsN - 1] ?? 0) + CELL;

  const occupied = useMemo(() => {
    const set = new Set<string>();
    for (const s of stalls) {
      const { span_cols, span_rows } = stallSpans(s);
      for (let r = s.grid_row; r < s.grid_row + span_rows; r++) {
        for (let c = s.grid_col; c < s.grid_col + span_cols; c++) set.add(`${r}:${c}`);
      }
    }
    for (const m of markers) {
      for (let r = m.grid_row; r < m.grid_row + (m.span_rows || 1); r++) {
        for (let c = m.grid_col; c < m.grid_col + (m.span_cols || 1); c++) set.add(`${r}:${c}`);
      }
    }
    return set;
  }, [stalls, markers]);

  const isSelected = (id: number) =>
    selectedId === id || (selectedIds ? selectedIds.has(id) : false);

  const lx = (col: number) => col * (CELL + GAP);
  const ly = (row: number) => rowY[row] ?? 0;

  // Visitor spots: prefer open aisle cells, else near entrance
  const visitors = useMemo(() => {
    const opens: { row: number; col: number }[] = [];
    for (let row = 0; row < rowsN; row++) {
      for (let col = 0; col < (layout[row] || 0); col++) {
        if (!occupied.has(`${row}:${col}`)) opens.push({ row, col });
      }
      // beyond shorter row = open plaza
      for (let col = layout[row] || 0; col < maxCols; col++) opens.push({ row, col });
    }
    const picks = opens.length
      ? opens.filter((_, i) => i % Math.max(1, Math.floor(opens.length / 4)) === 0).slice(0, 4)
      : [{ row: 0, col: 1 }, { row: Math.min(1, rowsN - 1), col: 2 }];
    return picks;
  }, [layout, maxCols, rowsN, occupied]);

  const selected = stalls.find((s) => s.id === selectedId);

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] ${className}`}>
      {/* Soft daylight venue — not dark cyber */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(165deg, #dbe7f3 0%, #eef2f7 35%, #f7f3ee 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.9), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(214,32,110,0.08), transparent 40%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-3 px-5 pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Live hall</p>
          <p className="font-display text-sm font-bold text-ink-800">{entranceLabel}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-ink-500">
          {Object.entries(PALETTE).slice(0, 4).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: v.top }} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div
        className="relative z-10 mx-auto overflow-x-auto px-4 pb-6 pt-8"
        style={{ perspective: '1400px', perspectiveOrigin: '50% 20%' }}
      >
        <div
          className="relative mx-auto"
          style={{
            width: Math.max(floorW + 180, 380),
            height: Math.max(floorH * 0.62 + 200, 340),
          }}
        >
          {/* Hall floor plate */}
          <div
            className="absolute left-1/2 top-[6%]"
            style={{
              width: floorW + 72,
              height: floorH + 88,
              marginLeft: -(floorW + 72) / 2,
              transform: 'rotateX(55deg) rotateZ(-32deg)',
              transformStyle: 'preserve-3d',
              borderRadius: 24,
              background: 'linear-gradient(145deg, #faf8f5 0%, #ebe4d8 55%, #ddd4c6 100%)',
              boxShadow:
                '0 40px 80px rgba(21,19,33,0.18), 0 0 0 1px rgba(21,19,33,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
            }}
          >
            {/* subtle floor grain */}
            <div
              className="absolute inset-4 rounded-2xl opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0, transparent 14px, rgba(0,0,0,0.03) 14px, rgba(0,0,0,0.03) 15px)',
              }}
            />

            {/* Gate ribbons — any wall */}
            {(['top', 'bottom', 'left', 'right'] as FloorGateSide[]).flatMap((side) => {
              const gates: { kind: 'enter' | 'exit'; label: string }[] = [];
              if (entranceSide === side) gates.push({ kind: 'enter', label: entranceLabel });
              if (exitSide === side) gates.push({ kind: 'exit', label: exitLabel });
              return gates.map((g, gi) => {
                const enter = g.kind === 'enter';
                const style: CSSProperties =
                  side === 'top'
                    ? { left: 24, right: 24, top: 12 + gi * 36, height: 28 }
                    : side === 'bottom'
                      ? { left: 24, right: 24, bottom: 12 + gi * 36, height: 28 }
                      : side === 'left'
                        ? { left: 10 + gi * 28, top: 52, bottom: 52, width: 24 }
                        : { right: 10 + gi * 28, top: 52, bottom: 52, width: 24 };
                const vertical = side === 'left' || side === 'right';
                return (
                  <div
                    key={`${side}-${g.kind}`}
                    className="absolute flex items-center justify-center rounded-2xl text-[9px] font-bold uppercase tracking-[0.14em] shadow-md"
                    style={{
                      ...style,
                      background: enter
                        ? 'linear-gradient(90deg, #059669, #10b981)'
                        : 'rgba(255,255,255,0.85)',
                      color: enter ? '#fff' : '#475569',
                      writingMode: vertical ? 'vertical-rl' : undefined,
                      transform: side === 'left' ? 'rotate(180deg)' : undefined,
                      boxShadow: enter
                        ? undefined
                        : 'inset 0 0 0 1px rgba(21,19,33,0.06)',
                    }}
                  >
                    {g.label}
                  </div>
                );
              });
            })}

            <div className="absolute" style={{ left: 36, top: 52, width: floorW, height: floorH }}>
              {/* Open plaza / row gaps */}
              {Array.from({ length: rowsN }).map((_, row) => {
                const len = layout[row] || 0;
                return Array.from({ length: maxCols }).map((__, col) => {
                  if (col < len && occupied.has(`${row}:${col}`)) return null;
                  const isGap = col >= len;
                  return (
                    <div
                      key={`g-${row}-${col}`}
                      className="absolute rounded-xl"
                      style={{
                        left: lx(col),
                        top: ly(row),
                        width: CELL,
                        height: CELL,
                        background: isGap
                          ? 'rgba(124,58,237,0.06)'
                          : 'rgba(255,255,255,0.35)',
                        boxShadow: isGap
                          ? 'inset 0 0 0 1.5px rgba(124,58,237,0.2)'
                          : 'inset 0 0 0 1px rgba(21,19,33,0.04)',
                      }}
                    />
                  );
                });
              })}

              {/* Cross-aisle glow between uneven rows */}
              {layout.slice(0, -1).map((len, r) => {
                if (len === layout[r + 1]) return null;
                return (
                  <div
                    key={`aisle-${r}`}
                    className="absolute rounded-full"
                    style={{
                      left: 0,
                      top: ly(r) + CELL + 3,
                      width: floorW,
                      height: ROW_PAD - 4,
                      background: 'linear-gradient(90deg, transparent, rgba(214,32,110,0.12), transparent)',
                    }}
                  />
                );
              })}

              {markers.map((m) => {
                const a = AMENITY[m.kind] || AMENITY.custom;
                const isStage = m.kind === 'stage';
                return (
                  <Booth
                    key={m.id}
                    left={lx(m.grid_col)}
                    top={ly(m.grid_row)}
                    w={(m.span_cols || 1) * CELL + ((m.span_cols || 1) - 1) * GAP}
                    d={(m.span_rows || 1) * CELL + ((m.span_rows || 1) - 1) * GAP}
                    height={a.h}
                    topColor={a.top}
                    side={a.side}
                    rim="#fff"
                    label={m.label || MARKER_META[m.kind]?.label || m.kind}
                    stage={isStage}
                  />
                );
              })}

              {stalls.map((stall, i) => {
                const { span_cols, span_rows } = stallSpans(stall);
                const p = PALETTE[stall.status] || PALETTE.available;
                const sel = isSelected(stall.id);
                const match = !!(search && stall.code.includes(search));
                const dim = dimUnavailable && stall.status !== 'available' && !sel;
                return (
                  <Booth
                    key={stall.id}
                    left={lx(stall.grid_col)}
                    top={ly(stall.grid_row)}
                    w={span_cols * CELL + (span_cols - 1) * GAP}
                    d={span_rows * CELL + (span_rows - 1) * GAP}
                    height={p.h + (sel ? 8 : 0)}
                    topColor={p.top}
                    side={p.side}
                    rim={p.rim}
                    label={stall.company_logo ? '' : stall.code}
                    logo={stall.company_logo}
                    selected={sel}
                    pulse={match}
                    dim={dim}
                    delay={Math.min(i, 20) * 0.03}
                    title={stall.company_name ? `${stall.code} · ${stall.company_name}` : `${stall.code} · ${p.label}`}
                    onClick={interactive && onStallClick ? () => onStallClick(stall) : undefined}
                  />
                );
              })}

              {visitors.map((v, i) => (
                <Visitor
                  key={`v-${i}`}
                  left={lx(v.col) + CELL * 0.28}
                  top={ly(v.row) + CELL * 0.25}
                  hue={['#db2777', '#7c3aed', '#0891b2', '#059669'][i % 4]}
                  delay={i * 0.8}
                  variant={i % 3}
                />
              ))}
            </div>
          </div>

          {/* Selected chip — clean, not a heavy card stack */}
          {selected && (
            <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 animate-slide-up rounded-full border border-ink-100 bg-white/95 px-5 py-2.5 shadow-xl shadow-ink-900/10 backdrop-blur">
              <div className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: (PALETTE[selected.status] || PALETTE.available).side }} />
                <span className="font-display font-extrabold text-ink-900">{selected.code}</span>
                <span className="text-ink-400">·</span>
                <span className="text-ink-600">{selected.width}×{selected.depth}m</span>
                {selected.status === 'available' && (
                  <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white">Open</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Booth({
  left, top, w, d, height, topColor, side, rim, label, logo,
  selected, pulse, dim, delay = 0, title, onClick, stage,
}: {
  left: number; top: number; w: number; d: number; height: number;
  topColor: string; side: string; rim: string; label: string; logo?: string;
  selected?: boolean; pulse?: boolean; dim?: boolean; delay?: number;
  title?: string; onClick?: () => void; stage?: boolean;
}) {
  const style: CSSProperties = {
    left, top, width: w, height: d,
    animationDelay: `${delay}s`,
    opacity: dim ? 0.28 : 1,
  };

  const body = (
    <>
      {/* Side extrusion */}
      <span
        aria-hidden
        className="absolute left-0 right-0"
        style={{
          top: d - 1,
          height,
          background: `linear-gradient(180deg, ${side}, ${shade(side, -35)})`,
          transform: 'skewX(-14deg)',
          transformOrigin: 'top left',
          borderRadius: '0 0 8px 8px',
        }}
      />
      {/* Top face */}
      <span
        className={`absolute inset-0 flex items-center justify-center rounded-xl text-[10px] font-extrabold transition-transform duration-300 ${
          onClick ? 'group-hover:-translate-y-2 group-hover:scale-[1.04]' : ''
        }`}
        style={{
          background: stage
            ? `linear-gradient(160deg, #1e1b4b 0%, ${side} 100%)`
            : `linear-gradient(145deg, ${rim} 0%, ${topColor} 45%, ${side} 100%)`,
          color: stage ? '#fff' : '#1a1625',
          boxShadow: selected
            ? `0 0 0 3px #fff, 0 0 0 5px #d6206e, 0 18px 36px rgba(214,32,110,0.35)`
            : `0 8px 20px rgba(21,19,33,0.16)`,
          transform: `translateY(-${height * 0.42}px)`,
        }}
      >
        {stage && (
          <span className="absolute inset-x-2 top-1.5 h-[40%] rounded-md bg-black/50" />
        )}
        {logo ? (
          <img src={logo} alt="" className="relative h-6 w-6 rounded-lg object-cover shadow-sm" />
        ) : (
          <span className="relative px-1 text-center leading-tight tracking-tight">{label}</span>
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
        className={`group absolute z-10 animate-stall-in outline-none ${selected || pulse ? 'animate-glow-pulse' : ''}`}
        style={style}
      >
        {body}
      </button>
    );
  }

  return (
    <div className="pointer-events-none absolute z-[5] animate-stall-in" style={style} title={title}>
      {body}
    </div>
  );
}

function Visitor({
  left, top, hue, delay, variant,
}: {
  left: number; top: number; hue: string; delay: number; variant: number;
}) {
  const walk = variant === 0 ? 'animate-walk-a' : variant === 1 ? 'animate-walk-b' : 'animate-walk-c';
  return (
    <div
      className={`pointer-events-none absolute z-20 ${walk}`}
      style={{ left, top, animationDelay: `${delay}s` }}
    >
      <div className="animate-bob" style={{ animationDelay: `${delay * 0.2}s` }}>
        <div className="absolute -bottom-0.5 left-1/2 h-1 w-3.5 -translate-x-1/2 rounded-full bg-ink-900/20 blur-[1px]" />
        <div className="mx-auto h-2.5 w-2.5 rounded-full bg-[#f5d0a9] shadow-sm ring-1 ring-black/10" />
        <div className="mx-auto mt-0.5 h-4 w-2.5 rounded-t-md rounded-b-sm shadow-sm" style={{ background: hue }} />
        <div className="mx-auto flex w-2.5 justify-between px-px">
          <span className="h-2 w-[3px] rounded-b bg-ink-700/70" />
          <span className="h-2 w-[3px] rounded-b bg-ink-700/70" />
        </div>
      </div>
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
