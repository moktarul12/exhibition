import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Exhibition, FloorMarker, FloorMarkerKind, Hall, Stall, StallDisplaySize } from '../types';
import { Spinner, stallColors } from '../components/ui';
import { ArrowRight, Grid, Ticket, X } from '../components/icons';
import { hallMarkers, hallRowLayout, layoutStallTotal, MARKER_META, SIZE_META, stallSpans } from '../floorLayout';

const PRESETS: { label: string; layout: number[] }[] = [
  { label: 'Custom (10 / 5 / 8 / 6)', layout: [10, 5, 8, 6] },
  { label: 'Wide front (12 / 8 / 8 / 8)', layout: [12, 8, 8, 8] },
  { label: 'U-shape (10 / 4 / 4 / 10)', layout: [10, 4, 4, 10] },
  { label: 'Uniform 6×8', layout: [8, 8, 8, 8, 8, 8] },
];

const AMENITY_COPY: Record<string, { title: string; tip: string }> = {
  enter: { title: 'Entrance', tip: 'Wayfinding for visitors — not a bookable stall.' },
  exit: { title: 'Exit', tip: 'Leave path / fire egress marker on the plan.' },
  food: { title: 'Food & beverage', tip: 'Café / catering island — sits in the aisle, zero price.' },
  restroom: { title: 'Washroom', tip: 'Public amenity · keep it out of the booking grid.' },
  lounge: { title: 'Lounge', tip: 'Networking / VIP chill zone for the show floor.' },
  stage: { title: 'Stage', tip: 'Keynote or demo stage — usually double-width.' },
  info: { title: 'Info desk', tip: 'Help point for visitors and exhibitors.' },
  clinic: { title: 'Clinic / first aid', tip: 'Medical help point for the venue — not bookable.' },
  custom: { title: 'Custom zone', tip: 'Any other non-bookable feature on the map.' },
};

const CELL = 48;
const GAP = 6;

type DragPayload =
  | { type: 'stall'; id: number }
  | { type: 'marker'; id: string }
  | { type: 'new-marker'; kind: FloorMarkerKind };

type PlaceTool =
  | { kind: 'stall' }
  | { kind: 'marker'; marker: FloorMarkerKind };

/** First control: place-type dropdown (default Stage). */
const PLACE_OPTIONS: { value: string; label: string; tool: PlaceTool }[] = [
  { value: 'stall', label: 'Stall', tool: { kind: 'stall' } },
  { value: 'enter', label: 'Enter', tool: { kind: 'marker', marker: 'enter' } },
  { value: 'exit', label: 'Exit', tool: { kind: 'marker', marker: 'exit' } },
  { value: 'food', label: 'Food', tool: { kind: 'marker', marker: 'food' } },
  { value: 'stage', label: 'Stage', tool: { kind: 'marker', marker: 'stage' } },
  { value: 'restroom', label: 'Washroom', tool: { kind: 'marker', marker: 'restroom' } },
  { value: 'lounge', label: 'Lounge', tool: { kind: 'marker', marker: 'lounge' } },
  { value: 'info', label: 'Info', tool: { kind: 'marker', marker: 'info' } },
  { value: 'clinic', label: 'Clinic', tool: { kind: 'marker', marker: 'clinic' } },
];

function placeToolValue(tool: PlaceTool) {
  return tool.kind === 'stall' ? 'stall' : tool.marker;
}

function placeToolFromValue(value: string): PlaceTool {
  const hit = PLACE_OPTIONS.find((o) => o.value === value);
  return hit?.tool || { kind: 'stall' };
}

export default function AdminFloorPlan() {
  const [params] = useSearchParams();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [halls, setHalls] = useState<Hall[]>([]);
  const [hallId, setHallId] = useState<number | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [selected, setSelected] = useState<Stall | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewHall, setShowNewHall] = useState(false);
  const [hallForm, setHallForm] = useState({ name: '', rowCounts: ['10', '5', '8', '6'] as string[] });
  const [layoutEdit, setLayoutEdit] = useState<string[]>([]);
  const [hallNameEdit, setHallNameEdit] = useState('');
  const [entranceLabel, setEntranceLabel] = useState('Main entrance');
  const [exitLabel, setExitLabel] = useState('Exit / registration');
  const [paintSize, setPaintSize] = useState<StallDisplaySize>('medium');
  const [placeTool, setPlaceTool] = useState<PlaceTool>({ kind: 'stall' });
  const [stallForm, setStallForm] = useState({
    code: '', zone: 'Standard', type: 'Standard', price: '45000', status: 'available',
    description: '', display_size: 'medium' as StallDisplaySize,
  });
  const [msg, setMsg] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachMode, setAttachMode] = useState<'attached' | 'interactive' | 'both'>('both');
  const [aiBusy, setAiBusy] = useState(false);

  const reloadExhibitions = async () => {
    const r = await api.get('/admin/exhibitions');
    setExhibitions(r.data);
    const fromQuery = params.get('slug');
    const pick = (fromQuery && r.data.find((e: Exhibition) => e.slug === fromQuery)?.slug)
      || selectedSlug
      || r.data[0]?.slug
      || '';
    setSelectedSlug(pick);
    const cur = r.data.find((e: Exhibition) => e.slug === pick);
    if (cur) {
      setAttachUrl(cur.floor_plan_url || '');
      setAttachMode((cur.floor_plan_mode as 'attached' | 'interactive' | 'both') || 'both');
    }
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
      : (hallId && nextHalls.some((h) => h.id === hallId) ? hallId : nextHalls[0]?.id ?? null);
    setHallId(nextId);
    setSelected(null);
    setSelectedMarkerId(null);
  };

  useEffect(() => {
    if (!selectedSlug) return;
    reloadHalls(selectedSlug);
    const cur = exhibitions.find((e) => e.slug === selectedSlug);
    if (cur) {
      setAttachUrl(cur.floor_plan_url || '');
      setAttachMode((cur.floor_plan_mode as 'attached' | 'interactive' | 'both') || 'both');
    }
  }, [selectedSlug]);

  const loadStalls = () => {
    if (!hallId) { setStalls([]); return; }
    api.get(`/halls/${hallId}/stalls`).then((r) => setStalls(r.data));
  };
  useEffect(loadStalls, [hallId]);

  useEffect(() => {
    const hall = halls.find((h) => h.id === hallId);
    setHallNameEdit(hall?.name || '');
    setLayoutEdit(hallRowLayout(hall).map(String));
    const m = hallMarkers(hall);
    setEntranceLabel(m.entrance_label);
    setExitLabel(m.exit_label);
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
      display_size: (selected.display_size as StallDisplaySize) || 'medium',
    });
  }, [selected]);

  const hall = halls.find((h) => h.id === hallId);
  const layout = hallRowLayout(hall);
  const markers = hallMarkers(hall);
  const maxCols = Math.max(...layout, 1);
  const rowsN = layout.length;

  const occupied = useMemo(() => {
    const set = new Set<string>();
    for (const s of stalls) {
      const { span_cols, span_rows } = stallSpans(s);
      for (let r = s.grid_row; r < s.grid_row + span_rows; r++) {
        for (let c = s.grid_col; c < s.grid_col + span_cols; c++) set.add(`${r}:${c}`);
      }
    }
    for (const m of markers.items) {
      const sc = m.span_cols || 1;
      const sr = m.span_rows || 1;
      for (let r = m.grid_row; r < m.grid_row + sr; r++) {
        for (let c = m.grid_col; c < m.grid_col + sc; c++) set.add(`${r}:${c}`);
      }
    }
    return set;
  }, [stalls, markers.items]);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const parsedNewLayout = () =>
    hallForm.rowCounts.map((v) => Number(v) || 0).filter((n) => n > 0);

  const persistMarkers = async (next: typeof markers) => {
    if (!hallId) return;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/halls/${hallId}`, {
        name: hallNameEdit.trim() || hall?.name,
        markers: next,
      });
      setHalls((hs) => hs.map((h) => (h.id === hallId ? r.data : h)));
      flash('Markers saved');
    } catch {
      alert('Could not save markers');
    } finally {
      setSaving(false);
    }
  };

  const saveAttachedPlan = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/exhibitions/${selectedSlug}`, {
        floor_plan_url: attachUrl || null,
        floor_plan_mode: attachMode,
      });
      setExhibitions((list) => list.map((e) => (e.slug === selectedSlug ? { ...e, ...r.data } : e)));
      flash('Attached floor plan saved');
    } catch {
      alert('Could not save attached plan');
    } finally {
      setSaving(false);
    }
  };

  const generateFromAi = async () => {
    if (!selectedSlug) return;
    if (!attachUrl) {
      alert('Attach or select a floor plan image (PNG/JPG) first');
      return;
    }
    if (attachUrl.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(attachUrl)) {
      alert('AI needs a PNG or JPG image of the map (not PDF)');
      return;
    }
    if (!confirm('AI will read this floor plan and create an interactive hall (existing halls are replaced). Continue?')) return;
    setAiBusy(true);
    setSaving(true);
    try {
      // Persist attached map first so the server can fall back to DB url
      await api.patch(`/admin/exhibitions/${selectedSlug}`, {
        floor_plan_url: attachUrl,
        floor_plan_mode: attachMode === 'attached' ? 'both' : attachMode,
      });
      if (attachMode === 'attached') setAttachMode('both');
      const r = await api.post(`/admin/exhibitions/${selectedSlug}/analyze-floor-plan`, {
        image_url: attachUrl,
        replace_halls: true,
        floor_plan_mode: 'both',
      });
      await reloadHalls(selectedSlug, r.data.hall?.id);
      loadStalls();
      const src = r.data.source === 'openai' ? 'OpenAI vision' : 'fallback layout';
      flash(`AI created ${r.data.stalls_created} stalls + ${r.data.markers_created} markers (${src})`);
      if (r.data.notes) setTimeout(() => alert(r.data.notes), 100);
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'AI floor plan generation failed');
    } finally {
      setAiBusy(false);
      setSaving(false);
    }
  };

  const createHall = async () => {
    if (!selectedSlug) return;
    const row_layout = parsedNewLayout();
    if (!row_layout.length) {
      alert('Add at least one row with stall count > 0');
      return;
    }
    setSaving(true);
    try {
      const r = await api.post(`/admin/exhibitions/${selectedSlug}/halls`, {
        name: hallForm.name || undefined,
        row_layout,
      });
      setShowNewHall(false);
      setHallForm({ name: '', rowCounts: ['10', '5', '8', '6'] });
      await reloadHalls(selectedSlug, r.data.id);
      flash(`Hall created · ${layoutStallTotal(row_layout)} stalls`);
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
      const r = await api.patch(`/admin/halls/${hallId}`, {
        name: hallNameEdit.trim(),
        markers: { ...markers, entrance_label: entranceLabel, exit_label: exitLabel },
      });
      setHalls((hs) => hs.map((h) => (h.id === hallId ? r.data : h)));
      flash('Hall updated');
    } catch {
      alert('Could not update hall');
    } finally {
      setSaving(false);
    }
  };

  const applyLayout = async () => {
    if (!hallId) return;
    const row_layout = layoutEdit.map((v) => Number(v) || 0).filter((n) => n > 0);
    if (!row_layout.length) {
      alert('Need at least one row');
      return;
    }
    if (!confirm('Apply this layout? Stalls outside the new shape will be removed.')) return;
    setSaving(true);
    try {
      await api.patch(`/admin/halls/${hallId}`, {
        name: hallNameEdit.trim() || hall?.name,
        row_layout,
        markers: { ...markers, entrance_label: entranceLabel, exit_label: exitLabel },
      });
      await reloadHalls(selectedSlug, hallId);
      loadStalls();
      flash('Layout updated');
    } catch {
      alert('Could not update layout');
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
        display_size: stallForm.display_size,
      });
      setSelected(r.data);
      loadStalls();
      flash('Stall updated');
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'Could not update stall');
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

  const addStallAt = async (row: number, col: number, size: StallDisplaySize = paintSize) => {
    if (!hallId) return;
    setSaving(true);
    try {
      const r = await api.post(`/admin/halls/${hallId}/stalls`, {
        grid_row: row,
        grid_col: col,
        display_size: size,
      });
      loadStalls();
      setSelected(r.data);
      setSelectedMarkerId(null);
      setPlaceTool({ kind: 'stall' });
      flash(`Stall added (${size})`);
      return r.data as Stall;
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'Could not add stall');
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** Turn an amenity cell back into a bookable stall (e.g. Type → Stall while Enter selected). */
  const convertAmenityToStall = async (markerId: string, size: StallDisplaySize = paintSize) => {
    const m = markers.items.find((x) => x.id === markerId);
    if (!m || !hallId) return null;
    setSaving(true);
    try {
      const items = markers.items.filter((x) => x.id !== markerId);
      const hallRes = await api.patch(`/admin/halls/${hallId}`, {
        name: hallNameEdit.trim() || hall?.name,
        markers: { ...markers, entrance_label: entranceLabel, exit_label: exitLabel, items },
      });
      setHalls((hs) => hs.map((h) => (h.id === hallId ? hallRes.data : h)));
      setSelectedMarkerId(null);
      const r = await api.post(`/admin/halls/${hallId}/stalls`, {
        grid_row: m.grid_row,
        grid_col: m.grid_col,
        display_size: size,
      });
      loadStalls();
      setSelected(r.data);
      setPlaceTool({ kind: 'stall' });
      flash(`Converted to stall (${SIZE_META[size].label})`);
      return r.data as Stall;
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'Could not convert to stall');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const moveStall = async (stallId: number, row: number, col: number) => {
    setSaving(true);
    try {
      await api.patch(`/admin/stalls/${stallId}`, { grid_row: row, grid_col: col });
      loadStalls();
      flash('Stall moved');
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'Could not move stall');
    } finally {
      setSaving(false);
    }
  };

  const stallAt = (row: number, col: number) =>
    stalls.find((s) => {
      const { span_cols, span_rows } = stallSpans(s);
      return row >= s.grid_row && row < s.grid_row + span_rows
        && col >= s.grid_col && col < s.grid_col + span_cols;
    });

  /** Remove available/blocked stalls (and other markers) so an amenity can sit here. */
  const clearFootprintForAmenity = async (row: number, col: number, spanCols: number, excludeMarkerId?: string) => {
    const cells: { row: number; col: number }[] = [];
    for (let c = col; c < col + spanCols; c++) cells.push({ row, col: c });

    const toDelete = new Map<number, Stall>();
    for (const cell of cells) {
      for (const s of stalls) {
        const { span_cols, span_rows } = stallSpans(s);
        const hits = cell.row >= s.grid_row && cell.row < s.grid_row + span_rows
          && cell.col >= s.grid_col && cell.col < s.grid_col + span_cols;
        if (!hits) continue;
        if (s.status !== 'available' && s.status !== 'blocked') {
          throw new Error(`Stall ${s.code} is ${s.status}. Only available stalls can become Food / Enter / Washroom etc.`);
        }
        toDelete.set(s.id, s);
      }
    }
    for (const s of toDelete.values()) {
      await api.delete(`/admin/stalls/${s.id}`);
    }

    return markers.items.filter((m) => {
      if (excludeMarkerId && m.id === excludeMarkerId) return true;
      const sc = m.span_cols || 1;
      const sr = m.span_rows || 1;
      return !cells.some((cell) =>
        cell.row >= m.grid_row && cell.row < m.grid_row + sr
        && cell.col >= m.grid_col && cell.col < m.grid_col + sc);
    });
  };

  const placeOrMoveMarker = async (kindOrId: { kind?: FloorMarkerKind; id?: string }, row: number, col: number) => {
    const existing = kindOrId.id ? markers.items.find((m) => m.id === kindOrId.id) : null;
    const kind = kindOrId.kind || existing?.kind;
    const span_cols = kind === 'stage' || kind === 'lounge' ? 2 : (existing?.span_cols || 1);
    try {
      setSaving(true);
      let items = await clearFootprintForAmenity(row, col, span_cols, kindOrId.id);
      if (kindOrId.id) {
        items = items.map((m) => (m.id === kindOrId.id
          ? { ...m, grid_row: row, grid_col: col, span_cols }
          : m));
      } else if (kindOrId.kind) {
        const meta = MARKER_META[kindOrId.kind];
        const neu: FloorMarker = {
          id: `m-${Date.now()}`,
          kind: kindOrId.kind,
          label: meta?.label || kindOrId.kind,
          grid_row: row,
          grid_col: col,
          span_cols,
          span_rows: 1,
        };
        items = [...items, neu];
        setSelectedMarkerId(neu.id);
        setSelected(null);
        setPlaceTool({ kind: 'marker', marker: kindOrId.kind });
      }
      await persistMarkers({ ...markers, entrance_label: entranceLabel, exit_label: exitLabel, items });
      loadStalls();
      flash(kindOrId.kind ? `${MARKER_META[kindOrId.kind]?.label || 'Marker'} placed` : 'Marker moved');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Could not place marker');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedMarker = async () => {
    if (!selectedMarkerId) return;
    const items = markers.items.filter((m) => m.id !== selectedMarkerId);
    setSelectedMarkerId(null);
    await persistMarkers({ ...markers, entrance_label: entranceLabel, exit_label: exitLabel, items });
  };

  const updateSelectedMarker = async (patch: Partial<FloorMarker>) => {
    if (!selectedMarkerId) return;
    const items = markers.items.map((m) => (m.id === selectedMarkerId ? { ...m, ...patch } : m));
    await persistMarkers({ ...markers, entrance_label: entranceLabel, exit_label: exitLabel, items });
  };

  const applyStallSize = async (size: StallDisplaySize) => {
    setPaintSize(size);
    setStallForm((f) => ({ ...f, display_size: size }));
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/stalls/${selected.id}`, { display_size: size });
      setSelected(r.data);
      loadStalls();
      flash(`Size → ${SIZE_META[size].label}`);
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'Could not resize — need free space next to the stall');
    } finally {
      setSaving(false);
    }
  };

  const onCellAction = async (row: number, col: number) => {
    if (placeTool.kind === 'stall') {
      const existing = stallAt(row, col);
      if (existing) {
        setSelected(existing);
        setSelectedMarkerId(null);
        return;
      }
      await addStallAt(row, col, paintSize);
      return;
    }
    if (placeTool.kind === 'marker') {
      await placeOrMoveMarker({ kind: placeTool.marker }, row, col);
    }
  };

  const onDragStart = (e: React.DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData('application/x-floor', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropCell = async (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const raw = e.dataTransfer.getData('application/x-floor');
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    if (payload.type === 'stall') {
      await moveStall(payload.id, row, col);
      return;
    }
    if (payload.type === 'marker') {
      await placeOrMoveMarker({ id: payload.id }, row, col);
      return;
    }
    if (payload.type === 'new-marker') {
      // Drop Food/Enter/etc. on available stall → converts that stall into the amenity
      await placeOrMoveMarker({ kind: payload.kind }, row, col);
    }
  };

  if (loading) return <Spinner label="Loading floor plans…" />;

  const cellStyle = (row: number, col: number, spanCols = 1, spanRows = 1): React.CSSProperties => ({
    gridColumn: `${col + 1} / span ${spanCols}`,
    gridRow: `${row + 1} / span ${spanRows}`,
  });

  return (
    <div className="container-px py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Floor plan editor</h1>
          <p className="text-sm text-ink-500">Sizes, enter/exit markers, and drag-and-drop placement.</p>
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

      <div className="mb-5 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-bold text-ink-900">Attached official map</h2>
        <p className="mt-1 text-sm text-ink-500">
          Attach a designed hall plan (PNG/JPG), then use AI to digitise it into bookable stalls, enter/exit, food, stage and washrooms.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Display mode</span>
            <select className="input" value={attachMode} onChange={(e) => setAttachMode(e.target.value as typeof attachMode)}>
              <option value="both">Both — official map + book stalls</option>
              <option value="attached">Attached map only</option>
              <option value="interactive">Interactive stalls only</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Map URL</span>
            <input className="input" value={attachUrl} onChange={(e) => setAttachUrl(e.target.value)} placeholder="/sample-floor-plan.png" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="btn-outline cursor-pointer text-sm">
            Upload image/PDF
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 8_000_000) { alert('Please use a file under 8MB'); return; }
                const reader = new FileReader();
                reader.onload = () => setAttachUrl(String(reader.result || ''));
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <button type="button" onClick={() => setAttachUrl('/sample-floor-plan.png')} className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold">Sample map 1</button>
          <button type="button" onClick={() => setAttachUrl('/sample-floor-plan-2.png')} className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold">Sample map 2</button>
          <button onClick={saveAttachedPlan} disabled={saving || !selectedSlug} className="btn-outline text-sm">Save attached map</button>
          <button
            onClick={generateFromAi}
            disabled={aiBusy || saving || !selectedSlug || !attachUrl}
            className="btn-primary text-sm"
            title="Uses OpenAI vision on the attached image"
          >
            {aiBusy ? 'AI reading map…' : 'AI → create floor plan'}
          </button>
        </div>
        {attachUrl && !attachUrl.startsWith('data:application/pdf') && (
          <img src={attachUrl} alt="" className="mt-3 max-h-48 rounded-xl border border-ink-100 object-contain" />
        )}
        <p className="mt-2 text-[11px] text-ink-400">
          Tip: use PNG/JPG. AI maps booths onto a grid — then tweak sizes, markers and drag-drop in the editor below.
        </p>
      </div>

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
            {halls.map((h) => {
              const L = hallRowLayout(h);
              return <option key={h.id} value={h.id}>{h.name} · {L.join('-')} ({layoutStallTotal(L)})</option>;
            })}
          </select>
        </label>
        <button onClick={() => setShowNewHall(true)} disabled={!selectedSlug} className="btn-primary text-sm">
          <Grid width={15} /> Create hall
        </button>
      </div>

      {showNewHall && (
        <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink-900">New hall · custom row layout</h3>
            <button onClick={() => setShowNewHall(false)} className="rounded-lg p-1 text-ink-400 hover:bg-white"><X width={18} /></button>
          </div>
          <input className="input mb-3 max-w-md" placeholder="Hall name (optional)" value={hallForm.name} onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} />
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setHallForm({ ...hallForm, rowCounts: p.layout.map(String) })}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600 hover:border-brand-400">
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {hallForm.rowCounts.map((count, i) => (
              <label key={i} className="w-20 text-sm">
                <span className="mb-1 block text-[10px] font-bold uppercase text-ink-400">Row {i + 1}</span>
                <input className="input text-center" type="number" min={1} max={24} value={count}
                  onChange={(e) => {
                    const next = [...hallForm.rowCounts];
                    next[i] = e.target.value;
                    setHallForm({ ...hallForm, rowCounts: next });
                  }} />
              </label>
            ))}
            <button type="button" onClick={() => setHallForm({ ...hallForm, rowCounts: [...hallForm.rowCounts, '6'] })}
              className="rounded-xl border border-dashed border-ink-300 px-3 py-2.5 text-sm font-semibold">+ Row</button>
            {hallForm.rowCounts.length > 1 && (
              <button type="button" onClick={() => setHallForm({ ...hallForm, rowCounts: hallForm.rowCounts.slice(0, -1) })}
                className="rounded-xl border border-ink-200 px-3 py-2.5 text-sm font-semibold">− Row</button>
            )}
          </div>
          <button onClick={createHall} disabled={saving} className="btn-primary mt-3 text-sm">
            {saving ? 'Creating…' : `Generate ${layoutStallTotal(parsedNewLayout())} stalls`}
          </button>
        </div>
      )}

      {halls.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 px-6 py-16 text-center">
          <Grid width={28} className="mx-auto text-ink-300" />
          <p className="mt-3 font-display text-lg font-bold text-ink-800">No floor plan yet</p>
          <button onClick={() => setShowNewHall(true)} className="btn-primary mt-5">Create first hall</button>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="card overflow-x-auto p-4">
            {hall && (
              <div className="mb-4 space-y-3 border-b border-ink-100 pb-4">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[160px] flex-1 text-sm">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Hall name</span>
                    <input className="input" value={hallNameEdit} onChange={(e) => setHallNameEdit(e.target.value)} />
                  </label>
                  <label className="min-w-[140px] flex-1 text-sm">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Enter label</span>
                    <input className="input" value={entranceLabel} onChange={(e) => setEntranceLabel(e.target.value)} />
                  </label>
                  <label className="min-w-[140px] flex-1 text-sm">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Exit label</span>
                    <input className="input" value={exitLabel} onChange={(e) => setExitLabel(e.target.value)} />
                  </label>
                  <button onClick={renameHall} disabled={saving} className="btn-outline text-sm">Save labels</button>
                  <button onClick={deleteHall} disabled={saving} className="rounded-xl border border-brand-200 px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Delete hall</button>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase text-ink-400">Row layout</div>
                  <div className="flex flex-wrap items-end gap-2">
                    {layoutEdit.map((count, i) => (
                      <label key={i} className="w-14 text-sm">
                        <span className="mb-1 block text-[10px] font-bold uppercase text-ink-400">R{i + 1}</span>
                        <input className="input px-1 text-center" type="number" min={1} max={24} value={count}
                          onChange={(e) => { const next = [...layoutEdit]; next[i] = e.target.value; setLayoutEdit(next); }} />
                      </label>
                    ))}
                    <button type="button" onClick={() => setLayoutEdit([...layoutEdit, '6'])} className="rounded-lg border border-dashed border-ink-300 px-2 py-2 text-xs font-semibold">+R</button>
                    {layoutEdit.length > 1 && (
                      <button type="button" onClick={() => setLayoutEdit(layoutEdit.slice(0, -1))} className="rounded-lg border border-ink-200 px-2 py-2 text-xs font-semibold">−R</button>
                    )}
                    <button onClick={applyLayout} disabled={saving} className="btn-outline text-sm">Apply layout</button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-3 flex flex-wrap gap-3 text-xs text-ink-500">
              <span>
                Tool: <b className="text-ink-700">{
                  placeTool.kind === 'stall' ? `Stall (${SIZE_META[paintSize].label})` : MARKER_META[placeTool.marker].label
                }</b>
                {' · '}Use the dropdown on the right · drop amenities onto an available stall to convert it
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4" style={{ minWidth: maxCols * (CELL + GAP) + 40 }}>
              <div className="mb-2 rounded-full bg-brand-600/90 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                {entranceLabel}
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
                {/* Empty / drop targets + out-of-layout inert cells */}
                {Array.from({ length: rowsN * maxCols }).map((_, idx) => {
                  const row = Math.floor(idx / maxCols);
                  const col = idx % maxCols;
                  const inLayout = col < (layout[row] || 0);
                  const key = `${row}:${col}`;
                  const isOcc = occupied.has(key);
                  if (!inLayout) {
                    return <div key={key} style={cellStyle(row, col)} className="rounded-md bg-transparent" />;
                  }
                  // Skip rendering empty button if covered by multi-cell origin elsewhere — still need drop target under
                  const isOriginStall = stalls.some((s) => s.grid_row === row && s.grid_col === col);
                  const isOriginMarker = markers.items.some((m) => m.grid_row === row && m.grid_col === col);
                  if (isOriginStall || isOriginMarker) return <div key={key} style={cellStyle(row, col)} />;
                  if (isOcc) {
                    // Covered by span — invisible placeholder for grid flow
                    return <div key={key} style={cellStyle(row, col)} className="pointer-events-none" />;
                  }
                  return (
                    <button
                      key={key}
                      type="button"
                      style={cellStyle(row, col)}
                      onClick={() => onCellAction(row, col)}
                      disabled={saving}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
                      onDragLeave={() => setDragOver((d) => (d === key ? null : d))}
                      onDrop={(e) => onDropCell(e, row, col)}
                      title="Place tool / drop here"
                      className={`rounded-lg border border-dashed text-[10px] font-semibold ${dragOver === key ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-ink-200 bg-white text-ink-300 hover:border-brand-400'}`}
                    >
                      +
                    </button>
                  );
                })}

                {/* Stalls — absolute over grid using same grid placement */}
                {stalls.map((stall) => {
                  const { span_cols, span_rows, display_size } = stallSpans(stall);
                  const c = stallColors[stall.status];
                  const sizeCls = display_size === 'small' ? 'text-[9px]' : display_size === 'xlarge' ? 'text-xs' : 'text-[10px]';
                  return (
                    <button
                      key={stall.id}
                      type="button"
                      draggable
                      onDragStart={(e) => onDragStart(e, { type: 'stall', id: stall.id })}
                      onClick={() => {
                        setSelected(stall);
                        setSelectedMarkerId(null);
                        setPlaceTool({ kind: 'stall' });
                      }}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(`${stall.grid_row}:${stall.grid_col}`); }}
                      onDrop={(e) => onDropCell(e, stall.grid_row, stall.grid_col)}
                      style={cellStyle(stall.grid_row, stall.grid_col, span_cols, span_rows)}
                      className={`relative z-10 grid cursor-grab place-items-center rounded-lg border font-bold active:cursor-grabbing ${sizeCls} ${c.bg} ${c.border} ${c.text} ${selected?.id === stall.id ? 'ring-2 ring-brand-600' : ''} ${dragOver === `${stall.grid_row}:${stall.grid_col}` ? 'ring-2 ring-emerald-500' : ''}`}
                      title={`${stall.code} · click to edit · drag to move · drop amenity to convert`}
                    >
                      {stall.code}
                      {display_size !== 'medium' && (
                        <span className="absolute bottom-0.5 right-1 text-[8px] opacity-60 uppercase">{display_size[0]}</span>
                      )}
                    </button>
                  );
                })}

                {markers.items.map((m) => {
                  const meta = MARKER_META[m.kind] || MARKER_META.custom;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      draggable
                      onDragStart={(e) => onDragStart(e, { type: 'marker', id: m.id })}
                      onClick={() => {
                        setSelectedMarkerId(m.id);
                        setSelected(null);
                        setPlaceTool({ kind: 'marker', marker: m.kind });
                      }}
                      style={cellStyle(m.grid_row, m.grid_col, m.span_cols || 1, m.span_rows || 1)}
                      className={`z-10 grid cursor-grab place-items-center rounded-lg border text-[10px] font-bold active:cursor-grabbing ${meta.className} ${selectedMarkerId === m.id ? 'ring-2 ring-brand-600' : ''}`}
                      title={`${m.label} · drag to move`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 rounded-full bg-ink-200/80 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-ink-600">
                {exitLabel}
              </div>
            </div>
          </div>

          <div className="card h-fit space-y-5 p-5">
            <div>
              <h3 className="font-display text-base font-bold text-ink-900">Place on plan</h3>
              <p className="mt-0.5 text-xs text-ink-400">Choose what to place, then click the grid.</p>
              <label className="mt-3 block text-sm">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-400">Type</span>
                <select
                  className="input font-semibold"
                  value={placeToolValue(placeTool)}
                  onChange={(e) => {
                    const next = placeToolFromValue(e.target.value);
                    setPlaceTool(next);
                    if (selectedMarkerId && next.kind === 'marker') {
                      const m = markers.items.find((x) => x.id === selectedMarkerId);
                      updateSelectedMarker({
                        kind: next.marker,
                        label: MARKER_META[next.marker].label,
                        span_cols: next.marker === 'stage' || next.marker === 'lounge'
                          ? Math.max(2, m?.span_cols || 1)
                          : m?.span_cols || 1,
                      });
                      setSelected(null);
                      return;
                    }
                    if (selectedMarkerId && next.kind === 'stall') {
                      convertAmenityToStall(selectedMarkerId, paintSize);
                      return;
                    }
                    if (selected && next.kind === 'marker') {
                      placeOrMoveMarker({ kind: next.marker }, selected.grid_row, selected.grid_col);
                      return;
                    }
                    setSelected(null);
                    setSelectedMarkerId(null);
                  }}
                >
                  {PLACE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {placeTool.kind === 'marker' && !selectedMarkerId && (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => onDragStart(e, { type: 'new-marker', kind: placeTool.marker })}
                  className={`mt-3 w-full cursor-grab rounded-xl border px-3 py-2.5 text-sm font-bold active:cursor-grabbing ${MARKER_META[placeTool.marker].className}`}
                >
                  Drag {MARKER_META[placeTool.marker].label} onto the plan
                </button>
              )}
            </div>

            {/* Stall paint size — only when placing/editing stalls */}
            {(placeTool.kind === 'stall' || !!selected) && !selectedMarkerId && (
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase text-ink-400">Stall size</div>
                <p className="mb-2 text-[11px] text-ink-400">
                  {selected ? 'Resize the selected stall now.' : 'Size for the next stall you place.'}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(SIZE_META) as StallDisplaySize[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => applyStallSize(k)}
                      className={`rounded-lg border px-2 py-2 text-left text-xs font-semibold ${(selected ? stallForm.display_size : paintSize) === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
                    >
                      {SIZE_META[k].label}
                      <div className="font-normal text-[10px] text-ink-400">{SIZE_META[k].hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amenity panel — no price / dimensions */}
            {selectedMarkerId && (() => {
              const m = markers.items.find((x) => x.id === selectedMarkerId);
              if (!m) return null;
              const copy = AMENITY_COPY[m.kind] || AMENITY_COPY.custom;
              const meta = MARKER_META[m.kind] || MARKER_META.custom;
              return (
                <div className="space-y-3 border-t border-ink-100 pt-4">
                  <div className={`rounded-2xl border p-4 ${meta.className}`}>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Amenity · not for sale</div>
                    <div className="mt-1 font-display text-xl font-extrabold">{copy.title}</div>
                    <p className="mt-1 text-xs opacity-90">{copy.tip}</p>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Label on map</span>
                    <input
                      className="input"
                      defaultValue={m.label}
                      key={m.id}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== m.label) updateSelectedMarker({ label: v });
                      }}
                    />
                  </label>
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase text-ink-400">Footprint width</div>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateSelectedMarker({ span_cols: n })}
                          className={`flex-1 rounded-lg border py-2 text-xs font-bold ${(m.span_cols || 1) === n ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'}`}
                        >
                          {n} cell{n > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={deleteSelectedMarker} disabled={saving} className="w-full rounded-xl border border-brand-200 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                    Remove amenity
                  </button>
                  <button onClick={() => setSelectedMarkerId(null)} className="btn-outline w-full text-sm">Deselect</button>
                </div>
              );
            })()}

            {/* Stall economics — only when a stall is selected */}
            {selected && !selectedMarkerId && (
              <div className="space-y-3 border-t border-ink-100 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink-900">Stall details</h3>
                    <p className="text-[11px] text-ink-400">Price · size · bookable inventory</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50"><X width={16} /></button>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Code</span>
                  <input className="input" value={stallForm.code} onChange={(e) => setStallForm({ ...stallForm, code: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-ink-400">Width</div>
                    <div className="font-display text-lg font-bold text-ink-900">{selected.width || (stallSpans(selected).span_cols * 3)} m</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-ink-400">Depth</div>
                    <div className="font-display text-lg font-bold text-ink-900">{selected.depth || (stallSpans(selected).span_rows * 3)} m</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold uppercase text-ink-400">Area</div>
                    <div className="font-display text-lg font-bold text-brand-700">
                      {selected.area || (stallSpans(selected).span_cols * stallSpans(selected).span_rows * 9)} m²
                      <span className="ml-2 text-xs font-medium text-ink-400">· {stallForm.display_size}</span>
                    </div>
                  </div>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Price (₹)</span>
                  <input className="input" type="number" min={0} value={stallForm.price} onChange={(e) => setStallForm({ ...stallForm, price: e.target.value })} />
                  <span className="mt-1 block text-xs text-ink-400">{formatINR(Number(stallForm.price) || 0)}</span>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase text-ink-400">Zone</span>
                  <select className="input" value={stallForm.zone} onChange={(e) => setStallForm({ ...stallForm, zone: e.target.value })}>
                    <option>Standard</option><option>Premium</option><option>Sponsor</option>
                  </select>
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
                  <textarea className="input min-h-[64px]" value={stallForm.description} onChange={(e) => setStallForm({ ...stallForm, description: e.target.value })} />
                </label>
                <button onClick={saveStall} disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save stall'}</button>
                <button onClick={deleteStall} disabled={saving} className="w-full rounded-xl border border-brand-200 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Delete stall</button>
                <Link to={`/exhibitions/${selectedSlug}#floor-plan`} className="btn-outline mt-1 w-full text-sm">
                  Public floor plan <ArrowRight width={14} />
                </Link>
              </div>
            )}

            {!selected && !selectedMarkerId && placeTool.kind === 'marker' && (
              <div className={`rounded-2xl border p-4 ${MARKER_META[placeTool.marker].className}`}>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Placing amenity</div>
                <div className="mt-1 font-display text-lg font-extrabold">{AMENITY_COPY[placeTool.marker]?.title || placeTool.marker}</div>
                <p className="mt-1 text-xs opacity-90">{AMENITY_COPY[placeTool.marker]?.tip || 'Click an available stall or empty cell.'}</p>
              </div>
            )}

            {!selected && !selectedMarkerId && placeTool.kind === 'stall' && (
              <p className="border-t border-ink-100 pt-4 text-center text-xs text-ink-400">
                Pick a size above, then click an empty cell (+) to place a stall
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
