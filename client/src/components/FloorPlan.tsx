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
  const [viewMode, setViewMode] = useState<FloorViewMode>('3d');
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(280px,380px)]">
      <div className="overflow-hidden rounded-[1.75rem] border border-ink-100/80 bg-white shadow-[0_24px_60px_-28px_rgba(21,19,33,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-50 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={hallId ?? ''}
              onChange={(e) => { setHallId(Number(e.target.value)); setSelected(null); }}
              className="input w-auto rounded-full border-ink-100 py-2 text-sm font-semibold"
            >
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <FloorViewToggle value={viewMode} onChange={setViewMode} />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-ink-100 bg-ink-50/50 px-3.5">
            <Search width={15} className="text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              placeholder="Find stall…"
              className="w-32 bg-transparent py-2.5 text-sm outline-none sm:w-40"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-ink-300 hover:text-ink-600"><X width={14} /></button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <button
            type="button"
            onClick={() => setAvailableOnly((v) => !v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
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
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                statusFilter === k ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
              }`}
            >
              {k === 'all' ? 'All' : stallColors[k as StallStatus].label}
            </button>
          ))}
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
              selectedId={selected?.id}
              search={search}
              dimUnavailable={availableOnly || statusFilter === 'available'}
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
              selectedId={selected?.id}
              search={search}
              dimStall={dimStall}
              onStallClick={openStall}
            />
          </div>
        )}
      </div>

      {/* Side panel — calm & clear */}
      <div className="sticky top-28 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.75rem] border border-ink-100/80 bg-white shadow-[0_24px_60px_-28px_rgba(21,19,33,0.3)]">
        {!selected ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#f3efe8] text-ink-500">
              <Grid width={26} />
            </div>
            <p className="font-display text-lg font-bold text-ink-900">Choose a stall</p>
            <p className="mx-auto mt-2 max-w-[200px] text-sm leading-relaxed text-ink-400">
              Tap any booth on the {viewMode === '3d' ? '3D hall' : 'map'} to see details and book.
            </p>
            <div className="mx-auto mt-8 flex max-w-[220px] justify-center gap-6 text-center">
              <div>
                <div className="font-display text-2xl font-extrabold text-emerald-600">{available}</div>
                <div className="text-[11px] font-semibold text-ink-400">Free</div>
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold text-brand-600">{legend.booked || 0}</div>
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
        ) : (
          <div className="animate-slide-up p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">{stallColors[selected.status].label}</p>
                <h3 className="font-display text-2xl font-extrabold text-ink-900">Stall {selected.code}</h3>
                <p className="mt-0.5 text-sm text-ink-500">{selected.width}×{selected.depth}m · {selected.zone}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 text-ink-300 hover:bg-ink-50 hover:text-ink-600">
                <X width={18} />
              </button>
            </div>

            {hasCompany ? (
              <div className="mt-5 overflow-hidden rounded-2xl bg-[#faf8f5]">
                <div className="flex items-center gap-3 p-4">
                  <img src={selected.company_logo} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                  <div className="min-w-0">
                    <div className="truncate font-display font-bold text-ink-900">{selected.company_name}</div>
                    {selected.company_industry && <div className="truncate text-xs text-ink-500">{selected.company_industry}</div>}
                  </div>
                </div>
                {selected.company_id && (
                  <div className="border-t border-ink-100/80 p-3">
                    <Link to={`/company/${selected.company_id}`} className="btn-primary w-full text-sm">
                      Company profile <ArrowRight width={14} />
                    </Link>
                  </div>
                )}
              </div>
            ) : selected.status === 'available' ? (
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-4 text-center text-sm text-emerald-800">
                This stall is open for your brand
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Info label="Type" value={selected.type} />
              <Info label="Area" value={`${selected.area} m²`} />
              {isAdmin && <Info label="Price" value={<span className="font-bold">{formatINR(selected.price)}</span>} />}
            </div>

            {selected.description && <p className="mt-4 text-sm leading-relaxed text-ink-600">{selected.description}</p>}

            {selected.facilities && selected.facilities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selected.facilities.map((f) => (
                  <span key={f} className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-600">{f}</span>
                ))}
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

            {selected.company_contact || selected.company_email || selected.company_phone ? (
              <div className="mt-4 space-y-2 text-sm text-ink-600">
                {selected.company_contact && <div className="flex items-center gap-2"><Building width={14} className="text-ink-300" />{selected.company_contact}</div>}
                {selected.company_email && <div className="flex items-center gap-2"><Mail width={14} className="text-ink-300" />{selected.company_email}</div>}
                {selected.company_phone && <div className="flex items-center gap-2"><Phone width={14} className="text-ink-300" />{selected.company_phone}</div>}
                {selected.company_website && <div className="flex items-center gap-2"><Globe width={14} className="text-ink-300" />{selected.company_website}</div>}
              </div>
            ) : null}

            {toEmbedUrl(selected.company_youtube || selected.youtube_url) && (
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-ink-950">
                <iframe title="Video" src={toEmbedUrl(selected.company_youtube || selected.youtube_url)!} className="h-full w-full border-0" allowFullScreen />
              </div>
            )}

            {canBook && selected.status === 'available' && (
              <div className="mt-6 border-t border-ink-50 pt-5">
                {bookStep === 1 ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-grad p-4 text-white">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">Reserve</div>
                      <div className="font-display text-xl font-extrabold">{selected.code}</div>
                      <div className="mt-1 text-sm text-white/80">{formatINR(selected.price)}</div>
                    </div>
                    <button type="button" onClick={() => setBookStep(2)} className="btn-primary w-full">
                      Continue <ArrowRight width={15} />
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
            )}

            {!canBook && selected.status === 'available' && (
              <button type="button" onClick={() => navigate('/login')} className="btn-primary mt-6 w-full">
                Login to book
              </button>
            )}
          </div>
        )}
      </div>
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
