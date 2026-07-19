import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Hall, Stall, StallStatus } from '../types';
import { stallColors } from './ui';
import { useAuth } from '../auth';
import { Search, X, Check, Grid, Download, Phone, Mail, Globe, ArrowRight, Building } from './icons';
import { toEmbedUrl } from '../media';
import { hallRowLayout, hallMarkers } from '../floorLayout';
import FloorViewToggle, { type FloorViewMode } from './FloorViewToggle';
import FloorPlan3D from './FloorPlan3D';
import FloorPlan2D from './FloorPlan2D';
import FloorPlanCompact from './FloorPlanCompact';

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
  const [viewMode, setViewMode] = useState<FloorViewMode>('compact');
  const [bookStep, setBookStep] = useState<1 | 2>(1);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<{ reference: string } | null>(null);
  const [form, setForm] = useState({
    company_name: '', contact_person: '', contact_email: '', contact_phone: '', payment_mode: 'UPI',
  });

  const hall = halls.find((h) => h.id === hallId);
  const layout = hallRowLayout(hall);
  const markers = hallMarkers(hall);

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

  const dimStall = (s: Stall) => {
    if (availableOnly && s.status !== 'available') return true;
    if (statusFilter !== 'all' && s.status !== statusFilter) return true;
    if (search && !s.code.includes(search) && !(s.company_name || '').toUpperCase().includes(search)) return true;
    return false;
  };

  const step: 1 | 2 | 3 | 4 = confirmed ? 4 : !selected ? 1 : bookStep === 2 ? 3 : 2;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_minmax(280px,380px)]">
      {/* ---- Map panel ---- */}
      <div className="overflow-hidden rounded-[1.5rem] border border-ink-100/80 bg-white shadow-[0_24px_60px_-28px_rgba(21,19,33,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-ink-50 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-lg bg-grad px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-sm">
              {viewMode === '3d' ? '3D' : viewMode === 'compact' ? 'Compact' : '2D'} interactive view
            </span>
            <FloorViewToggle value={viewMode} onChange={setViewMode} modes={['compact', '2d', '3d']} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {halls.length > 1 && (
              <select
                value={hallId ?? ''}
                onChange={(e) => { setHallId(Number(e.target.value)); setSelected(null); }}
                className="input w-auto rounded-full border-ink-100 py-1.5 text-xs font-semibold"
              >
                {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-ink-50/50 px-3">
              <Search width={13} className="text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value.toUpperCase())}
                placeholder="Find stall…"
                className="w-24 bg-transparent py-1.5 text-xs outline-none sm:w-32"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-ink-300 hover:text-ink-600"><X width={12} /></button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-50 px-4 py-2">
          <button
            type="button"
            onClick={() => setAvailableOnly((v) => !v)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
              availableOnly ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {available} available
          </button>
          {(['all', 'available', 'booked', 'reserved'] as StatusFilter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStatusFilter(k)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${
                statusFilter === k ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
              }`}
            >
              {k === 'all' ? 'All' : stallColors[k as StallStatus].label}
            </button>
          ))}
          {halls.length === 1 && hall && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-ink-300">{hall.name}</span>
          )}
        </div>

        {loading ? (
          <div className="grid h-80 place-items-center text-ink-400">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand" />
          </div>
        ) : viewMode === '3d' ? (
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <FloorPlan3D
              layout={layout}
              stalls={stalls}
              markers={markers.items}
              entranceLabel={markers.entrance_label}
              exitLabel={markers.exit_label}
              entranceSide={markers.entrance_side}
              exitSide={markers.exit_side}
              selectedId={selected?.id}
              search={search}
              dimUnavailable={availableOnly || statusFilter === 'available'}
              onStallClick={openStall}
            />
          </div>
        ) : viewMode === 'compact' ? (
          <div className="px-3 pb-4 pt-3 sm:px-4">
            <FloorPlanCompact
              layout={layout}
              stalls={stalls}
              markers={markers.items}
              entranceLabel={markers.entrance_label}
              exitLabel={markers.exit_label}
              entranceSide={markers.entrance_side}
              exitSide={markers.exit_side}
              selectedId={selected?.id}
              search={search}
              dimStall={dimStall}
              onStallClick={openStall}
            />
          </div>
        ) : (
          <div className="overflow-x-auto px-4 pb-6 pt-2">
            <FloorPlan2D
              layout={layout}
              stalls={stalls}
              markers={markers.items}
              entranceLabel={markers.entrance_label}
              exitLabel={markers.exit_label}
              entranceSide={markers.entrance_side}
              exitSide={markers.exit_side}
              selectedId={selected?.id}
              search={search}
              dimStall={dimStall}
              onStallClick={openStall}
            />
          </div>
        )}
      </div>

      {/* ---- Booking panel — sticky, scrolls its own content ---- */}
      <div className="h-fit rounded-[1.5rem] border border-ink-100/80 bg-white shadow-[0_24px_60px_-28px_rgba(21,19,33,0.3)] lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col lg:overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-50 px-4 py-2.5">
          <span className="rounded-lg bg-ink-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-sm">
            Booking process
          </span>
          {selected && (
            <button
              type="button"
              onClick={() => { setSelected(null); setConfirmed(null); setBookStep(1); }}
              className="rounded-full p-1.5 text-ink-300 hover:bg-ink-50 hover:text-ink-600"
              aria-label="Clear selection"
            >
              <X width={15} />
            </button>
          )}
        </div>
        {/* Stepper only for open booking flow — hide on booked / occupied stalls */}
        {(!selected || selected.status === 'available' || confirmed) && (
          <BookSteps step={step} />
        )}
        <div className="relative lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {!selected ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efe8] text-ink-500">
              <Grid width={22} />
            </div>
            <p className="font-display text-base font-bold text-ink-900">Choose a stall</p>
            <p className="mx-auto mt-1.5 max-w-[200px] text-sm leading-relaxed text-ink-400">
              Tap any booth on the {viewMode === '3d' ? '3D hall' : 'map'} to see details and book.
            </p>
            <div className="mx-auto mt-6 flex max-w-[220px] justify-center gap-6 text-center">
              <div>
                <div className="font-display text-xl font-extrabold text-emerald-600">{available}</div>
                <div className="text-[11px] font-semibold text-ink-400">Free</div>
              </div>
              <div>
                <div className="font-display text-xl font-extrabold text-brand-600">{legend.booked || 0}</div>
                <div className="text-[11px] font-semibold text-ink-400">Booked</div>
              </div>
            </div>
          </div>
        ) : confirmed ? (
          <div className="animate-pop p-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check width={28} />
            </div>
            <h3 className="font-display text-xl font-extrabold text-ink-900">You’re in</h3>
            <p className="mt-1 text-sm text-ink-500">Stall <b>{selected.code}</b> at {exhibitionName}</p>
            <div className="mt-5 rounded-2xl bg-ink-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Reference</div>
              <div className="font-display text-lg font-extrabold text-brand-700">{confirmed.reference}</div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { setSelected(null); setConfirmed(null); }} className="btn-outline flex-1">Another</button>
              <button type="button" onClick={() => navigate('/my-bookings')} className="btn-primary flex-1">Bookings</button>
            </div>
          </div>
        ) : selected.status !== 'available' && hasCompany ? (
          /* ---- Occupied stall → exhibitor spotlight (no stall specs for visitors) ---- */
          <div className="animate-slide-up p-5">
            <div className="overflow-hidden rounded-2xl border border-ink-100">
              <div className="relative h-14 bg-grad">
                <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur">
                  {stallColors[selected.status].label}
                </span>
                <img
                  src={selected.company_logo}
                  alt=""
                  className="absolute -bottom-6 left-4 h-14 w-14 rounded-2xl border-4 border-white bg-white object-cover shadow-sm"
                />
              </div>
              <div className="px-4 pb-4 pt-8">
                <div className="font-display text-lg font-extrabold leading-tight text-ink-900">{selected.company_name}</div>
                {selected.company_industry && <div className="mt-0.5 text-xs text-ink-500">{selected.company_industry}</div>}
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-[10px] font-bold text-ink-500">
                  <Grid width={11} /> Stall {selected.code} · {selected.zone}
                </span>
              </div>
            </div>

            {selected.description && <p className="mt-4 text-sm leading-relaxed text-ink-600">{selected.description}</p>}

            {(selected.company_contact || selected.company_email || selected.company_phone || selected.company_website) && (
              <div className="mt-4 space-y-2 rounded-2xl bg-ink-50/60 p-3.5 text-sm text-ink-600">
                {selected.company_contact && <div className="flex items-center gap-2"><Building width={14} className="shrink-0 text-ink-300" />{selected.company_contact}</div>}
                {selected.company_email && <div className="flex items-center gap-2"><Mail width={14} className="shrink-0 text-ink-300" /><span className="truncate">{selected.company_email}</span></div>}
                {selected.company_phone && <div className="flex items-center gap-2"><Phone width={14} className="shrink-0 text-ink-300" />{selected.company_phone}</div>}
                {selected.company_website && <div className="flex items-center gap-2"><Globe width={14} className="shrink-0 text-ink-300" /><span className="truncate">{selected.company_website}</span></div>}
              </div>
            )}

            {(selected.brochure_url || selected.documents?.length) && (
              <div className="mt-4 space-y-2">
                {selected.brochure_url && (
                  <a href={selected.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm hover:bg-ink-50">
                    <Download width={15} className="text-brand" /> Brochure
                  </a>
                )}
                {selected.documents?.map((d) => (
                  <a key={d.name} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm hover:bg-ink-50">
                    <Download width={15} className="text-brand" /> {d.name}
                  </a>
                ))}
              </div>
            )}

            {toEmbedUrl(selected.company_youtube || selected.youtube_url) && (
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-ink-950">
                <iframe title="Video" src={toEmbedUrl(selected.company_youtube || selected.youtube_url)!} className="h-full w-full border-0" allowFullScreen />
              </div>
            )}

            {selected.company_id && (
              <Link to={`/company/${selected.company_id}`} className="btn-primary mt-5 w-full text-sm">
                View company profile <ArrowRight width={14} />
              </Link>
            )}

            {isAdmin && (
              <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
                <Info label="Price · admin" value={<span className="font-bold">{formatINR(selected.price)}</span>} />
                <Info label="Area" value={`${selected.area} m²`} />
              </div>
            )}
          </div>
        ) : selected.status !== 'available' ? (
          /* ---- Occupied stall, exhibitor not announced yet ---- */
          <div className="animate-slide-up p-5">
            <div className="rounded-2xl bg-ink-50 px-4 py-8 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">{stallColors[selected.status].label}</p>
              <h3 className="mt-1 font-display text-xl font-extrabold text-ink-900">Stall {selected.code}</h3>
              <p className="mx-auto mt-2 max-w-[220px] text-sm leading-relaxed text-ink-500">
                Exhibitor details will appear here once the brand is confirmed.
              </p>
            </div>
            {isAdmin && (
              <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
                <Info label="Price · admin" value={<span className="font-bold">{formatINR(selected.price)}</span>} />
                <Info label="Area" value={`${selected.area} m²`} />
              </div>
            )}
          </div>
        ) : !canBook ? (
          /* ---- Available · guest/visitor — open status only ---- */
          <div className="animate-slide-up flex flex-col items-center px-5 py-10 text-center">
            <div className="relative mb-5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
              <span className="relative grid h-16 w-16 place-items-center rounded-full bg-emerald-50 ring-4 ring-emerald-100">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Still open</p>
            <h3 className="mt-1.5 font-display text-2xl font-extrabold text-ink-900">Stall {selected.code}</h3>
            <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-ink-400">
              No exhibitor here yet — this booth is free for the show.
            </p>
            <div className="mt-6 h-px w-16 bg-ink-100" />
            <p className="mt-5 text-[11px] text-ink-400">
              Exhibitor?{' '}
              <button
                type="button"
                onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
                className="font-semibold text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700"
              >
                Sign in to book
              </button>
            </p>
          </div>
        ) : (
          /* ---- Available · exhibitor/admin → booking card ---- */
          <div className="animate-slide-up p-5">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white p-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Available
              </span>
              <div className="mt-2 flex items-end justify-between gap-2">
                <h3 className="font-display text-2xl font-extrabold text-ink-900">Stall {selected.code}</h3>
                <span className="pb-1 text-xs font-semibold text-ink-400">{selected.zone}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <Info label="Size" value={`${selected.width}×${selected.depth} m`} />
              <Info label="Area" value={`${selected.area} m²`} />
              <Info label="Type" value={selected.type} />
            </div>

            {selected.facilities && selected.facilities.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Included with this stall</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.facilities.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      <Check width={11} /> {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.description && <p className="mt-4 text-sm leading-relaxed text-ink-600">{selected.description}</p>}

            {(selected.brochure_url || selected.documents?.length) && (
              <div className="mt-4 space-y-2">
                {selected.brochure_url && (
                  <a href={selected.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm hover:bg-ink-50">
                    <Download width={15} className="text-brand" /> Brochure
                  </a>
                )}
                {selected.documents?.map((d) => (
                  <a key={d.name} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm hover:bg-ink-50">
                    <Download width={15} className="text-brand" /> {d.name}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-ink-50 pt-4">
              {bookStep === 1 ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4 text-sm">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-400">Price summary</div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-ink-500">Stall price ({selected.area} m²)</span>
                      <span className="font-semibold text-ink-800">{formatINR(selected.price)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-ink-500">GST (18%)</span>
                      <span className="font-semibold text-ink-800">{formatINR(Math.round(selected.price * 0.18))}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink-200 pt-2.5">
                      <span className="font-bold text-ink-900">Total amount</span>
                      <span className="font-display text-lg font-extrabold text-brand-700">{formatINR(Math.round(selected.price * 1.18))}</span>
                    </div>
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
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setBookStep(1)} className="btn-outline flex-1">Back</button>
                    <button type="button" onClick={submitBooking} disabled={booking} className="btn-primary flex-[1.3]">
                      {booking ? '…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Scroll cue — fades out content near the bottom edge on tall panels */}
        {selected && !confirmed && (
          <div className="pointer-events-none sticky bottom-0 hidden h-8 bg-gradient-to-t from-white to-transparent lg:block" />
        )}
        </div>
      </div>
    </div>
  );
}

const BOOK_STEPS = ['Select stall', 'Review', 'Book', 'Confirm'] as const;

function BookSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-ink-50 px-4 py-2.5">
      {BOOK_STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && <span className={`h-px w-3.5 ${done || active ? 'bg-brand-300' : 'bg-ink-100'}`} />}
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[9px] font-black ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-grad text-white shadow-sm' : 'bg-ink-100 text-ink-400'
              }`}
            >
              {done ? <Check width={10} /> : n}
            </span>
            <span className={`text-[10px] font-bold ${active ? 'text-ink-900' : done ? 'text-emerald-600' : 'text-ink-400'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-ink-50/80 px-3 py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink-800">{value}</dd>
    </div>
  );
}
