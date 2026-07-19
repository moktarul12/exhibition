import { useMemo, type CSSProperties } from 'react';
import type { Stall, FloorMarker, FloorGateSide } from '../types';
import { stallSpans, MARKER_META } from '../floorLayout';

/** Pastel tent palette — pale canopy, saturated frame, matching label ink */
const PALETTE: Record<string, { top: string; side: string; rim: string; label: string; h: number }> = {
  available: { top: '#dcfce7', side: '#16a34a', rim: '#86efac', label: 'Available', h: 14 },
  reserved: { top: '#fef3c7', side: '#d97706', rim: '#fcd34d', label: 'Reserved', h: 16 },
  booked: { top: '#fce7f3', side: '#db2777', rim: '#f9a8d4', label: 'Booked', h: 20 },
  sponsor: { top: '#ede9fe', side: '#7c3aed', rim: '#c4b5fd', label: 'Sponsor', h: 24 },
  blocked: { top: '#f1f5f9', side: '#64748b', rim: '#cbd5e1', label: 'Blocked', h: 10 },
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

  /* Building shell dimensions — walls + perimeter walkway around the hall floor */
  const WALL = 18;
  const WALK = 44;
  const innerW = floorW + 72;
  const innerH = floorH + 88;
  const bldW = innerW + 2 * (WALL + WALK);
  const bldH = innerH + 2 * (WALL + WALK);

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

  /* Deterministic pseudo-random for crowd/plants so the scene is stable across renders */
  const rand = (i: number, salt: number) => {
    const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };

  // People strolling the perimeter walkway
  const crowd = useMemo(() => {
    const hues = ['#db2777', '#7c3aed', '#0891b2', '#059669', '#d97706'];
    const pts: { x: number; y: number; hue: string }[] = [];
    for (let i = 0; i < 18; i++) {
      const t = rand(i, 1);
      const off = WALL + 8 + rand(i, 2) * (WALK - 22);
      const hue = hues[i % hues.length];
      const sideIdx = i % 4;
      if (sideIdx === 0) pts.push({ x: WALL + 24 + t * (bldW - 2 * WALL - 60), y: off, hue });
      else if (sideIdx === 1) pts.push({ x: WALL + 24 + t * (bldW - 2 * WALL - 60), y: bldH - off - 12, hue });
      else if (sideIdx === 2) pts.push({ x: off, y: WALL + 24 + t * (bldH - 2 * WALL - 60), hue });
      else pts.push({ x: bldW - off - 12, y: WALL + 24 + t * (bldH - 2 * WALL - 60), hue });
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bldW, bldH]);

  // Planters along the inner wall edge
  const plants = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const t = (i + 0.5) / 10;
      if (i % 2 === 0) {
        pts.push({ x: WALL + 3, y: WALL + 16 + t * (bldH - 2 * WALL - 40) });
        pts.push({ x: bldW - WALL - 13, y: WALL + 16 + (1 - t) * (bldH - 2 * WALL - 40) });
      }
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bldW, bldH]);

  /** Entrance / exit canopies on the building walls, like real venue gates. */
  const renderCanopy = (kind: 'enter' | 'exit', side: FloorGateSide, label: string, shift: number) => {
    const enter = kind === 'enter';
    const bg = enter
      ? 'linear-gradient(180deg, #5b21b6, #7c3aed)'
      : 'linear-gradient(180deg, #dc2626, #b91c1c)';
    const vertical = side === 'left' || side === 'right';
    const span = Math.min(vertical ? bldH * 0.42 : bldW * 0.34, 250);
    const arrow = enter
      ? (side === 'top' ? '↓' : side === 'bottom' ? '↑' : side === 'left' ? '→' : '←')
      : (side === 'top' ? '↑' : side === 'bottom' ? '↑' : side === 'left' ? '←' : '→');

    const pos: CSSProperties = vertical
      ? {
          top: `calc(50% + ${shift}px)`,
          transform: 'translateY(-50%)',
          height: span,
          width: WALL + 16,
          ...(side === 'left' ? { left: -8 } : { right: -8 }),
        }
      : {
          left: `calc(50% + ${shift}px)`,
          transform: 'translateX(-50%)',
          width: span,
          height: WALL + 16,
          ...(side === 'top' ? { top: -8 } : { bottom: -8 }),
        };

    return (
      <div
        key={`${kind}-${side}`}
        className="absolute z-30 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white"
        style={{
          ...pos,
          background: bg,
          borderRadius: 10,
          boxShadow: '0 10px 24px rgba(21,19,33,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
          writingMode: vertical ? 'vertical-rl' : undefined,
        }}
      >
        <span>{label}</span>
        <span className="text-[11px]">{arrow}</span>
      </div>
    );
  };

  /** Red carpet running from the exit gate through the walkway. */
  const exitCarpet = (() => {
    const CARPET = 38;
    const base: CSSProperties = {
      background: 'linear-gradient(90deg, #b91c1c, #ef4444 50%, #b91c1c)',
      boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.12)',
    };
    if (exitSide === 'top') return { ...base, left: `calc(50% - ${CARPET / 2}px)`, top: 0, width: CARPET, height: WALL + WALK, background: 'linear-gradient(0deg, #b91c1c, #ef4444)' };
    if (exitSide === 'bottom') return { ...base, left: `calc(50% - ${CARPET / 2}px)`, bottom: 0, width: CARPET, height: WALL + WALK, background: 'linear-gradient(180deg, #ef4444, #b91c1c)' };
    if (exitSide === 'left') return { ...base, top: `calc(50% - ${CARPET / 2}px)`, left: 0, height: CARPET, width: WALL + WALK, background: 'linear-gradient(270deg, #ef4444, #b91c1c)' };
    return { ...base, top: `calc(50% - ${CARPET / 2}px)`, right: 0, height: CARPET, width: WALL + WALK, background: 'linear-gradient(90deg, #ef4444, #b91c1c)' };
  })();

  const wallBanners: { style: CSSProperties; text: string }[] = [
    {
      text: 'Crafting the future',
      style: { left: WALL + 14, top: 2, width: Math.min(130, bldW * 0.22), height: WALL - 4, background: 'linear-gradient(90deg, #4338ca, #7c3aed)' },
    },
    {
      text: 'Handmade with love',
      style: { right: WALL + 14, top: 2, width: Math.min(130, bldW * 0.22), height: WALL - 4, background: 'linear-gradient(90deg, #db2777, #9d174d)' },
    },
    {
      text: 'Expo Mela',
      style: { left: 2, top: '30%', width: WALL - 4, height: Math.min(110, bldH * 0.22), background: 'linear-gradient(180deg, #0e7490, #155e75)', writingMode: 'vertical-rl' },
    },
    {
      text: 'Live shows',
      style: { right: 2, bottom: '28%', width: WALL - 4, height: Math.min(110, bldH * 0.22), background: 'linear-gradient(180deg, #b45309, #92400e)', writingMode: 'vertical-rl' },
    },
  ];

  const cornerSpots = [
    { key: 'rest-tl', label: 'Rest area', icon: '🛋', x: WALL + 5, y: WALL + 5, bg: 'linear-gradient(160deg, #6d28d9, #4c1d95)' },
    { key: 'rest-bl', label: 'Rest area', icon: '🛋', x: WALL + 5, y: bldH - WALL - 49, bg: 'linear-gradient(160deg, #6d28d9, #4c1d95)' },
    { key: 'cafe-tr', label: 'Cafe', icon: '☕', x: bldW - WALL - 49, y: WALL + 5, bg: 'linear-gradient(160deg, #44302b, #2b1d18)' },
    { key: 'cafe-br', label: 'Cafe', icon: '☕', x: bldW - WALL - 49, y: bldH - WALL - 49, bg: 'linear-gradient(160deg, #44302b, #2b1d18)' },
  ];

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
        style={{ perspective: '1600px', perspectiveOrigin: '50% 18%' }}
      >
        <div
          className="relative mx-auto"
          style={{
            width: Math.max(bldW + 48, 420),
            height: Math.max(bldH * 0.72 + 130, 380),
          }}
        >
          {/* Building shell — outer walls, walkway, gates */}
          <div
            className="absolute left-1/2 top-[4%]"
            style={{
              width: bldW,
              height: bldH,
              marginLeft: -bldW / 2,
              transform: 'rotateX(50deg)',
              transformStyle: 'preserve-3d',
              borderRadius: 18,
              background: 'linear-gradient(165deg, #d7d3cd 0%, #c8c3bc 60%, #b9b3ab 100%)',
              boxShadow:
                '0 60px 90px rgba(21,19,33,0.28), 0 0 0 2px rgba(255,255,255,0.5), inset 0 2px 0 rgba(255,255,255,0.7)',
            }}
          >
            {/* Wall top ridge */}
            <div
              className="absolute inset-0 rounded-[18px]"
              style={{
                boxShadow: `inset 0 0 0 ${WALL}px rgba(255,255,255,0.55), inset 0 0 0 ${WALL + 1}px rgba(21,19,33,0.12)`,
              }}
            />

            {/* Perimeter walkway — textured concrete */}
            <div
              className="absolute rounded-xl"
              style={{
                inset: WALL,
                background: 'linear-gradient(150deg, #cfc9c1, #beb7ad)',
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0 22px, rgba(0,0,0,0.045) 22px 23px), repeating-linear-gradient(0deg, transparent 0 22px, rgba(0,0,0,0.045) 22px 23px)',
              }}
            />

            {/* Wall banners */}
            {wallBanners.map((b) => (
              <div
                key={b.text}
                className="absolute z-20 flex items-center justify-center rounded-md text-[7px] font-extrabold uppercase tracking-[0.18em] text-white/95 shadow-md"
                style={b.style}
              >
                {b.text}
              </div>
            ))}

            {/* Corner amenities — rest areas & cafes */}
            {cornerSpots.map((c) => (
              <div
                key={c.key}
                className="absolute z-20 flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-white shadow-lg"
                style={{ left: c.x, top: c.y, background: c.bg }}
              >
                <span className="text-[11px] leading-none">{c.icon}</span>
                <span className="text-[6px] font-black uppercase tracking-wider">{c.label}</span>
              </div>
            ))}

            {/* Planters along walls */}
            {plants.map((p, i) => (
              <div key={`pl-${i}`} className="absolute z-10" style={{ left: p.x, top: p.y }}>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-sm ring-1 ring-emerald-800/40" />
                <div className="mx-auto h-1 w-1.5 rounded-b-sm bg-amber-800/80" />
              </div>
            ))}

            {/* Red carpet from the exit gate */}
            <div className="absolute z-10" style={exitCarpet} />

            {/* Crowd on the walkway */}
            {crowd.map((p, i) => (
              <Visitor key={`c-${i}`} left={p.x} top={p.y} hue={p.hue} delay={i * 0.45} variant={i % 3} />
            ))}

            {/* Entrance / exit canopies */}
            {renderCanopy('enter', entranceSide, entranceLabel, entranceSide === exitSide ? -70 : 0)}
            {renderCanopy('exit', exitSide, exitLabel, entranceSide === exitSide ? 70 : 0)}

            {/* Hall floor plate */}
            <div
              className="absolute rounded-2xl"
              style={{
                left: WALL + WALK,
                top: WALL + WALK,
                width: innerW,
                height: innerH,
                background: 'linear-gradient(145deg, #faf8f5 0%, #ebe4d8 55%, #ddd4c6 100%)',
                boxShadow:
                  '0 6px 18px rgba(21,19,33,0.14), 0 0 0 1px rgba(21,19,33,0.08), inset 0 1px 0 rgba(255,255,255,0.85)',
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

            <div className="absolute" style={{ left: 36, top: 44, width: floorW, height: floorH }}>
              {/* Open plaza / row gaps */}
              {Array.from({ length: rowsN }).map((_, row) => {
                const len = layout[row] || 0;
                return Array.from({ length: maxCols }).map((__, col) => {
                  if (col < len && occupied.has(`${row}:${col}`)) return null;
                  const isGap = col >= len;
                  return (
                    <div
                      key={`g-${row}-${col}`}
                      className="absolute rounded-lg"
                      style={{
                        left: lx(col),
                        top: ly(row),
                        width: CELL,
                        height: CELL,
                        border: isGap
                          ? '1.5px dashed rgba(124,58,237,0.3)'
                          : '1.5px dashed rgba(255,255,255,0.9)',
                        background: isGap ? 'rgba(124,58,237,0.05)' : 'rgba(255,255,255,0.15)',
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
            : `linear-gradient(150deg, #ffffff 0%, ${topColor} 55%, ${rim} 100%)`,
          color: stage ? '#fff' : side,
          boxShadow: selected
            ? `0 0 0 3px #fff, 0 0 0 5px #d6206e, 0 18px 36px rgba(214,32,110,0.35)`
            : `inset 0 0 0 2px ${side}55, 0 8px 20px rgba(21,19,33,0.16)`,
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
