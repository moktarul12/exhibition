import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Exhibition, Hall, Stall } from '../types';
import { Spinner, stallColors } from '../components/ui';
import { ArrowRight, Grid, Ticket } from '../components/icons';

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
  const [creatingHall, setCreatingHall] = useState(false);

  const reloadExhibitions = () =>
    api.get('/admin/exhibitions').then((r) => {
      setExhibitions(r.data);
      const fromQuery = params.get('slug');
      const pick = (fromQuery && r.data.find((e: Exhibition) => e.slug === fromQuery)?.slug)
        || selectedSlug
        || r.data[0]?.slug
        || '';
      setSelectedSlug(pick);
    });

  useEffect(() => {
    reloadExhibitions().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    api.get(`/exhibitions/${selectedSlug}`).then((r) => {
      setHalls(r.data.halls || []);
      setHallId(r.data.halls?.[0]?.id ?? null);
      setSelected(null);
    });
  }, [selectedSlug]);

  const loadStalls = () => {
    if (!hallId) return;
    api.get(`/halls/${hallId}/stalls`).then((r) => setStalls(r.data));
  };
  useEffect(loadStalls, [hallId]);

  const hall = halls.find((h) => h.id === hallId);

  const updateStall = async (status: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/stalls/${selected.id}`, { status });
      setSelected(r.data);
      loadStalls();
    } finally {
      setSaving(false);
    }
  };

  const addHall = async () => {
    if (!selectedSlug) return;
    setCreatingHall(true);
    try {
      const r = await api.post(`/admin/exhibitions/${selectedSlug}/halls`, { grid_rows: 6, grid_cols: 8 });
      const detail = await api.get(`/exhibitions/${selectedSlug}`);
      setHalls(detail.data.halls || []);
      setHallId(r.data.id);
      setSelected(null);
    } catch {
      alert('Could not create hall');
    } finally {
      setCreatingHall(false);
    }
  };

  if (loading) return <Spinner label="Loading floor plans…" />;

  return (
    <div className="container-px py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Create floor plan</h1>
          <p className="text-sm text-ink-500">Add halls, then click stalls to set available / reserved / booked status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/events/new" className="btn-outline text-sm"><Ticket width={15} /> Create event</Link>
          <Link to="/admin" className="btn-outline text-sm">Back to Dashboard</Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)} className="input w-auto min-w-[240px] font-semibold">
          {exhibitions.map((e) => <option key={e.id} value={e.slug}>{e.name} ({e.status})</option>)}
        </select>
        <select value={hallId ?? ''} onChange={(e) => setHallId(Number(e.target.value))} className="input w-auto">
          {halls.length === 0 && <option value="">No halls yet</option>}
          {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <button onClick={addHall} disabled={creatingHall || !selectedSlug} className="btn-primary text-sm">
          <Grid width={15} /> {creatingHall ? 'Adding…' : 'Add hall'}
        </button>
      </div>

      {halls.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 px-6 py-16 text-center">
          <Grid width={28} className="mx-auto text-ink-300" />
          <p className="mt-3 font-display text-lg font-bold text-ink-800">No floor plan for this event yet</p>
          <p className="mt-1 text-sm text-ink-500">Create a hall to generate stalls, or create a new event with a floor plan.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={addHall} disabled={creatingHall} className="btn-primary">Add first hall</button>
            <Link to="/admin/events/new" className="btn-outline">Create event</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="card overflow-x-auto p-4">
            <div className="mb-3 flex flex-wrap gap-3 text-xs">
              {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${stallColors[k].legend}`} />
                  <span className="text-slate-600">{stallColors[k].label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-slate-50 p-4" style={{ minWidth: (hall?.grid_cols ?? 8) * 56 }}>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${hall?.grid_cols ?? 8}, minmax(0,1fr))` }}>
                {Array.from({ length: (hall?.grid_rows ?? 6) * (hall?.grid_cols ?? 8) }).map((_, idx) => {
                  const row = Math.floor(idx / (hall?.grid_cols ?? 8));
                  const col = idx % (hall?.grid_cols ?? 8);
                  const stall = stalls.find((s) => s.grid_row === row && s.grid_col === col);
                  if (!stall) return <div key={idx} className="h-12" />;
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
              <p className="py-10 text-center text-sm text-slate-400">Select a stall to edit status & pricing.</p>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stall {selected.code}</h3>
                <div className="mt-1 text-xs text-slate-500">{selected.zone} · {selected.type} · {formatINR(selected.price)}</div>
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold uppercase text-slate-400">Set status</div>
                  {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
                    <button key={k} disabled={saving} onClick={() => updateStall(k)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${selected.status === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <span className={`h-3 w-3 rounded ${stallColors[k].legend}`} /> {stallColors[k].label}
                    </button>
                  ))}
                </div>
                <Link to={`/exhibitions/${selectedSlug}#floor-plan`} className="btn-outline mt-4 w-full">
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
