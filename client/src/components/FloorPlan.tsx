import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Hall, Stall } from '../types';
import { stallColors } from './ui';
import { useAuth } from '../auth';
import { Search, X, Check, Grid, Download } from './icons';

export default function FloorPlan({ halls, exhibitionName }: { halls: Hall[]; exhibitionName: string }) {
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const navigate = useNavigate();
  const [hallId, setHallId] = useState<number | null>(halls[0]?.id ?? null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Stall | null>(null);
  const [search, setSearch] = useState('');
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<{ reference: string } | null>(null);
  const [form, setForm] = useState({ company_name: '', contact_person: '', contact_email: '', contact_phone: '', payment_mode: 'UPI' });

  const hall = halls.find((h) => h.id === hallId);

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

  const openStall = (s: Stall) => { setConfirmed(null); api.get(`/stalls/${s.id}`).then((r) => setSelected(r.data)); };

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

  const cols = hall?.grid_cols ?? 8;
  const rowsN = hall?.grid_rows ?? 6;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <select value={hallId ?? ''} onChange={(e) => { setHallId(Number(e.target.value)); setSelected(null); }} className="input w-auto rounded-full font-semibold">
            {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4">
            <Search width={16} className="text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value.toUpperCase())} placeholder="Find stall e.g. A-05" className="w-40 bg-transparent py-2.5 text-sm outline-none" />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-xs">
          {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${stallColors[k].legend}`} />
              <span className="text-ink-600">{stallColors[k].label}</span>
              {legend[k] ? <span className="text-ink-400">({legend[k]})</span> : null}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid h-64 place-items-center text-ink-400">Loading floor plan…</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-ink-50 p-4">
            <div className="mx-auto" style={{ minWidth: cols * 62 }}>
              <div className="mb-2 rounded-full bg-ink-200/60 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-ink-500">Entry</div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
                {Array.from({ length: rowsN * cols }).map((_, idx) => {
                  const row = Math.floor(idx / cols);
                  const col = idx % cols;
                  const stall = stalls.find((s) => s.grid_row === row && s.grid_col === col);
                  if (!stall) {
                    const isLounge = (row === 2 || row === 3) && (col === 3 || col === 4);
                    return <div key={idx} className={`grid h-14 place-items-center rounded-xl text-[9px] font-semibold ${isLounge ? 'bg-ink-200/70 text-ink-400' : ''}`}>{row === 2 && col === 3 ? 'LOUNGE' : ''}</div>;
                  }
                  const c = stallColors[stall.status];
                  const isMatch = search && stall.code.includes(search);
                  const isSel = selected?.id === stall.id;
                  return (
                    <button key={idx} onClick={() => openStall(stall)} title={`${stall.code} · ${c.label} · ${formatINR(stall.price)}`}
                      className={`grid h-14 place-items-center rounded-xl border text-[11px] font-bold transition-all ${c.bg} ${c.border} ${c.text} ${isSel ? 'ring-2 ring-brand-600 ring-offset-2' : ''} ${isMatch ? 'ring-2 ring-brand-500 animate-pulse' : ''}`}>
                      {stall.code}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 rounded-full bg-ink-200/60 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-ink-500">Registration / Exit</div>
            </div>
          </div>
        )}
      </div>

      <div className="card sticky top-32 h-fit max-h-[calc(100vh-9rem)] overflow-y-auto p-5">
        {!selected ? (
          <div className="grid place-items-center py-16 text-center text-ink-400">
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-300"><Grid width={28} /></div>
            <p className="text-sm">Select a stall on the floor plan to see details{canBook ? ' and book.' : '.'}</p>
          </div>
        ) : confirmed ? (
          <div className="animate-fade-in text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check width={30} /></div>
            <h3 className="font-display text-lg font-extrabold text-ink-900">Booking confirmed!</h3>
            <p className="mt-1 text-sm text-ink-500">Stall <b>{selected.code}</b> at {exhibitionName} is now yours.</p>
            <div className="mt-4 rounded-2xl bg-ink-50 p-4 text-sm">
              <div className="text-xs text-ink-400">Booking reference</div>
              <div className="font-display text-lg font-extrabold text-brand-700">{confirmed.reference}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setSelected(null); setConfirmed(null); }} className="btn-outline flex-1">Book another</button>
              <button onClick={() => navigate('/my-bookings')} className="btn-primary flex-1">My bookings</button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded ${stallColors[selected.status].legend}`} />
                  <h3 className="font-display text-lg font-extrabold text-ink-900">Stall {selected.code}</h3>
                </div>
                <div className="text-xs text-ink-500">{selected.hall_name} · {exhibitionName}</div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X width={18} /></button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Info label="Size" value={`${selected.width}m × ${selected.depth}m`} />
              <Info label="Area" value={`${selected.area} Sq.m`} />
              <Info label="Type" value={selected.type} />
              <Info label="Zone" value={selected.zone} />
              <Info label="Status" value={<span className={stallColors[selected.status].text + ' font-semibold'}>{stallColors[selected.status].label}</span>} />
              <Info label="Price" value={<span className="font-bold text-ink-900">{formatINR(selected.price)}</span>} />
            </dl>

            {selected.description && <p className="mt-4 text-sm leading-relaxed text-ink-600">{selected.description}</p>}

            {selected.facilities && selected.facilities.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Facilities</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.facilities.map((f) => <span key={f} className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-700">{f}</span>)}
                </div>
              </div>
            )}

            {selected.youtube_url && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Stall walkthrough</div>
                <div className="aspect-video overflow-hidden rounded-2xl bg-ink-950">
                  <iframe title={`Stall ${selected.code} video`} src={selected.youtube_url} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </div>
            )}

            {(selected.brochure_url || (selected.documents && selected.documents.length > 0)) && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Documents</div>
                <div className="space-y-2">
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
              </div>
            )}

            {selected.company_name && (
              <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-ink-50 p-3">
                <img src={selected.company_logo} alt="" className="h-9 w-9 rounded-lg" />
                <div className="text-sm"><div className="text-[11px] text-ink-400">Occupied by</div><div className="font-semibold text-ink-700">{selected.company_name}</div></div>
              </div>
            )}

            {selected.nearby && selected.nearby.length > 0 && (
              <div className="mt-3 text-xs text-ink-500">Nearby: {selected.nearby.map((n) => n.code).join(', ')}</div>
            )}

            {selected.status === 'available' && canBook ? (
              <div className="mt-5">
                <div className="mb-3 border-t border-ink-100 pt-4 font-display text-sm font-bold text-ink-900">Book this stall</div>
                <div className="space-y-2.5">
                  <input className="input" placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                  <input className="input" placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
                  <input className="input" placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                  <input className="input" placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                  <select className="input" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
                    <option>UPI</option><option>Credit Card</option><option>Bank Transfer</option>
                  </select>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 p-3.5">
                  <span className="text-sm font-medium text-brand-800">Total payable</span>
                  <span className="font-display text-xl font-extrabold text-brand-700">{formatINR(selected.price)}</span>
                </div>
                <button onClick={submitBooking} disabled={booking} className="btn-primary mt-3 w-full">{booking ? 'Processing…' : 'Confirm booking'}</button>
              </div>
            ) : selected.status === 'available' ? (
              <div className="mt-5 rounded-2xl border border-dashed border-ink-200 p-4 text-center text-sm text-ink-500">
                Guests and visitors can view stall details. <button onClick={() => navigate('/login')} className="font-semibold text-brand-700 underline">Login as exhibitor</button> to book.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-ink-200 p-4 text-center text-sm text-ink-500">
                This stall is <b>{stallColors[selected.status].label.toLowerCase()}</b> and not available for booking.
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
