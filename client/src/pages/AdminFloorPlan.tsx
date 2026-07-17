import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Exhibition, FloorMarker, FloorMarkerKind, Hall, Stall, StallDisplaySize } from '../types';
import { Spinner, stallColors } from '../components/ui';
import { Grid, Ticket, X, Plus, Trash2, Move, RefreshCw } from '../components/icons';
import { hallMarkers, hallRowLayout, layoutStallTotal, MARKER_META, SIZE_META, stallSpans } from '../floorLayout';
import FloorViewToggle, { type FloorViewMode } from '../components/FloorViewToggle';
import FloorPlan3D from '../components/FloorPlan3D';
import FloorPlan2D from '../components/FloorPlan2D';

const PRESETS: { label: string; layout: number[] }[] = [
  { label: 'Custom (10 / 5 / 8 / 6)', layout: [10, 5, 8, 6] },
  { label: 'Wide front (12 / 8 / 8 / 8)', layout: [12, 8, 8, 8] },
  { label: 'U-shape (10 / 4 / 4 / 10)', layout: [10, 4, 4, 10] },
  { label: 'Uniform 6×8', layout: [8, 8, 8, 8, 8, 8] },
];

const AMENITY_COPY: Record<string, { title: string; tip: string; icon: string }> = {
  enter: { title: 'Entrance', tip: 'Main entrance point', icon: '🚪' },
  exit: { title: 'Exit', tip: 'Exit / registration point', icon: '🚶' },
  food: { title: 'Food', tip: 'Food & beverage area', icon: '🍽️' },
  restroom: { title: 'Washroom', tip: 'Restroom facilities', icon: '🚻' },
  lounge: { title: 'Lounge', tip: 'Networking / VIP area', icon: '🛋️' },
  stage: { title: 'Stage', tip: 'Presentation stage', icon: '🎭' },
  info: { title: 'Info', tip: 'Information desk', icon: 'ℹ️' },
  clinic: { title: 'Clinic', tip: 'First aid / medical', icon: '🏥' },
  fire: { title: 'Fire Exit', tip: 'Emergency fire exit', icon: '🔥' },
  custom: { title: 'Custom', tip: 'Custom zone', icon: '📍' },
};

/** Visual cell-merge sizes — picking one merges boxes on the floor plan */
const MERGE_SIZES = [
  { id: '1x1', label: '1×1', hint: 'Small', span_cols: 1, span_rows: 1, display: 'medium' as StallDisplaySize },
  { id: '2x1', label: '2×1', hint: 'Wide', span_cols: 2, span_rows: 1, display: 'large' as StallDisplaySize },
  { id: '1x2', label: '1×2', hint: 'Deep', span_cols: 1, span_rows: 2, display: 'medium' as StallDisplaySize },
  { id: '2x2', label: '2×2', hint: 'Large', span_cols: 2, span_rows: 2, display: 'xlarge' as StallDisplaySize },
  { id: '3x2', label: '3×2', hint: 'XL Wide', span_cols: 3, span_rows: 2, display: 'xlarge' as StallDisplaySize },
  { id: '3x3', label: '3×3', hint: 'XXL', span_cols: 3, span_rows: 3, display: 'xlarge' as StallDisplaySize },
];

function defaultMarkerSpans(kind: FloorMarkerKind, paint: { span_cols: number; span_rows: number }) {
  if (kind === 'stage') return { span_cols: paint.span_cols || 2, span_rows: paint.span_rows || 2 };
  if (kind === 'lounge') return { span_cols: Math.max(2, paint.span_cols || 2), span_rows: paint.span_rows || 1 };
  return { span_cols: paint.span_cols || 1, span_rows: paint.span_rows || 1 };
}

type DragPayload =
  | { type: 'stall'; id: number }
  | { type: 'marker'; id: string }
  | { type: 'new-marker'; kind: FloorMarkerKind };

type PlaceTool =
  | { kind: 'stall' }
  | { kind: 'marker'; marker: FloorMarkerKind };

/** First control: place-type dropdown (default Stall). */
const PLACE_OPTIONS: { value: string; label: string; tool: PlaceTool; icon: string }[] = [
  { value: 'stall', label: 'Stall', tool: { kind: 'stall' }, icon: '🏪' },
  { value: 'enter', label: 'Entrance', tool: { kind: 'marker', marker: 'enter' }, icon: '🚪' },
  { value: 'exit', label: 'Exit', tool: { kind: 'marker', marker: 'exit' }, icon: '🚶' },
  { value: 'food', label: 'Food', tool: { kind: 'marker', marker: 'food' }, icon: '🍽️' },
  { value: 'stage', label: 'Stage', tool: { kind: 'marker', marker: 'stage' }, icon: '🎭' },
  { value: 'restroom', label: 'Washroom', tool: { kind: 'marker', marker: 'restroom' }, icon: '🚻' },
  { value: 'lounge', label: 'Lounge', tool: { kind: 'marker', marker: 'lounge' }, icon: '🛋️' },
  { value: 'info', label: 'Info', tool: { kind: 'marker', marker: 'info' }, icon: 'ℹ️' },
  { value: 'clinic', label: 'Clinic', tool: { kind: 'marker', marker: 'clinic' }, icon: '🏥' },
  { value: 'fire', label: 'Fire Exit', tool: { kind: 'marker', marker: 'fire' }, icon: '🔥' },
];

function formFromStall(s: Stall) {
  return {
    code: s.code || '',
    zone: s.zone || 'Standard',
    type: s.type || 'Standard',
    price: String(s.price ?? 45000),
    status: s.status,
    description: s.description || '',
    display_size: (s.display_size as StallDisplaySize) || 'medium' as StallDisplaySize,
  };
}

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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
  /** Footprint for next place / selected amenity — default 1×1 */
  const [markerPaint, setMarkerPaint] = useState({ span_cols: 1, span_rows: 1 });
  const [stallForm, setStallForm] = useState({
    code: '', zone: 'Standard', type: 'Standard', price: '45000', status: 'available',
    description: '', display_size: 'medium' as StallDisplaySize,
  });
  const [stallDirty, setStallDirty] = useState(false);
  /** Draft size (not saved until Apply) */
  const [draftMergeId, setDraftMergeId] = useState('1x1');
  /** When edits are unsaved and user clicks another stall — choose Discard / Save on the right panel */
  const [pendingNextStall, setPendingNextStall] = useState<Stall | null>(null);
  const [msg, setMsg] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachMode, setAttachMode] = useState<'attached' | 'interactive' | 'both'>('both');
  const [aiBusy, setAiBusy] = useState(false);
  const [showHallSettings, setShowHallSettings] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ row: number; col: number; spanCols: number; spanRows: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<FloorViewMode>('2d');
  const [justPlacedId, setJustPlacedId] = useState<number | null>(null);
  const lastSelectedId = useRef<number | null>(null);
  const dragGroupRef = useRef<number[] | null>(null);

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
    setSelectedIds(new Set());
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

  const commitSelectStall = (stall: Stall, e?: React.MouseEvent) => {
    setSelectedMarkerId(null);
    setPlaceTool({ kind: 'stall' });
    setPendingNextStall(null);
    const multi = e && (e.metaKey || e.ctrlKey);
    const range = e && e.shiftKey;

    if (range && lastSelectedId.current != null) {
      const ordered = [...stalls].sort((a, b) => a.grid_row - b.grid_row || a.grid_col - b.grid_col);
      const a = ordered.findIndex((s) => s.id === lastSelectedId.current);
      const b = ordered.findIndex((s) => s.id === stall.id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const ids = new Set(ordered.slice(lo, hi + 1).map((s) => s.id));
        setSelectedIds(ids);
        setSelected(stall);
        setStallForm(formFromStall(stall));
        setStallDirty(false);
        return;
      }
    }

    if (multi) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(stall.id)) next.delete(stall.id);
        else next.add(stall.id);
        return next;
      });
      setSelected(stall);
      setStallForm(formFromStall(stall));
      setStallDirty(false);
      lastSelectedId.current = stall.id;
      return;
    }

    setSelectedIds(new Set([stall.id]));
    setSelected(stall);
    setStallForm(formFromStall(stall));
    setStallDirty(false);
    lastSelectedId.current = stall.id;
    const { span_cols, span_rows } = stallSpans(stall);
    setMarkerPaint({ span_cols, span_rows });
    const hit = MERGE_SIZES.find((m) => m.span_cols === span_cols && m.span_rows === span_rows);
    if (hit) {
      setPaintSize(hit.display);
      setDraftMergeId(hit.id);
    } else {
      setDraftMergeId('1x1');
    }
  };

  const selectStall = (stall: Stall, e?: React.MouseEvent) => {
    const multi = e && (e.metaKey || e.ctrlKey);
    const range = e && e.shiftKey;
    // Unsaved edits → ask on the right panel (Discard / Save) before switching
    if (!multi && !range && selected && selected.id !== stall.id && stallDirty) {
      setPendingNextStall(stall);
      return;
    }
    commitSelectStall(stall, e);
  };

  const clearSelection = () => {
    setSelected(null);
    setSelectedIds(new Set());
    setSelectedMarkerId(null);
    setStallDirty(false);
    setPendingNextStall(null);
  };

  const patchStallForm = (patch: Partial<typeof stallForm>) => {
    setStallForm((f) => ({ ...f, ...patch }));
    setStallDirty(true);
  };

  const discardStallEdits = () => {
    if (!selected) return;
    setStallForm(formFromStall(selected));
    setStallDirty(false);
    flash('Changes discarded');
  };

  const discardAndSwitch = () => {
    if (!pendingNextStall) {
      discardStallEdits();
      return;
    }
    const next = pendingNextStall;
    setPendingNextStall(null);
    setStallDirty(false);
    commitSelectStall(next);
    flash('Discarded · switched stall');
  };

  const cancelPendingSwitch = () => {
    setPendingNextStall(null);
  };

  const hall = halls.find((h) => h.id === hallId);
  const layout = hallRowLayout(hall);
  const markers = hallMarkers(hall);
  const maxCols = Math.max(...layout, 1);
  const rowsN = layout.length;

  // Keyboard: Escape clears selection; arrows fine-tune drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDragging) {
        if (selected || selectedMarkerId || selectedIds.size) {
          clearSelection();
          return;
        }
      }

      if (!isDragging || !dragPreview || !hoverCell) return;
      
      let newRow = hoverCell.row;
      let newCol = hoverCell.col;
      
      switch (e.key) {
        case 'ArrowUp':
          newRow = Math.max(0, hoverCell.row - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(rowsN - dragPreview.spanRows, hoverCell.row + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, hoverCell.col - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(maxCols - dragPreview.spanCols, hoverCell.col + 1);
          break;
        case 'Escape':
          onDragEnd();
          return;
        default:
          return;
      }
      
      e.preventDefault();
      setHoverCell({ row: newRow, col: newCol });
      setDragPreview({ ...dragPreview, row: newRow, col: newCol });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging, dragPreview, hoverCell, rowsN, maxCols, selected, selectedMarkerId, selectedIds]);

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
    if (!selected) return false;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/stalls/${selected.id}`, {
        ...stallForm,
        price: Number(stallForm.price) || 0,
        display_size: stallForm.display_size,
      });
      setSelected(r.data);
      setStallForm(formFromStall(r.data));
      setStallDirty(false);
      loadStalls();
      flash('Stall saved');
      return true;
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'Could not update stall');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAndSwitch = async () => {
    const ok = await saveStall();
    if (!ok || !pendingNextStall) return;
    const next = pendingNextStall;
    setPendingNextStall(null);
    commitSelectStall(next);
  };

  const addStallAt = async (row: number, col: number) => {
    if (!hallId) return;
    const size = MERGE_SIZES.find((m) => m.id === draftMergeId) || MERGE_SIZES[0];
    setSaving(true);
    try {
      await absorbStallsInFootprint(row, col, size.span_cols, size.span_rows);
      const r = await api.post(`/admin/halls/${hallId}/stalls`, {
        grid_row: row,
        grid_col: col,
        display_size: size.display,
        span_cols: size.span_cols,
        span_rows: size.span_rows,
      });
      loadStalls();
      setSelected(r.data);
      setSelectedIds(new Set([r.data.id]));
      setSelectedMarkerId(null);
      setJustPlacedId(r.data.id);
      setTimeout(() => setJustPlacedId(null), 900);
      setPlaceTool({ kind: 'stall' });
      setDraftMergeId(size.id);
      setMarkerPaint({ span_cols: size.span_cols, span_rows: size.span_rows });
      setPaintSize(size.display);
      setStallForm(formFromStall(r.data));
      setStallDirty(false);
      flash(`Stall placed · ${size.label}`);
      return r.data as Stall;
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (e instanceof Error ? e.message : null);
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

  /** Cells covered by a footprint origin + spans. */
  const footprintCells = (row: number, col: number, spanCols: number, spanRows: number) => {
    const cells: { row: number; col: number }[] = [];
    for (let r = row; r < row + spanRows; r++) {
      for (let c = col; c < col + spanCols; c++) cells.push({ row: r, col: c });
    }
    return cells;
  };

  /**
   * Delete available/blocked stalls under a footprint so size merge can proceed.
   * Booked/reserved/sponsor stalls and amenities block the merge.
   */
  const absorbStallsInFootprint = async (
    row: number,
    col: number,
    spanCols: number,
    spanRows: number,
    excludeStallId?: number,
  ) => {
    const cells = footprintCells(row, col, spanCols, spanRows);
    const toDelete = new Map<number, Stall>();
    for (const cell of cells) {
      for (const s of stalls) {
        if (excludeStallId != null && s.id === excludeStallId) continue;
        const { span_cols, span_rows } = stallSpans(s);
        const hits = cell.row >= s.grid_row && cell.row < s.grid_row + span_rows
          && cell.col >= s.grid_col && cell.col < s.grid_col + span_cols;
        if (!hits) continue;
        if (s.status !== 'available' && s.status !== 'blocked') {
          throw new Error(`Can't merge into ${s.code} — status is ${s.status}`);
        }
        toDelete.set(s.id, s);
      }
    }
    for (const m of markers.items) {
      const sc = m.span_cols || 1;
      const sr = m.span_rows || 1;
      const hits = cells.some((cell) =>
        cell.row >= m.grid_row && cell.row < m.grid_row + sr
        && cell.col >= m.grid_col && cell.col < m.grid_col + sc);
      if (hits) {
        throw new Error(`Can't merge — ${MARKER_META[m.kind]?.label || 'amenity'} is in the way`);
      }
    }
    for (const s of toDelete.values()) {
      await api.delete(`/admin/stalls/${s.id}`);
    }
    return toDelete.size;
  };

  /** Remove available/blocked stalls (and other markers) so an amenity can sit here. */
  const clearFootprintForAmenity = async (
    row: number,
    col: number,
    spanCols: number,
    spanRows = 1,
    excludeMarkerId?: string,
  ) => {
    const cells = footprintCells(row, col, spanCols, spanRows);

    const toDelete = new Map<number, Stall>();
    for (const cell of cells) {
      for (const s of stalls) {
        const { span_cols, span_rows } = stallSpans(s);
        const hits = cell.row >= s.grid_row && cell.row < s.grid_row + span_rows
          && cell.col >= s.grid_col && cell.col < s.grid_col + span_cols;
        if (!hits) continue;
        if (s.status !== 'available' && s.status !== 'blocked') {
          throw new Error(`Stall ${s.code} is ${s.status}. Only available stalls can become Food / Enter / Stage etc.`);
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
    const kind = (kindOrId.kind || existing?.kind) as FloorMarkerKind | undefined;
    if (!kind) return;
    const spans = existing
      ? { span_cols: existing.span_cols || 1, span_rows: existing.span_rows || 1 }
      : defaultMarkerSpans(kind, markerPaint);
    try {
      setSaving(true);
      let items = await clearFootprintForAmenity(row, col, spans.span_cols, spans.span_rows, kindOrId.id);
      if (kindOrId.id) {
        items = items.map((m) => (m.id === kindOrId.id
          ? { ...m, grid_row: row, grid_col: col, span_cols: spans.span_cols, span_rows: spans.span_rows }
          : m));
      } else {
        const meta = MARKER_META[kind];
        const neu: FloorMarker = {
          id: `m-${Date.now()}`,
          kind,
          label: meta?.label || kind,
          grid_row: row,
          grid_col: col,
          span_cols: spans.span_cols,
          span_rows: spans.span_rows,
        };
        items = [...items, neu];
        setSelectedMarkerId(neu.id);
        setSelected(null);
        setSelectedIds(new Set());
        setPlaceTool({ kind: 'marker', marker: kind });
      }
      await persistMarkers({ ...markers, entrance_label: entranceLabel, exit_label: exitLabel, items });
      loadStalls();
      flash(`${MARKER_META[kind]?.label || 'Amenity'} · ${spans.span_cols}×${spans.span_rows}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Could not place marker');
    } finally {
      setSaving(false);
    }
  };

  const resizeSelectedMarker = async (span_cols: number, span_rows: number) => {
    if (!selectedMarkerId) return;
    const m = markers.items.find((x) => x.id === selectedMarkerId);
    if (!m) return;
    try {
      setSaving(true);
      let items = await clearFootprintForAmenity(m.grid_row, m.grid_col, span_cols, span_rows, selectedMarkerId);
      items = items.map((x) => (x.id === selectedMarkerId ? { ...x, span_cols, span_rows } : x));
      await persistMarkers({ ...markers, entrance_label: entranceLabel, exit_label: exitLabel, items });
      setMarkerPaint({ span_cols, span_rows });
      loadStalls();
      flash(`Footprint → ${span_cols}×${span_rows}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Could not resize amenity');
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

  const moveSelectedGroup = async (primaryId: number, row: number, col: number) => {
    const primary = stalls.find((s) => s.id === primaryId);
    if (!primary) return;
    const ids = dragGroupRef.current?.length
      ? dragGroupRef.current
      : (selectedIds.has(primaryId) ? [...selectedIds] : [primaryId]);
    const dRow = row - primary.grid_row;
    const dCol = col - primary.grid_col;
    if (dRow === 0 && dCol === 0) return;

    if (ids.length === 1) {
      await moveStall(primaryId, row, col);
      dragGroupRef.current = null;
      return;
    }

    setSaving(true);
    try {
      // Move farthest first so we don't clash mid-way
      const group = stalls
        .filter((s) => ids.includes(s.id))
        .sort((a, b) => (dRow + dCol >= 0
          ? (b.grid_row - a.grid_row) || (b.grid_col - a.grid_col)
          : (a.grid_row - b.grid_row) || (a.grid_col - b.grid_col)));
      for (const s of group) {
        await api.patch(`/admin/stalls/${s.id}`, {
          grid_row: s.grid_row + dRow,
          grid_col: s.grid_col + dCol,
        });
      }
      loadStalls();
      flash(`Moved ${group.length} stalls`);
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(err || 'Group move failed — check free space for the whole selection');
      loadStalls();
    } finally {
      setSaving(false);
      dragGroupRef.current = null;
    }
  };

  const deleteSelectedStalls = async () => {
    const ids = selectedIds.size ? [...selectedIds] : (selected ? [selected.id] : []);
    if (!ids.length) return;
    if (!confirm(`Remove ${ids.length} stall${ids.length > 1 ? 's' : ''}?`)) return;
    setSaving(true);
    try {
      for (const id of ids) await api.delete(`/admin/stalls/${id}`);
      clearSelection();
      loadStalls();
      flash(`Removed ${ids.length} stall${ids.length > 1 ? 's' : ''}`);
    } catch {
      alert('Could not delete some stalls');
    } finally {
      setSaving(false);
    }
  };

  /** Commit draft merge size to the plan (not auto — requires Apply) */
  const applyMerge = async (m?: (typeof MERGE_SIZES)[number]) => {
    const target = m || MERGE_SIZES.find((x) => x.id === draftMergeId) || MERGE_SIZES[0];

    if (selectedMarkerId) {
      setDraftMergeId(target.id);
      await resizeSelectedMarker(target.span_cols, target.span_rows);
      flash(`Size applied · ${target.label}`);
      return;
    }

    if (selected && selectedIds.size <= 1) {
      if (footprintBlocked) {
        alert('That size is blocked — move amenities or free reserved/booked stalls first');
        return;
      }
      setSaving(true);
      try {
        // Absorb neighbouring available/blocked stalls before expand (fixes 2×1 → occupied)
        await absorbStallsInFootprint(
          selected.grid_row,
          selected.grid_col,
          target.span_cols,
          target.span_rows,
          selected.id,
        );
        const r = await api.patch(`/admin/stalls/${selected.id}`, {
          display_size: target.display,
          span_cols: target.span_cols,
          span_rows: target.span_rows,
        });
        setSelected(r.data);
        setStallForm(formFromStall(r.data));
        setMarkerPaint({ span_cols: target.span_cols, span_rows: target.span_rows });
        setPaintSize(target.display);
        setDraftMergeId(target.id);
        loadStalls();
        flash(`Size applied · ${target.label}`);
      } catch (e: unknown) {
        const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
          || (e instanceof Error ? e.message : null);
        alert(err || 'Need free neighbouring cells to merge');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (selectedIds.size > 1) {
      setSaving(true);
      try {
        for (const id of selectedIds) {
          const stall = stalls.find((s) => s.id === id);
          if (stall) {
            await absorbStallsInFootprint(
              stall.grid_row,
              stall.grid_col,
              target.span_cols,
              target.span_rows,
              stall.id,
            );
          }
          await api.patch(`/admin/stalls/${id}`, {
            display_size: target.display,
            span_cols: target.span_cols,
            span_rows: target.span_rows,
          });
        }
        setMarkerPaint({ span_cols: target.span_cols, span_rows: target.span_rows });
        setPaintSize(target.display);
        setDraftMergeId(target.id);
        loadStalls();
        flash(`Size applied · ${target.label} × ${selectedIds.size}`);
      } catch (e: unknown) {
        const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
          || (e instanceof Error ? e.message : null);
        alert(err || 'Could not resize selection');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Paint mode: draft size is only for the next place
    setMarkerPaint({ span_cols: target.span_cols, span_rows: target.span_rows });
    setPaintSize(target.display);
    setDraftMergeId(target.id);
    flash(`Next place · ${target.label}`);
  };

  const savedMerge = (() => {
    if (selectedMarkerId) {
      const mk = markers.items.find((x) => x.id === selectedMarkerId);
      const sc = mk?.span_cols || 1;
      const sr = mk?.span_rows || 1;
      return MERGE_SIZES.find((m) => m.span_cols === sc && m.span_rows === sr) || MERGE_SIZES[0];
    }
    if (selected) {
      const { span_cols, span_rows } = stallSpans(selected);
      return MERGE_SIZES.find((m) => m.span_cols === span_cols && m.span_rows === span_rows)
        || MERGE_SIZES.find((m) => m.display === stallForm.display_size)
        || MERGE_SIZES[0];
    }
    return MERGE_SIZES.find((m) => m.span_cols === markerPaint.span_cols && m.span_rows === markerPaint.span_rows) || MERGE_SIZES[0];
  })();

  const draftMerge = MERGE_SIZES.find((m) => m.id === draftMergeId) || MERGE_SIZES[0];
  const sizeDirty = draftMerge.id !== savedMerge.id;

  const currentTypeValue = selectedMarkerId
    ? (markers.items.find((x) => x.id === selectedMarkerId)?.kind || 'custom')
    : selected
      ? 'stall'
      : placeToolValue(placeTool);

  const currentMerge = draftMerge;

  const onTypeDropdownChange = async (value: string) => {
    const next = placeToolFromValue(value);

    // Amenity selected → Stall: convert back to bookable stall
    if (selectedMarkerId && next.kind === 'stall') {
      await convertAmenityToStall(selectedMarkerId, paintSize);
      return;
    }

    // Amenity selected → other amenity kind
    if (selectedMarkerId && next.kind === 'marker') {
      const m = markers.items.find((x) => x.id === selectedMarkerId);
      if (!m) return;
      const spans = next.marker === 'stage'
        ? { span_cols: Math.max(2, m.span_cols || 2), span_rows: Math.max(2, m.span_rows || 1) }
        : { span_cols: m.span_cols || 1, span_rows: m.span_rows || 1 };
      setMarkerPaint(spans);
      setPlaceTool(next);
      try {
        setSaving(true);
        let items = await clearFootprintForAmenity(m.grid_row, m.grid_col, spans.span_cols, spans.span_rows, selectedMarkerId);
        items = items.map((x) => (x.id === selectedMarkerId
          ? { ...x, kind: next.marker, label: MARKER_META[next.marker].label, ...spans }
          : x));
        await persistMarkers({ ...markers, entrance_label: entranceLabel, exit_label: exitLabel, items });
        loadStalls();
        flash(`Type → ${MARKER_META[next.marker].label}`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Could not change type');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Stall selected → amenity: convert this cell
    if (selected && next.kind === 'marker') {
      const row = selected.grid_row;
      const col = selected.grid_col;
      const spans = next.marker === 'stage'
        ? { span_cols: 2, span_rows: 2 }
        : currentMerge
          ? { span_cols: currentMerge.span_cols, span_rows: currentMerge.span_rows }
          : { span_cols: 1, span_rows: 1 };
      setMarkerPaint(spans);
      setPlaceTool(next);
      setStallDirty(false);
      setPendingNextStall(null);
      await placeOrMoveMarker({ kind: next.marker }, row, col);
      return;
    }

    // Nothing selected — arm paint tool
    setPlaceTool(next);
    if (next.kind === 'marker') {
      if (next.marker === 'stage') setMarkerPaint({ span_cols: 2, span_rows: 2 });
      else setMarkerPaint({ span_cols: 1, span_rows: 1 });
    }
    setSelectedMarkerId(null);
  };

  const placeToolSpans = (): { span_cols: number; span_rows: number } => {
    if (placeTool.kind === 'marker') return defaultMarkerSpans(placeTool.marker, markerPaint);
    return { span_cols: draftMerge.span_cols, span_rows: draftMerge.span_rows };
  };

  /** Place-mode hover ghost only (nothing selected). */
  const previewCells = useMemo(() => {
    if (selected || selectedMarkerId || !hoverCell || isDragging) return new Set<string>();
    const { span_cols, span_rows } = placeToolSpans();
    const set = new Set<string>();
    for (let r = hoverCell.row; r < hoverCell.row + span_rows; r++) {
      for (let c = hoverCell.col; c < hoverCell.col + span_cols; c++) set.add(`${r}:${c}`);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverCell, placeTool, markerPaint, draftMergeId, selected, selectedMarkerId, isDragging]);

  /**
   * Selection-anchored footprint: current stall/amenity origin + draft size.
   * Neighbours that would merge get highlighted (ok / absorb / blocked).
   */
  type FootCell = { key: string; row: number; col: number; kind: 'self' | 'absorb' | 'empty' | 'blocked' | 'oob' };
  const selectionFootprint = useMemo((): FootCell[] => {
    let originRow = -1;
    let originCol = -1;
    let excludeStallId: number | undefined;
    let excludeMarkerId: string | undefined;

    if (selected && selectedIds.size <= 1) {
      originRow = selected.grid_row;
      originCol = selected.grid_col;
      excludeStallId = selected.id;
    } else if (selectedMarkerId) {
      const mk = markers.items.find((x) => x.id === selectedMarkerId);
      if (!mk) return [];
      originRow = mk.grid_row;
      originCol = mk.grid_col;
      excludeMarkerId = mk.id;
    } else {
      return [];
    }

    const sc = draftMerge.span_cols;
    const sr = draftMerge.span_rows;
    const cells: FootCell[] = [];

    for (let r = originRow; r < originRow + sr; r++) {
      for (let c = originCol; c < originCol + sc; c++) {
        const key = `${r}:${c}`;
        if (r < 0 || c < 0 || r >= layout.length || c >= (layout[r] || 0)) {
          cells.push({ key, row: r, col: c, kind: 'oob' });
          continue;
        }

        const stallHit = stalls.find((s) => {
          if (excludeStallId != null && s.id === excludeStallId) return false;
          const sp = stallSpans(s);
          return r >= s.grid_row && r < s.grid_row + sp.span_rows
            && c >= s.grid_col && c < s.grid_col + sp.span_cols;
        });
        const markerHit = markers.items.find((m) => {
          if (excludeMarkerId && m.id === excludeMarkerId) return false;
          const msc = m.span_cols || 1;
          const msr = m.span_rows || 1;
          return r >= m.grid_row && r < m.grid_row + msr && c >= m.grid_col && c < m.grid_col + msc;
        });

        // Covered by the selected item's current footprint?
        const onSelf = excludeStallId != null
          ? (() => {
            const sp = stallSpans(selected!);
            return r >= selected!.grid_row && r < selected!.grid_row + sp.span_rows
              && c >= selected!.grid_col && c < selected!.grid_col + sp.span_cols;
          })()
          : (() => {
            const mk = markers.items.find((x) => x.id === excludeMarkerId)!;
            const msc = mk.span_cols || 1;
            const msr = mk.span_rows || 1;
            return r >= mk.grid_row && r < mk.grid_row + msr && c >= mk.grid_col && c < mk.grid_col + msc;
          })();

        if (onSelf && !stallHit && !markerHit) {
          cells.push({ key, row: r, col: c, kind: 'self' });
        } else if (markerHit) {
          cells.push({ key, row: r, col: c, kind: 'blocked' });
        } else if (stallHit) {
          cells.push({
            key, row: r, col: c,
            kind: (stallHit.status === 'available' || stallHit.status === 'blocked') ? 'absorb' : 'blocked',
          });
        } else {
          cells.push({ key, row: r, col: c, kind: 'empty' });
        }
      }
    }
    return cells;
  }, [selected, selectedIds, selectedMarkerId, draftMerge, stalls, markers.items, layout]);

  const footprintBlocked = selectionFootprint.some((c) => c.kind === 'blocked' || c.kind === 'oob');
  const footprintAbsorbIds = useMemo(() => {
    const ids = new Set<number>();
    if (!selected) return ids;
    for (const cell of selectionFootprint) {
      if (cell.kind !== 'absorb') continue;
      const s = stalls.find((st) => {
        const sp = stallSpans(st);
        return cell.row >= st.grid_row && cell.row < st.grid_row + sp.span_rows
          && cell.col >= st.grid_col && cell.col < st.grid_col + sp.span_cols
          && st.id !== selected.id;
      });
      if (s) ids.add(s.id);
    }
    return ids;
  }, [selectionFootprint, stalls, selected]);

  const onCellAction = async (row: number, col: number) => {
    // Clicking an existing stall always selects it
    const existing = stallAt(row, col);
    if (existing) {
      selectStall(existing);
      return;
    }

    // Clicking an amenity selects that amenity
    const hitMarker = markers.items.find((m) => {
      const sc = m.span_cols || 1;
      const sr = m.span_rows || 1;
      return row >= m.grid_row && row < m.grid_row + sr && col >= m.grid_col && col < m.grid_col + sc;
    });
    if (hitMarker) {
      setSelectedMarkerId(hitMarker.id);
      setSelected(null);
      setSelectedIds(new Set());
      setStallDirty(false);
      setPlaceTool({ kind: 'marker', marker: hitMarker.kind });
      setMarkerPaint({ span_cols: hitMarker.span_cols || 1, span_rows: hitMarker.span_rows || 1 });
      const hit = MERGE_SIZES.find((x) => x.span_cols === (hitMarker.span_cols || 1) && x.span_rows === (hitMarker.span_rows || 1));
      setDraftMergeId(hit?.id || '1x1');
      return;
    }

    // Empty cell while something selected → deselect (click again to place)
    if (selected || selectedMarkerId) {
      if (stallDirty) {
        setPendingNextStall(null);
      }
      clearSelection();
      setDraftMergeId(MERGE_SIZES.find((m) => m.span_cols === markerPaint.span_cols && m.span_rows === markerPaint.span_rows)?.id || '1x1');
      return;
    }

    if (placeTool.kind === 'stall') {
      await addStallAt(row, col);
      return;
    }
    if (placeTool.kind === 'marker') {
      await placeOrMoveMarker({ kind: placeTool.marker }, row, col);
    }
  };

  /** Outer + on a row bay: fill first empty slot, or grow the row then place */
  const addToRow = async (row: number) => {
    if (!hallId || saving) return;
    const rowLen = layout[row] || 0;
    for (let col = 0; col < rowLen; col++) {
      if (!occupied.has(`${row}:${col}`)) {
        if (placeTool.kind === 'marker') {
          await placeOrMoveMarker({ kind: placeTool.marker }, row, col);
        } else {
          await addStallAt(row, col);
        }
        return;
      }
    }
    const nextLayout = layout.map((n, i) => (i === row ? n + 1 : n));
    setSaving(true);
    try {
      await api.patch(`/admin/halls/${hallId}`, {
        name: hallNameEdit.trim() || hall?.name,
        row_layout: nextLayout,
        markers: { ...markers, entrance_label: entranceLabel, exit_label: exitLabel },
      });
      await reloadHalls(selectedSlug, hallId);
    } catch {
      alert('Could not extend row');
      setSaving(false);
      return;
    }
    setSaving(false);
    if (placeTool.kind === 'marker') {
      await placeOrMoveMarker({ kind: placeTool.marker }, row, rowLen);
    } else {
      await addStallAt(row, rowLen);
    }
  };

  const onDragStart = (e: React.DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData('application/x-floor', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    
    if (payload.type === 'stall') {
      const stall = stalls.find((s) => s.id === payload.id);
      if (stall) {
        const { span_cols, span_rows } = stallSpans(stall);
        setDragPreview({ row: stall.grid_row, col: stall.grid_col, spanCols: span_cols, spanRows: span_rows });
      }
      dragGroupRef.current = selectedIds.has(payload.id) && selectedIds.size > 1
        ? [...selectedIds]
        : [payload.id];
    } else if (payload.type === 'marker') {
      const marker = markers.items.find((m) => m.id === payload.id);
      if (marker) {
        setDragPreview({ 
          row: marker.grid_row, 
          col: marker.grid_col, 
          spanCols: marker.span_cols || 1, 
          spanRows: marker.span_rows || 1 
        });
      }
      dragGroupRef.current = null;
    } else {
      setDragPreview(null);
      dragGroupRef.current = null;
    }
  };

  const onDropCell = async (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    setHoverCell(null);
    setDragPreview(null);
    setIsDragging(false);
    const raw = e.dataTransfer.getData('application/x-floor');
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    if (payload.type === 'stall') {
      await moveSelectedGroup(payload.id, row, col);
      return;
    }
    if (payload.type === 'marker') {
      await placeOrMoveMarker({ id: payload.id }, row, col);
      return;
    }
    if (payload.type === 'new-marker') {
      await placeOrMoveMarker({ kind: payload.kind }, row, col);
    }
  };

  const onDragOverCell = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(`${row}:${col}`);
    setHoverCell({ row, col });
    
    // Update drag preview position
    if (dragPreview) {
      setDragPreview({ 
        ...dragPreview, 
        row, 
        col 
      });
    }
  };

  const onDragEnd = () => {
    setDragOver(null);
    setHoverCell(null);
    setDragPreview(null);
    setIsDragging(false);
    dragGroupRef.current = null;
  };

  const quickPlaceEnter = async (where: 'front-left' | 'front-center' | 'front-right') => {
    if (!hall || !layout.length) return;
    const row = 0;
    const cols = layout[0] || 1;
    const col = where === 'front-left' ? 0 : where === 'front-right' ? Math.max(0, cols - 1) : Math.floor((cols - 1) / 2);
    setMarkerPaint({ span_cols: 1, span_rows: 1 });
    setPlaceTool({ kind: 'marker', marker: 'enter' });
    await placeOrMoveMarker({ kind: 'enter' }, row, col);
  };

  const quickPlaceStage = async () => {
    if (!hall || layout.length < 2) {
      alert('Need at least 2 rows for a 2×2 stage');
      return;
    }
    const midRow = Math.floor(layout.length / 2) - (layout.length >= 3 ? 1 : 0);
    const midCol = Math.max(0, Math.floor((layout[midRow] || 1) / 2) - 1);
    setMarkerPaint({ span_cols: 2, span_rows: 2 });
    setPlaceTool({ kind: 'marker', marker: 'stage' });
    await placeOrMoveMarker({ kind: 'stage' }, midRow, midCol);
  };

  if (loading) return <Spinner label="Loading floor plans…" />;

  const MergeIcon = ({ cols, rows, active }: { cols: number; rows: number; active?: boolean }) => (
    <span
      className="inline-grid shrink-0 gap-0.5"
      style={{
        gridTemplateColumns: `repeat(${cols}, 8px)`,
        gridTemplateRows: `repeat(${rows}, 8px)`,
      }}
      aria-hidden
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <span key={i} className={`rounded-sm ${active ? 'bg-brand-600' : 'bg-ink-300'}`} />
      ))}
    </span>
  );

  const inspectorMode = selectedIds.size > 1
    ? 'multi'
    : selected
      ? 'stall'
      : selectedMarkerId
        ? 'amenity'
        : 'place';

  const PanelHead = ({ title, hint }: { title: string; hint?: string }) => (
    <div className="mb-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{title}</div>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{hint}</p>}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-ink-50">
      {/* Toolbar */}
      <header className="shrink-0 border-b border-ink-100 bg-white">
        <div className="container-px flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="eyebrow mb-0.5">Admin</p>
            <h1 className="font-display text-lg font-extrabold text-ink-900">Floor plan editor</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="input w-auto min-w-[11rem] py-2 text-sm font-semibold"
            >
              {exhibitions.map((e) => <option key={e.id} value={e.slug}>{e.name}</option>)}
            </select>
            <select
              value={hallId ?? ''}
              onChange={(e) => setHallId(Number(e.target.value))}
              className="input w-auto min-w-[9rem] py-2 text-sm"
            >
              {halls.length === 0 && <option value="">No halls</option>}
              {halls.map((h) => {
                const L = hallRowLayout(h);
                return <option key={h.id} value={h.id}>{h.name} · {L.join('-')}</option>;
              })}
            </select>
            <button onClick={() => setShowNewHall(true)} disabled={!selectedSlug} className="btn-primary py-2 text-sm">
              <Plus width={15} /> Hall
            </button>
            {selectedSlug && (
              <Link to={`/admin/events/${selectedSlug}/edit`} className="btn-outline py-2 text-sm">
                <Ticket width={14} /> Event
              </Link>
            )}
            <Link to="/admin" className="btn-ghost py-2 text-sm">Dashboard</Link>
          </div>
        </div>
      </header>

      {msg && (
        <div className="container-px pt-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            {msg}
          </div>
        </div>
      )}

      <main className="container-px flex min-h-0 flex-1 flex-col gap-3 py-4">
        {/* Secondary tools — collapsed by default */}
        <details className="shrink-0 rounded-2xl border border-ink-100 bg-white">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Attached map & AI import
          </summary>
          <div className="space-y-3 border-t border-ink-100 px-4 pb-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input py-2 text-sm" value={attachMode} onChange={(e) => setAttachMode(e.target.value as typeof attachMode)}>
                <option value="both">Map + interactive grid</option>
                <option value="attached">Attached image only</option>
                <option value="interactive">Interactive grid only</option>
              </select>
              <input className="input py-2 text-sm" value={attachUrl} onChange={(e) => setAttachUrl(e.target.value)} placeholder="Image URL or upload below" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-outline cursor-pointer py-2 text-sm">
                Upload
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || file.size > 8_000_000) return;
                  const reader = new FileReader();
                  reader.onload = () => setAttachUrl(String(reader.result || ''));
                  reader.readAsDataURL(file);
                }} />
              </label>
              <button onClick={saveAttachedPlan} disabled={saving || !selectedSlug} className="btn-outline py-2 text-sm">Save map</button>
              <button onClick={generateFromAi} disabled={aiBusy || saving || !selectedSlug || !attachUrl} className="btn-primary py-2 text-sm">
                {aiBusy ? <RefreshCw width={14} className="animate-spin" /> : 'AI generate layout'}
              </button>
            </div>
          </div>
        </details>

        {showNewHall && (
          <div className="shrink-0 rounded-2xl border border-brand-200 bg-brand-soft/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-ink-900">New hall</h3>
              <button type="button" onClick={() => setShowNewHall(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-white"><X width={18} /></button>
            </div>
            <input className="input mb-3 max-w-sm py-2 text-sm" placeholder="Hall name" value={hallForm.name} onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} />
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => setHallForm({ ...hallForm, rowCounts: p.layout.map(String) })}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold hover:border-brand-300">{p.label}</button>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {hallForm.rowCounts.map((count, i) => (
                <input key={i} className="input w-14 py-1.5 text-center text-sm" type="number" min={1} max={24} value={count}
                  onChange={(e) => { const next = [...hallForm.rowCounts]; next[i] = e.target.value; setHallForm({ ...hallForm, rowCounts: next }); }} />
              ))}
              <button type="button" onClick={() => setHallForm({ ...hallForm, rowCounts: [...hallForm.rowCounts, '6'] })} className="rounded-lg border border-dashed border-ink-300 px-2 py-1 text-xs font-semibold">+ row</button>
            </div>
            <button onClick={createHall} disabled={saving} className="btn-primary text-sm">
              Create {layoutStallTotal(hallForm.rowCounts.map((v) => Number(v) || 0).filter((n) => n > 0))} stalls
            </button>
          </div>
        )}

        {halls.length === 0 ? (
          <div className="card flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 text-ink-400"><Grid width={28} /></div>
            <h3 className="font-display text-xl font-bold text-ink-900">No hall yet</h3>
            <p className="mt-1 max-w-sm text-sm text-ink-500">Create a hall to start placing stalls and amenities on the grid.</p>
            <button onClick={() => setShowNewHall(true)} className="btn-primary mt-5 text-sm"><Plus width={16} /> Create hall</button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-4 max-xl:flex-col">
            {/* Canvas */}
            <div className="card flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden p-0 xl:min-h-0">
              {hall && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-2.5">
                  <input className="input w-36 py-1.5 text-sm font-semibold" value={hallNameEdit} onChange={(e) => setHallNameEdit(e.target.value)} placeholder="Hall name" />
                  <button type="button" onClick={() => setShowHallSettings((v) => !v)} className="btn-outline py-1.5 text-xs">
                    {showHallSettings ? 'Hide layout' : 'Layout & labels'}
                  </button>
                  <button onClick={renameHall} disabled={saving} className="btn-outline py-1.5 text-xs">Save hall</button>
                  <button onClick={deleteHall} disabled={saving} className="ml-auto rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 width={13} className="inline" /> Delete hall
                  </button>
                </div>
              )}

              {showHallSettings && hall && (
                <div className="shrink-0 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-ink-500">Entrance label</span>
                      <input className="input py-1.5 text-sm" value={entranceLabel} onChange={(e) => setEntranceLabel(e.target.value)} />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-ink-500">Exit label</span>
                      <input className="input py-1.5 text-sm" value={exitLabel} onChange={(e) => setExitLabel(e.target.value)} />
                    </label>
                    <div className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-semibold text-ink-500">Stalls per row</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {layoutEdit.map((count, i) => (
                          <input key={i} className="input w-11 py-1.5 text-center text-xs" type="number" min={1} max={24} value={count}
                            onChange={(e) => { const next = [...layoutEdit]; next[i] = e.target.value; setLayoutEdit(next); }} />
                        ))}
                        <button onClick={applyLayout} disabled={saving} className="btn-outline py-1.5 text-xs">Apply layout</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-gradient-to-r from-white to-grape-50/40 px-4 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`pill text-white ${
                    placeTool.kind === 'stall' ? 'bg-brand' : 'bg-grape-600'
                  }`}>
                    {PLACE_OPTIONS.find((o) => o.value === currentTypeValue)?.icon}{' '}
                    {PLACE_OPTIONS.find((o) => o.value === currentTypeValue)?.label || 'Stall'}
                  </span>
                  <span className="pill border border-ink-200 bg-white text-ink-600">{currentMerge.label}</span>
                  {selected && <span className="pill border border-brand-200 bg-brand-soft text-brand-700 animate-pop">{selected.code}</span>}
                  <FloorViewToggle value={viewMode} onChange={setViewMode} />
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium text-ink-400">
                  <span>{stalls.length} stalls · {markers.items.length} amenities</span>
                  {stalls.length > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                      {stalls.filter((s) => s.status === 'available').length} free
                    </span>
                  )}
                </div>
              </div>

              {inspectorMode === 'place' && viewMode === '2d' && (
                <div className="shrink-0 border-b border-brand-100 bg-brand-soft/60 px-4 py-2 text-center text-xs font-semibold text-brand-800 animate-fade-in">
                  Place mode · click <span className="rounded bg-white px-1.5 py-0.5 font-bold text-brand-600">+</span> in a row bay, or the outer <b>Add</b> to extend a row
                  {draftMerge.label !== '1×1' && <> · painting <b>{draftMerge.label}</b></>}
                </div>
              )}

              <div className="relative min-h-0 flex-1 overflow-auto floor-canvas p-4">
                {viewMode === '3d' ? (
                  <div className="mx-auto max-w-4xl animate-fade-in">
                    <FloorPlan3D
                      layout={layout}
                      stalls={stalls}
                      markers={markers.items}
                      entranceLabel={entranceLabel}
                      exitLabel={exitLabel}
                      selectedId={selected?.id}
                      selectedIds={selectedIds}
                      onStallClick={(stall) => selectStall(stall)}
                    />
                    <p className="mt-3 text-center text-xs text-ink-500">
                      3D preview · tap to select · switch to{' '}
                      <button type="button" className="font-bold text-grape-700 underline" onClick={() => setViewMode('2d')}>2D</button>
                      {' '}to place, merge or drag
                    </p>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <FloorPlan2D
                      layout={layout}
                      stalls={stalls}
                      markers={markers.items}
                      entranceLabel={entranceLabel}
                      exitLabel={exitLabel}
                      editMode
                      saving={saving}
                      selectedId={selected?.id}
                      selectedIds={selectedIds}
                      selectedMarkerId={selectedMarkerId}
                      hoverCell={hoverCell}
                      onHoverCell={setHoverCell}
                      previewCells={previewCells}
                      footprintCells={selectionFootprint}
                      justPlacedId={justPlacedId}
                      pendingStallId={pendingNextStall?.id ?? null}
                      absorbStallIds={footprintAbsorbIds}
                      dragging={isDragging}
                      dragStallIds={selectedIds}
                      dragOverKey={dragOver}
                      onEmptyClick={onCellAction}
                      onAddToRow={addToRow}
                      onStallClick={(stall, e) => selectStall(stall, e)}
                      onMarkerClick={(m) => {
                        setSelectedMarkerId(m.id);
                        setSelected(null);
                        setSelectedIds(new Set());
                        setPlaceTool({ kind: 'marker', marker: m.kind });
                        setMarkerPaint({ span_cols: m.span_cols || 1, span_rows: m.span_rows || 1 });
                        const hit = MERGE_SIZES.find((x) => x.span_cols === (m.span_cols || 1) && x.span_rows === (m.span_rows || 1));
                        setDraftMergeId(hit?.id || '1x1');
                        setStallDirty(false);
                        setPendingNextStall(null);
                      }}
                      onStallDragStart={(e, stall) => onDragStart(e, { type: 'stall', id: stall.id })}
                      onStallDragEnd={onDragEnd}
                      onMarkerDragStart={(e, m) => onDragStart(e, { type: 'marker', id: m.id })}
                      onMarkerDragEnd={onDragEnd}
                      onEmptyDragOver={(e, row, col) => onDragOverCell(e, row, col)}
                      onEmptyDrop={(e, row, col) => onDropCell(e, row, col)}
                      onEmptyDragLeave={(row, col) =>
                        setDragOver((d) => (d === `${row}:${col}` ? null : d))
                      }
                    />
                    {sizeDirty && (selected || selectedMarkerId) && (
                      <p className="mt-2 text-center text-[11px] font-semibold text-amber-700">
                        Size preview active — Apply in the inspector to save
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 px-4 py-2">
                {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink-500">
                    <span className={`h-2.5 w-2.5 rounded-sm ${stallColors[k].legend}`} /> {stallColors[k].label}
                  </span>
                ))}
                {sizeDirty && (selected || selectedMarkerId) && (
                  <span className="ml-auto text-[10px] font-semibold text-amber-700">Preview active — Apply to save size</span>
                )}
              </div>
            </div>

            {/* Inspector */}
            <aside className="card flex w-full shrink-0 flex-col overflow-hidden p-0 xl:w-[340px] xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)]">
              <div className="border-b border-ink-100 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                  {inspectorMode === 'place' ? 'Place mode' : inspectorMode === 'multi' ? 'Multi-select' : 'Edit selection'}
                </div>
                <div className="font-display text-base font-extrabold text-ink-900">
                  {inspectorMode === 'place' && 'Click + in a row · or outer Add'}
                  {inspectorMode === 'stall' && selected?.code}
                  {inspectorMode === 'amenity' && (markers.items.find((x) => x.id === selectedMarkerId)?.label || 'Amenity')}
                  {inspectorMode === 'multi' && `${selectedIds.size} stalls`}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {isDragging && (
                  <div className="rounded-xl border border-brand-200 bg-brand-soft/50 p-3 text-xs text-ink-700">
                    <div className="mb-1 flex items-center gap-2 font-bold text-ink-900"><Move width={14} /> Dragging</div>
                    Drop on a cell · arrow keys to nudge · Esc to cancel
                  </div>
                )}

                {pendingNextStall && selected && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <div className="text-sm font-bold text-amber-900">Unsaved on {selected.code}</div>
                    <p className="mt-1 text-xs text-amber-800">Switch to {pendingNextStall.code}?</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <button type="button" onClick={saveAndSwitch} disabled={saving} className="btn-primary w-full text-sm">Save & switch</button>
                      <button type="button" onClick={discardAndSwitch} className="btn-outline w-full text-sm">Discard</button>
                      <button type="button" onClick={cancelPendingSwitch} className="btn-ghost w-full text-sm">Cancel</button>
                    </div>
                  </div>
                )}

                {inspectorMode === 'place' && (
                  <>
                    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-3 animate-fade-in">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-600">Quick start</div>
                      <ol className="space-y-1 text-[11px] leading-snug text-ink-600">
                        <li><b>1.</b> Choose Stall or amenity</li>
                        <li><b>2.</b> Pick cell size (1×1 → 3×3)</li>
                        <li><b>3.</b> Click a <b>+</b> on the hall</li>
                      </ol>
                    </div>
                    <div>
                      <PanelHead title="What to place" hint="Then click an empty cell (+)" />
                      <div className="grid grid-cols-3 gap-1.5">
                        {PLACE_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => { void onTypeDropdownChange(o.value); }}
                            disabled={saving}
                            className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 text-[10px] font-semibold transition-all duration-150 ${
                              currentTypeValue === o.value
                                ? 'scale-[1.03] border-brand-500 bg-brand-soft text-brand-700 shadow-md shadow-brand/15'
                                : 'border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:scale-[1.02]'
                            }`}
                          >
                            <span className="text-lg leading-none">{o.icon}</span>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => quickPlaceEnter('front-center')} disabled={saving} className="btn-outline flex-1 py-2 text-xs">🚪 Entrance</button>
                      <button type="button" onClick={() => { setMarkerPaint({ span_cols: 2, span_rows: 2 }); setPlaceTool({ kind: 'marker', marker: 'stage' }); void quickPlaceStage(); }} disabled={saving} className="btn-outline flex-1 py-2 text-xs">🎭 Stage 2×2</button>
                    </div>
                  </>
                )}

                {(inspectorMode === 'stall' || inspectorMode === 'amenity') && (
                  <div className="flex items-center justify-between gap-2">
                    <select
                      className="input py-2 text-sm font-semibold"
                      value={currentTypeValue}
                      disabled={saving}
                      onChange={(e) => { void onTypeDropdownChange(e.target.value); }}
                    >
                      {PLACE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={clearSelection} className="shrink-0 rounded-lg border border-ink-200 p-2 text-ink-400 hover:bg-ink-50"><X width={16} /></button>
                  </div>
                )}

                <div>
                  <PanelHead
                    title="Cell size"
                    hint={inspectorMode === 'place' ? 'Size for the next placement' : 'Tap a size — preview on grid — then Apply'}
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    {MERGE_SIZES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setDraftMergeId(m.id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all duration-150 ${
                          draftMergeId === m.id
                            ? 'scale-[1.04] border-brand-500 bg-brand-soft shadow-md shadow-brand/15'
                            : 'border-ink-100 bg-white hover:border-ink-200 hover:scale-[1.02]'
                        }`}
                      >
                        <MergeIcon cols={m.span_cols} rows={m.span_rows} active={draftMergeId === m.id} />
                        <span className="text-xs font-bold text-ink-900">{m.label}</span>
                        <span className="text-[9px] text-ink-400">{m.hint}</span>
                      </button>
                    ))}
                  </div>
                  {(inspectorMode === 'stall' || inspectorMode === 'amenity') && sizeDirty && (
                    <p className={`mt-2 rounded-lg px-2.5 py-2 text-[11px] leading-snug ${footprintBlocked ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
                      {footprintBlocked
                        ? 'Blocked cells in red — choose a smaller size or free the space.'
                        : footprintAbsorbIds.size > 0
                          ? `${footprintAbsorbIds.size} neighbour(s) will merge in on Apply.`
                          : `Outline shows ${draftMerge.label} — Apply to save.`}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => { void applyMerge(); }}
                      disabled={saving || footprintBlocked || (!sizeDirty && (inspectorMode === 'stall' || inspectorMode === 'amenity'))}
                      className={`btn-primary flex-1 text-sm ${sizeDirty && !footprintBlocked ? '' : 'opacity-50'}`}
                    >
                      {saving ? 'Applying…' : sizeDirty ? `Apply ${draftMerge.label}` : inspectorMode === 'place' ? 'Set size' : 'Apply size'}
                    </button>
                    {sizeDirty && (inspectorMode === 'stall' || inspectorMode === 'amenity') && (
                      <button type="button" onClick={() => setDraftMergeId(savedMerge.id)} className="btn-outline text-sm">Reset</button>
                    )}
                  </div>
                </div>

                {inspectorMode === 'stall' && selected && (
                  <div className="space-y-3 border-t border-ink-100 pt-4">
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-3 text-center">
                      <div><div className="text-[10px] font-bold text-ink-400">W</div><div className="text-sm font-bold">{stallSpans(selected).span_cols * 3}m</div></div>
                      <div><div className="text-[10px] font-bold text-ink-400">D</div><div className="text-sm font-bold">{stallSpans(selected).span_rows * 3}m</div></div>
                      <div><div className="text-[10px] font-bold text-ink-400">Area</div><div className="text-sm font-bold text-brand-700">{stallSpans(selected).span_cols * stallSpans(selected).span_rows * 9}m²</div></div>
                    </div>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-ink-500">Code</span>
                      <input className="input py-2 text-sm" value={stallForm.code} onChange={(e) => patchStallForm({ code: e.target.value })} />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-ink-500">Price (₹)</span>
                      <input className="input py-2 text-sm" type="number" min={0} value={stallForm.price} onChange={(e) => patchStallForm({ price: e.target.value })} />
                      <span className="mt-0.5 block text-[11px] text-ink-400">{formatINR(Number(stallForm.price) || 0)}</span>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-ink-500">Zone</span>
                      <select className="input py-2 text-sm" value={stallForm.zone} onChange={(e) => patchStallForm({ zone: e.target.value })}>
                        <option>Standard</option><option>Premium</option><option>Sponsor</option>
                      </select>
                    </label>
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-ink-500">Status</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
                          <button key={k} type="button" onClick={() => patchStallForm({ status: k })}
                            className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold ${
                              stallForm.status === k ? 'border-brand-500 bg-brand-soft text-brand-700' : 'border-ink-100 bg-white text-ink-600'
                            }`}>
                            <span className={`h-2.5 w-2.5 rounded-sm ${stallColors[k].legend}`} /> {stallColors[k].label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-ink-500">Description</span>
                      <textarea className="input min-h-[72px] py-2 text-sm" value={stallForm.description} onChange={(e) => patchStallForm({ description: e.target.value })} />
                    </label>
                    <button onClick={deleteSelectedStalls} disabled={saving} className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                      <Trash2 width={14} className="inline" /> Delete stall
                    </button>
                  </div>
                )}

                {inspectorMode === 'amenity' && selectedMarkerId && (() => {
                  const m = markers.items.find((x) => x.id === selectedMarkerId);
                  if (!m) return null;
                  const copy = AMENITY_COPY[m.kind] || AMENITY_COPY.custom;
                  return (
                    <div className="space-y-3 border-t border-ink-100 pt-4">
                      <div className="rounded-xl border border-ink-100 bg-ink-50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{copy.icon}</span>
                          <div>
                            <div className="text-[10px] font-bold uppercase text-ink-400">Amenity</div>
                            <div className="font-display font-bold text-ink-900">{copy.title}</div>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">{copy.tip}</p>
                      </div>
                      <label className="block text-xs">
                        <span className="mb-1 block font-semibold text-ink-500">Map label</span>
                        <input className="input py-2 text-sm" defaultValue={m.label} key={m.id} onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== m.label) updateSelectedMarker({ label: v });
                        }} />
                      </label>
                      <button onClick={deleteSelectedMarker} disabled={saving} className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                        Remove amenity
                      </button>
                    </div>
                  );
                })()}

                {inspectorMode === 'multi' && (
                  <div className="space-y-3 border-t border-ink-100 pt-4">
                    <p className="text-xs text-ink-500">Shift+click or ⌘+click to add stalls. Drag as a group.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={clearSelection} className="btn-outline flex-1 text-sm">Clear</button>
                      <button type="button" onClick={deleteSelectedStalls} className="flex-1 rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Delete all</button>
                    </div>
                  </div>
                )}
              </div>

              {inspectorMode === 'stall' && selected && (
                <div className={`shrink-0 border-t px-4 py-3 ${stallDirty ? 'border-amber-200 bg-amber-50' : 'border-ink-100 bg-ink-50/50'}`}>
                  <div className="flex gap-2">
                    <button type="button" onClick={discardStallEdits} disabled={!stallDirty || saving} className="btn-outline flex-1 text-sm disabled:opacity-40">Discard</button>
                    <button type="button" onClick={() => { void saveStall(); }} disabled={!stallDirty || saving} className="btn-primary flex-[1.4] text-sm disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save details'}
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
