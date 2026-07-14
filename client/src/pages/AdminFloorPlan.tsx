import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Exhibition, Hall, Stall } from '../types';
import { Spinner, stallColors } from '../components/ui';
import { ArrowRight, Grid, Ticket, X } from '../components/icons';

export default function AdminFloorPlan() {
  const [params] = useSearchParams();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [halls, setHalls] = useState<Hall[]>([]);
  const [hallId, setHallId] = useState<number | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [selected, setSelected] = useState<Stall | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewHall, setShowNewHall] = useState(false);
  const [hallForm, setHallForm] = useState({ name: '', grid_rows: '6', grid_cols: '8' });
  const [hallNameEdit, setHallNameEdit] = useState('');
  const [stallForm, setStallForm] = useState({ code: '', zone: 'Standard', type: 'Standard', price: '45000', status: 'available', description: '' });
  const [msg, setMsg] = useState('');

  const reloadExhibitions = async () => {
    const r = await api.get('/admin/exhibitions');
    setExhibitions(r.data);
    const fromQuery = params.get('slug');
    const pick = (fromQuery && r.data.find((e: Exhibition) => e.slug === fromQuery)?.slug)
      || selectedSlug
      || r.data[0]?.slug
      || '';
    setSelectedSlug(pick);
  };

  useEffect(() => {
    reloadExhibitions().finally(() => setLoading(false));
  }, []);

  const reloadHalls = async (slug = selectedSlug, preferHallId?: number | null) => {
    if (!slug) return;
    const r = await api.get(`/exhibitions/${slug}`);
    const nextHalls: Hall[] = r.data.halls || [];
    setHalls(nextHalls);
    const nextId = preferHallId && nextHalls.some((h) => h.id === preferHallId)
      ? preferHallId
      : nextHalls[0]?.id ?? null;
    setHallId(nextId);
    setSelected(null);
  };

  useEffect(() => {
    if (!selectedSlug) return;
    reloadHalls(selectedSlug);
  }, [selectedSlug]);

  const loadStalls = () => {
    if (!hallId) { setStalls([]); return; }
    api.get(`/halls/${hallId}/stalls`).then((r) => setStalls(r.data));
  };
  useEffect(loadStalls, [hallId]);

  useEffect(() => {
    const hall = halls.find((h) => h.id === hallId);
    setHallNameEdit(hall?.name || '');
  }, [hallId, halls]);

  useEffect(() => {
    if (!selected) return;
    setStallForm({
      code: selected.code || '',
      zone: selected.zone || 'Standard',
      type: selected.type || 'Standard',
      price: String(selected.price ?? 45000),
      status: selected.status,
      description: selected.description || '',
    });
  }, [selected]);

  const hall = halls.find((h) => h.id === hallId);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const createHall = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    try {
      const r = await api.post(`/admin/exhibitions/${selectedSlug}/halls`, {
        name: hallForm.name || undefined,
        grid_rows: Number(hallForm.grid_rows) || 6,
        grid_cols: Number(hallForm.grid_cols) || 8,
      });
      setShowNewHall(false);
      setHallForm({ name: '', grid_rows: '6', grid_cols: '8' });
      await reloadHalls(selectedSlug, r.data.id);
      flash('Hall created');
    } catch {
      alert('Could not create hall');
    } finally {
      setSaving(false);
    }
  };

  const renameHall = async () => {
    if (!hallId || !hallNameEdit.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/admin/halls/${hallId}`, { name: hallNameEdit.trim() });
      await reloadHalls(selectedSlug, hallId);
      flash('Hall renamed');
    } catch {
      alert('Could not rename hall');
    } finally {
      setSaving(false);
    }
  };

  const deleteHall = async () => {
    if (!hallId || !confirm('Delete this hall and all its stalls?')) return;
    setSaving(true);
    try {
      await api.delete(`/admin/halls/${hallId}`);
      await reloadHalls(selectedSlug);
      flash('Hall deleted');
    } catch {
      alert('Could not delete hall');
    } finally {
      setSaving(false);
    }
  };

  const saveStall = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/stalls/${selected.id}`, {
        ...stallForm,
        price: Number(stallForm.price) || 0,
      });
      setSelected(r.data);
      loadStalls();
      flash('Stall updated');
    } catch {
      alert('Could not update stall');
    } finally {
      setSaving(false);
    }
  };

  const deleteStall = async () => {
    if (!selected || !confirm(`Remove stall ${selected.code}?`)) return;
    setSaving(true);
    try {
      await api.delete(`/admin/stalls/${selected.id}`);
      setSelected(null);
      loadStalls();
      flash('Stall removed');
    } catch {
      alert('Could not delete stall');
    } finally {
      setSaving(false);
    }
  };

  const addStallAt = async (row: number, col: number) => {
    if (!hallId) return;
    setSaving(true);
    try {
      const r = await api.post(`/admin/halls/${hallId}/stalls`, { grid_row: row, grid_col: col });
      loadStalls();
      setSelected(r.data);
      flash('Stall added');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Could not add stall');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading floor plans…" />;

  return (
    <div className="container-px py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Floor plan editor</h1>
          <p className="text-sm text-ink-500">Create halls, add stalls on empty cells, and edit stall details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedSlug && (
            <Link to={`/admin/events/${selectedSlug}/edit`} className="btn-outline text-sm"><Ticket width={15} /> Edit event</Link>
          )}
          <Link to="/admin/events/new" className="btn-outline text-sm">Create event</Link>
          <Link to="/admin" className="btn-outline text-sm">Dashboard</Link>
        </div>
      </div>

      {msg && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{msg}</div>}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-400">Event</span>
          <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)} className="input min-w-[240px] font-semibold">
            {exhibitions.map((e) => <option key={e.id} value={e.slug}>{e.name} ({e.status})</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-400">Hall</span>
          <select value={hallId ?? ''} onChange={(e) => setHallId(Number(e.target.value))} className="input">
            {halls.length === 0 && <option value="">No halls yet</option>}
            {halls.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.grid_rows}×{h.grid_cols})</option>)}
          </select>
        </label>
        <button onClick={() => setShowNewHall(true)} disabled={!selectedSlug} className="btn-primary text-sm">
          <Grid width={15} /> Create hall
        </button>
      </div>

      {showNewHall && (
        <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink-900">New hall</h3>
            <button onClick={() => setShowNewHall(false)} className="rounded-lg p-1 text-ink-400 hover:bg-white"><X width={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <input className="input sm:col-span-2" placeholder="Hall name (optional)" value={hallForm.name} onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} />
            <input className="input" type="number" min={3} max={12} placeholder="Rows" value={hallForm.grid_rows} onChange={(e) => setHallForm({ ...hallForm, grid_rows: e.target.value })} />
            <input className="input" type="number" min={4} max={16} placeholder="Cols" value={hallForm.grid_cols} onChange={(e) => setHallForm({ ...hallForm, grid_cols: e.target.value })} />
          </div>
          <button onClick={createHall} disabled={saving} className="btn-primary mt-3 text-sm">{saving ? 'Creating…' : 'Generate stalls'}</button>
        </div>
      )}

      {halls.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 px-6 py-16 text-center">
          <Grid width={28} className="mx-auto text-ink-300" />
          <p className="mt-3 font-display text-lg font-bold text-ink-800">No floor plan for this event yet</p>
          <p className="mt-1 text-sm text-ink-500">Create a hall to generate the stall grid, then click cells to edit.</p>
          <button onClick={() => setShowNewHall(true)} className="btn-primary mt-5">Create first hall</button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="card overflow-x-auto p-4">
            {hall && (
              <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-ink-100 pb-4">
                <label className="min-w-[180px] flex-1 text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-400">Hall name</span>
                  <input className="input" value={hallNameEdit} onChange={(e) => setHallNameEdit(e.target.value)} />
                </label>
                <button onClick={renameHall} disabled={saving} className="btn-outline text-sm">Rename</button>
                <button onClick={deleteHall} disabled={saving} className="rounded-xl border border-brand-200 px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Delete hall</button>
              </div>
            )}
            <div className="mb-3 flex flex-wrap gap-3 text-xs">
              {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${stallColors[k].legend}`} />
                  <span className="text-slate-600">{stallColors[k].label}</span>
                </div>
              ))}
              <span className="text-ink-400">· Empty cell = click to add stall</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-4" style={{ minWidth: (hall?.grid_cols ?? 8) * 56 }}>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${hall?.grid_cols ?? 8}, minmax(0,1fr))` }}>
                {Array.from({ length: (hall?.grid_rows ?? 6) * (hall?.grid_cols ?? 8) }).map((_, idx) => {
                  const row = Math.floor(idx / (hall?.grid_cols ?? 8));
                  const col = idx % (hall?.grid_cols ?? 8);
                  const stall = stalls.find((s) => s.grid_row === row && s.grid_col === col);
                  if (!stall) {
                    return (
                      <button
                        key={idx}
                        onClick={() => addStallAt(row, col)}
                        disabled={saving}
                        title="Add stall here"
                        className="grid h-12 place-items-center rounded-lg border border-dashed border-ink-200 bg-white text-[10px] font-semibold text-ink-300 hover:border-brand-400 hover:text-brand-600"
                      >
                        +
                      </button>
                    );
                  }
                  const c = stallColors[stall.status];
                  return (
                    <button key={idx} onClick={() => setSelected(stall)}
                      className={`grid h-12 place-items-center rounded-lg border text-[10px] font-bold ${c.bg} ${c.border} ${c.text} ${selected?.id === stall.id ? 'ring-2 ring-brand-600' : ''}`}>
                      {stall.code}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card h-fit p-5">
            {!selected ? (
              <p className="py-10 text-center text-sm text-slate-400">Select a stall to edit code, price, zone and status — or click an empty cell to add one.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-ink-900">Edit stall</h3>
                  <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50"><X width={16} /></button>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Code</span>
                  <input className="input" value={stallForm.code} onChange={(e) => setStallForm({ ...stallForm, code: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Zone</span>
                    <select className="input" value={stallForm.zone} onChange={(e) => setStallForm({ ...stallForm, zone: e.target.value })}>
                      <option>Standard</option><option>Premium</option><option>Sponsor</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Type</span>
                    <select className="input" value={stallForm.type} onChange={(e) => setStallForm({ ...stallForm, type: e.target.value })}>
                      <option>Standard</option><option>Corner</option><option>Island</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Price (₹)</span>
                  <input className="input" type="number" min={0} value={stallForm.price} onChange={(e) => setStallForm({ ...stallForm, price: e.target.value })} />
                </label>
                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase text-ink-400">Status</div>
                  <div className="space-y-1.5">
                    {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
                      <button key={k} type="button" onClick={() => setStallForm({ ...stallForm, status: k })}
                        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${stallForm.status === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <span className={`h-3 w-3 rounded ${stallColors[k].legend}`} /> {stallColors[k].label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Description</span>
                  <textarea className="input min-h-[72px]" value={stallForm.description} onChange={(e) => setStallForm({ ...stallForm, description: e.target.value })} />
                </label>
                <div className="text-xs text-ink-400">Current listed · {formatINR(Number(stallForm.price) || 0)}</div>
                <button onClick={saveStall} disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save stall'}</button>
                <button onClick={deleteStall} disabled={saving} className="w-full rounded-xl border border-brand-200 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Delete stall</button>
                <Link to={`/exhibitions/${selectedSlug}#floor-plan`} className="btn-outline mt-1 w-full text-sm">
                  Public floor plan <ArrowRight width={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
