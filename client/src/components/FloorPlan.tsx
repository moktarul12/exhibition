import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Hall, Stall, StallStatus } from '../types';
import { stallColors } from './ui';
import { useAuth } from '../auth';
import { Search, X, Check, Grid, Download, Phone, Mail, Globe, ArrowRight, Building, Zap } from './icons';
import { toEmbedUrl } from '../media';
import { hallRowLayout, hallMarkers, stallSpans, MARKER_META } from '../floorLayout';
import FloorViewToggle, { type FloorViewMode } from './FloorViewToggle';
import FloorPlan3D from './FloorPlan3D';

type StatusFilter = 'all' | StallStatus;

export default function FloorPlan({ halls, exhibitionName }: { halls: Hall[]; exhibitionName: string }) {
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [hallId, setHallId] = useState<number | null>(halls[0]?.id ?? null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Stall | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<FloorViewMode>('2d');
  const [bookStep, setBookStep] = useState<1 | 2>(1);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<{ reference: string } | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [form, setForm] = useState({
    company_name: '', contact_person: '', contact_email: '', contact_phone: '', payment_mode: 'UPI',
  });

  const hall = halls.find((h) => h.id === hallId);
  const layout = hallRowLayout(hall);
  const markers = hallMarkers(hall);
  const maxCols = Math.max(...layout, 1);
  const rowsN = layout.length;
  const CELL = 56;
  const GAP = 7;

  const loadStalls = () => {
    if (!hallId) return;
    setLoading(true);
    api.get(`/halls/${hallId}/stalls`).then((r) => setStalls(r.data)).finally(() => setLoading(false));
  };
  useEffect(loadStalls, [hallId]);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, contact_person: user.name, contact_email: user.email, contact_phone: user.phone || '' }));
  }, [user]);

  const legend = useMemo(() => {
    const counts: Record<string, number> = {};
    stalls.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return counts;
  }, [stalls]);

  const available = legend.available || 0;
  const total = stalls.length || 1;
  const occupancy = Math.round(((total - available) / total) * 100);

  const openStall = (s: Stall) => {
    setConfirmed(null);
    setBookStep(1);
    api.get(`/stalls/${s.id}`).then((r) => setSelected(r.data));
  };

  const submitBooking = async () => {
    if (!selected) return;
    if (!canBook) { navigate('/login', { state: { from: window.location.pathname } }); return; }
    setBooking(true);
    try {
      const r = await api.post('/bookings', { stall_id: selected.id, ...form });
      setConfirmed({ reference: r.data.reference });
      loadStalls();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Booking failed');
    } finally { setBooking(false); }
  };

  const hasCompany = !!(selected?.company_id || selected?.company_name);
  const cellStyle = (row: number, col: number, spanCols = 1, spanRows = 1): CSSProperties => ({
    gridColumn: `${col + 1} / span ${spanCols}`,
    gridRow: `${row + 1} / span ${spanRows}`,
  });

  const dimStall = (s: Stall) => {
    if (availableOnly && s.status !== 'available') return true;
    if (statusFilter !== 'all' && s.status !== statusFilter) return true;
    if (search && !s.code.includes(search) && !(s.company_name || '').toUpperCase().includes(search)) return true;
    return false;
  };

  const hoverStall = hoverId ? stalls.find((s) => s.id === hoverId) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_minmax(300px,400px)]">
      <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-gradient-to-r from-white via-brand-50/30 to-grape-50/40 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={hallId ?? ''}
              onChange={(e) => { setHallId(Number(e.target.value)); setSelected(null); }}
              className="input w-auto rounded-full py-2 text-sm font-semibold"
            >
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <FloorViewToggle value={viewMode} onChange={setViewMode} />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 shadow-sm">
            <Search width={15} className="text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              placeholder="Stall or brand…"
              className="w-36 bg-transparent py-2 text-sm outline-none sm:w-44"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-ink-300 hover:text-ink-600"><X width={14} /></button>
            )}
          </div>
        </div>

        {/* Stats + filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 rounded-2xl bg-ink-50/80 px-3 py-2">
            <div
              className="relative grid h-11 w-11 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#d6206e ${occupancy}%, #e5e7eb ${occupancy}%)`,
              }}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-extrabold text-ink-800">
                {occupancy}%
              </span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Hall fill</div>
              <div className="text-sm font-bold text-ink-800">
                <span className="text-emerald-600">{available}</span>
                <span className="text-ink-400"> / {stalls.length} free</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAvailableOnly((v) => !v)}
            className={`rounded-full px-3.5 py-2 text-xs font-bold transition-all ${
              availableOnly
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Zap width={12} className="inline" /> Available only
          </button>

          <div className="flex flex-wrap gap-1.5">
            {(['all', 'available', 'reserved', 'booked', 'sponsor'] as StatusFilter[]).map((k) => {
              const active = statusFilter === k;
              const count = k === 'all' ? stalls.length : legend[k] || 0;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStatusFilter(k)}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                    active ? 'bg-ink-900 text-white' : 'bg-white text-ink-500 ring-1 ring-ink-100 hover:ring-ink-200'
                  }`}
                >
                  {k === 'all' ? 'All' : stallColors[k as StallStatus].label}
                  <span className={`ml-1 ${active ? 'text-white/60' : 'text-ink-300'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid h-72 place-items-center">
            <div className="flex flex-col items-center gap-3 text-ink-400">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand" />
              <span className="text-sm">Loading floor plan…</span>
            </div>
          </div>
        ) : viewMode === '3d' ? (
          <div className="p-3 sm:p-4">
            <FloorPlan3D
              layout={layout}
              stalls={stalls}
              markers={markers.items}
              entranceLabel={markers.entrance_label}
              exitLabel={markers.exit_label}
              selectedId={selected?.id}
              search={search}
              dimUnavailable={availableOnly || statusFilter === 'available'}
              onStallClick={openStall}
            />
            <p className="mt-2 text-center text-xs text-ink-400">Tap a booth · switch to 2D for a classic grid</p>
          </div>
        ) : (
          <div className="floor-canvas overflow-x-auto p-4 sm:p-5">
            <div
              className="relative mx-auto rounded-2xl border border-ink-100/80 bg-white/70 p-4 shadow-inner backdrop-blur-sm"
              style={{ minWidth: maxCols * (CELL + GAP) + 32 }}
            >
              <div className="mb-3 overflow-hidden rounded-full bg-grad py-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md animate-shimmer"
                style={{ backgroundImage: 'linear-gradient(90deg,#059669,#10b981,#34d399,#059669)', backgroundSize: '200% 100%' }}
              >
                {markers.entrance_label}
              </div>

              <div
                className="relative mx-auto"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${maxCols}, ${CELL}px)`,
                  gridTemplateRows: `repeat(${rowsN}, ${CELL}px)`,
                  gap: GAP,
                  width: maxCols * CELL + (maxCols - 1) * GAP,
                }}
              >
                {Array.from({ length: rowsN * maxCols }).map((_, idx) => {
                  const row = Math.floor(idx / maxCols);
                  const col = idx % maxCols;
                  const inLayout = col < (layout[row] || 0);
                  return (
                    <div
                      key={`${row}:${col}`}
                      style={cellStyle(row, col)}
                      className={inLayout ? 'rounded-xl bg-ink-50/60 ring-1 ring-ink-100/80' : ''}
                    />
                  );
                })}

                {markers.items.map((m) => {
                  const meta = MARKER_META[m.kind] || MARKER_META.custom;
                  return (
                    <div
                      key={m.id}
                      style={cellStyle(m.grid_row, m.grid_col, m.span_cols || 1, m.span_rows || 1)}
                      className={`z-[5] grid place-items-center rounded-xl border text-[10px] font-bold shadow-sm ${meta.className}`}
                    >
                      {m.label}
                    </div>
                  );
                })}

                {stalls.map((stall, i) => {
                  const { span_cols, span_rows, display_size } = stallSpans(stall);
                  const c = stallColors[stall.status];
                  const isMatch = search && (stall.code.includes(search) || (stall.company_name || '').toUpperCase().includes(search));
                  const isSel = selected?.id === stall.id;
                  const dim = dimStall(stall);
                  const sizeCls = display_size === 'small' ? 'text-[9px]' : 'text-[11px]';
                  const elev =
                    stall.status === 'available' ? 'stall-tile-available'
                      : stall.status === 'booked' || stall.status === 'sponsor' ? 'stall-tile-booked'
                        : '';
                  return (
                    <button
                      key={stall.id}
                      type="button"
                      onClick={() => openStall(stall)}
                      onMouseEnter={() => setHoverId(stall.id)}
                      onMouseLeave={() => setHoverId(null)}
                      title={stall.company_name ? `${stall.code} · ${stall.company_name}` : `${stall.code} · ${c.label}`}
                      style={{
                        ...cellStyle(stall.grid_row, stall.grid_col, span_cols, span_rows),
                        animationDelay: `${Math.min(i, 30) * 0.025}s`,
                        opacity: dim ? 0.28 : 1,
                        filter: dim ? 'grayscale(0.6)' : undefined,
                      }}
                      className={`stall-tile z-10 grid place-items-center rounded-xl border font-bold animate-stall-in ${sizeCls} ${c.bg} ${c.border} ${c.text} ${elev} ${
                        isSel ? 'stall-tile-selected' : ''
                      } ${isMatch ? 'animate-glow-pulse ring-2 ring-brand-500' : ''}`}
                    >
                      {stall.company_logo ? (
                        <img src={stall.company_logo} alt="" className="h-8 w-8 rounded-lg object-cover shadow-sm ring-1 ring-black/5" />
                      ) : (
                        <span className="leading-tight">{stall.code}</span>
                      )}
                      {stall.status === 'available' && (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                      )}
                      {stall.company_name && !stall.company_logo && (
                        <span className="absolute bottom-0.5 max-w-[90%] truncate px-0.5 text-[7px] font-semibold opacity-60">
                          {stall.company_name.slice(0, 8)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-full bg-ink-200/80 py-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
                {markers.exit_label}
              </div>

              {/* Floating hover tip */}
              {hoverStall && !selected && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 animate-slide-up rounded-2xl border border-ink-100 bg-ink-950/95 px-4 py-2.5 text-white shadow-xl backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span className={`h-2.5 w-2.5 rounded-sm ${stallColors[hoverStall.status].legend}`} />
                    {hoverStall.code}
                    {hoverStall.company_name && <span className="font-medium text-white/70">· {hoverStall.company_name}</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/50">
                    {hoverStall.width}×{hoverStall.depth}m · {stallColors[hoverStall.status].label}
                    {hoverStall.status === 'available' && ' · Tap to book'}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-ink-400">
              Hover for a preview · tap to open details · green glow = available
            </p>
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="sticky top-28 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl border border-ink-100 bg-white shadow-soft">
        {!selected ? (
          <div className="animate-fade-in px-5 py-12 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-grape-100 text-brand-600 shadow-inner">
              <Grid width={30} />
            </div>
            <p className="font-display text-base font-bold text-ink-800">Pick a stall on the map</p>
            <p className="mx-auto mt-1.5 max-w-[240px] text-xs leading-relaxed text-ink-400">
              Tap any booth to see the exhibitor, size and — if free — book in two quick steps.
            </p>
            <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-2 text-center">
              {[
                { n: available, l: 'Free', c: 'text-emerald-600 bg-emerald-50' },
                { n: legend.booked || 0, l: 'Booked', c: 'text-brand-700 bg-brand-50' },
                { n: legend.reserved || 0, l: 'Held', c: 'text-amber-700 bg-amber-50' },
              ].map((s) => (
                <div key={s.l} className={`rounded-2xl px-2 py-3 ${s.c}`}>
                  <div className="font-display text-xl font-extrabold">{s.n}</div>
                  <div className="text-[10px] font-semibold opacity-70">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        ) : confirmed ? (
          <div className="animate-pop p-6 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/20">
              <Check width={30} />
            </div>
            <h3 className="font-display text-lg font-extrabold text-ink-900">Booking confirmed!</h3>
            <p className="mt-1 text-sm text-ink-500">Stall <b>{selected.code}</b> at {exhibitionName} is yours.</p>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-50 to-grape-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Reference</div>
              <div className="font-display text-xl font-extrabold text-brand-700">{confirmed.reference}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setSelected(null); setConfirmed(null); }} className="btn-outline flex-1">Book another</button>
              <button type="button" onClick={() => navigate('/my-bookings')} className="btn-primary flex-1">My bookings</button>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-sm ${stallColors[selected.status].legend}`} />
                  <h3 className="font-display text-lg font-extrabold text-ink-900">Stall {selected.code}</h3>
                </div>
                <div className="mt-0.5 text-xs text-ink-500">{selected.hall_name} · {exhibitionName}</div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100">
                <X width={18} />
              </button>
            </div>

            {/* Quick specs strip */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { l: 'Size', v: `${selected.width}×${selected.depth}m` },
                { l: 'Area', v: `${selected.area} m²` },
                { l: 'Zone', v: selected.zone || '—' },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-ink-50 px-2 py-2.5 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-ink-400">{x.l}</div>
                  <div className="truncate text-xs font-bold text-ink-800">{x.v}</div>
                </div>
              ))}
            </div>

            {hasCompany ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white">
                <div className="flex items-center gap-3 p-4">
                  <img src={selected.company_logo} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Exhibiting company</div>
                    <div className="truncate font-display text-base font-extrabold text-ink-900">{selected.company_name}</div>
                    {selected.company_industry && <div className="truncate text-xs text-ink-500">{selected.company_industry}</div>}
                  </div>
                </div>
                {selected.company_about && (
                  <p className="border-t border-brand-100/60 px-4 py-3 text-sm leading-relaxed text-ink-600 line-clamp-3">{selected.company_about}</p>
                )}
                <div className="space-y-2 border-t border-brand-100/60 px-4 py-3 text-sm text-ink-600">
                  {selected.company_contact && <div className="flex items-center gap-2"><Building width={14} className="text-ink-400" /> {selected.company_contact}</div>}
                  {selected.company_email && <div className="flex items-center gap-2"><Mail width={14} className="text-ink-400" /> {selected.company_email}</div>}
                  {selected.company_phone && <div className="flex items-center gap-2"><Phone width={14} className="text-ink-400" /> {selected.company_phone}</div>}
                  {selected.company_website && <div className="flex items-center gap-2"><Globe width={14} className="text-ink-400" /> {selected.company_website}</div>}
                </div>
                {selected.company_id && (
                  <div className="border-t border-brand-100/60 p-3">
                    <Link to={`/company/${selected.company_id}`} className="btn-primary w-full text-sm">
                      View company profile <ArrowRight width={15} />
                    </Link>
                  </div>
                )}
                {toEmbedUrl(selected.company_youtube || selected.youtube_url) && (
                  <div className="border-t border-brand-100/60 p-3">
                    <div className="aspect-video overflow-hidden rounded-xl bg-ink-950">
                      <iframe title="Company video" src={toEmbedUrl(selected.company_youtube || selected.youtube_url)!} className="h-full w-full border-0" allowFullScreen />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-4 py-5 text-center">
                <Building width={22} className="mx-auto text-ink-300" />
                <p className="mt-2 text-sm font-medium text-ink-600">
                  {selected.status === 'available' ? 'Open for your brand' : stallColors[selected.status].label}
                </p>
              </div>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Info label="Type" value={selected.type} />
              <Info label="Status" value={<span className={`${stallColors[selected.status].text} font-semibold`}>{stallColors[selected.status].label}</span>} />
              {isAdmin && <Info label="Price" value={<span className="font-bold text-ink-900">{formatINR(selected.price)}</span>} />}
            </dl>

            {selected.description && <p className="mt-3 text-sm leading-relaxed text-ink-600">{selected.description}</p>}

            {selected.facilities && selected.facilities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.facilities.map((f) => (
                  <span key={f} className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-700">{f}</span>
                ))}
              </div>
            )}

            {(selected.brochure_url || (selected.documents && selected.documents.length > 0)) && (
              <div className="mt-4 space-y-2">
                {selected.brochure_url && (
                  <a href={selected.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                    <Download width={16} className="text-brand-600" /> Stall Brochure.pdf
                  </a>
                )}
                {selected.documents?.map((d) => (
                  <a key={d.name} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                    <Download width={16} className="text-brand-600" /> {d.name}
                  </a>
                ))}
              </div>
            )}

            {/* Booking — 2-step */}
            {canBook && selected.status === 'available' && (
              <div className="mt-5 border-t border-ink-100 pt-4">
                <div className="mb-3 flex items-center gap-2">
                  {[1, 2].map((s) => (
                    <div key={s} className="flex flex-1 items-center gap-2">
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${
                        bookStep >= s ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400'
                      }`}>{s}</span>
                      <span className={`text-[11px] font-semibold ${bookStep >= s ? 'text-ink-800' : 'text-ink-400'}`}>
                        {s === 1 ? 'Review' : 'Details'}
                      </span>
                      {s === 1 && <span className="h-px flex-1 bg-ink-100" />}
                    </div>
                  ))}
                </div>

                {bookStep === 1 ? (
                  <div className="animate-fade-in space-y-3">
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-brand-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Ready to reserve</div>
                      <div className="mt-1 font-display text-lg font-extrabold text-ink-900">{selected.code}</div>
                      <div className="mt-1 text-sm text-ink-600">{selected.width}×{selected.depth}m · {selected.zone}</div>
                      {isAdmin && (
                        <div className="mt-2 font-display text-xl font-extrabold text-brand-700">{formatINR(selected.price)}</div>
                      )}
                    </div>
                    <button type="button" onClick={() => setBookStep(2)} className="btn-primary w-full">
                      Continue to book <ArrowRight width={15} />
                    </button>
                  </div>
                ) : (
                  <div className="animate-slide-up space-y-2.5">
                    <input className="input" placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                    <input className="input" placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
                    <input className="input" placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                    <input className="input" placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                    <select className="input" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
                      <option>UPI</option><option>Credit Card</option><option>Bank Transfer</option>
                    </select>
                    <div className="rounded-2xl bg-brand-50 p-3.5 text-sm font-medium text-brand-800">
                      {isAdmin ? <>Total {formatINR(selected.price)}</> : 'Organizer will confirm pricing after submit'}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setBookStep(1)} className="btn-outline flex-1">Back</button>
                      <button type="button" onClick={submitBooking} disabled={booking} className="btn-primary flex-[1.4]">
                        {booking ? 'Booking…' : 'Confirm booking'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!canBook && selected.status === 'available' && (
              <div className="mt-5 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-4 text-center text-sm text-ink-600">
                Want this stall?
                <button type="button" onClick={() => navigate('/login')} className="mt-2 block w-full font-bold text-brand-700 underline">
                  Login as exhibitor to book
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="text-ink-700">{value}</dd>
    </div>
  );
}
