import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatINR } from '../api';
import type { Exhibition, FloorMarker, FloorMarkerKind, Hall, Stall, StallDisplaySize } from '../types';
import { Spinner, stallColors } from '../components/ui';
import { ArrowRight, Grid, Ticket, X, ChevronDown, Plus, Trash2, Move, Copy, RefreshCw } from '../components/icons';
import { hallMarkers, hallRowLayout, layoutStallTotal, MARKER_META, SIZE_META, stallSpans } from '../floorLayout';

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

const CELL = 52;
const GAP = 6;

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
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  /** When edits are unsaved and user clicks another stall — choose Discard / Save on the right panel */
  const [pendingNextStall, setPendingNextStall] = useState<Stall | null>(null);
  const [msg, setMsg] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachMode, setAttachMode] = useState<'attached' | 'interactive' | 'both'>('both');
  const [aiBusy, setAiBusy] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dragPreview, setDragPreview] = useState<{ row: number; col: number; spanCols: number; spanRows: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
    setSizeMenuOpen(false);
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
        if (sizeMenuOpen) { setSizeMenuOpen(false); return; }
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
  }, [isDragging, dragPreview, hoverCell, rowsN, maxCols, selected, selectedMarkerId, selectedIds, sizeMenuOpen]);

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

  const applyStallSize = async (size: StallDisplaySize) => {
    const hit = MERGE_SIZES.find((m) => m.display === size) || MERGE_SIZES[0];
    setDraftMergeId(hit.id);
  };

  /** Commit draft merge size to the plan (not auto — requires Apply) */
  const applyMerge = async (m?: (typeof MERGE_SIZES)[number]) => {
    const target = m || MERGE_SIZES.find((x) => x.id === draftMergeId) || MERGE_SIZES[0];
    setSizeMenuOpen(false);

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
      setSizeMenuOpen(false);
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

  const cellStyle = (row: number, col: number, spanCols = 1, spanRows = 1): React.CSSProperties => ({
    gridColumn: `${col + 1} / span ${spanCols}`,
    gridRow: `${row + 1} / span ${spanRows}`,
  });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Modern Header */}
      <header className="sticky top-0 z-40 border-b border-white/20 bg-white/80 backdrop-blur-xl">
        <div className="container-px flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-slate-900">Floor Plan Editor</h1>
              <p className="text-sm text-slate-500">Design your exhibition layout</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedSlug} 
              onChange={(e) => setSelectedSlug(e.target.value)} 
              className="input min-w-[200px] border-slate-200 bg-white py-2.5 text-sm font-semibold shadow-sm"
            >
              {exhibitions.map((e) => <option key={e.id} value={e.slug}>{e.name}</option>)}
            </select>
            <select 
              value={hallId ?? ''} 
              onChange={(e) => setHallId(Number(e.target.value))} 
              className="input border-slate-200 bg-white py-2.5 text-sm shadow-sm"
            >
              {halls.length === 0 && <option value="">No halls</option>}
              {halls.map((h) => {
                const L = hallRowLayout(h);
                return <option key={h.id} value={h.id}>{h.name} · {L.join('-')}</option>;
              })}
            </select>
            <button 
              onClick={() => setShowNewHall(true)} 
              disabled={!selectedSlug}
              className="btn-primary flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-brand-500/20"
            >
              <Plus width={16} /> New Hall
            </button>
            <div className="flex gap-2">
              {selectedSlug && <Link to={`/admin/events/${selectedSlug}/edit`} className="btn-outline flex items-center gap-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"><Ticket width={15} /> Event</Link>}
              <Link to="/admin" className="btn-outline flex items-center gap-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm">Dashboard</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container-px py-6">
        {msg && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
            {msg}
          </div>
        )}

        {/* Attached Map Section - Collapsible */}
        <details className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 font-display text-sm font-bold text-slate-800 hover:bg-slate-50">
            📎 Attached Floor Plan Image
          </summary>
          <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <select 
                className="input border-slate-200" 
                value={attachMode} 
                onChange={(e) => setAttachMode(e.target.value as typeof attachMode)}
              >
                <option value="both">Both — map + interactive</option>
                <option value="attached">Attached only</option>
                <option value="interactive">Interactive only</option>
              </select>
              <input 
                className="input border-slate-200" 
                value={attachUrl} 
                onChange={(e) => setAttachUrl(e.target.value)} 
                placeholder="/sample-floor-plan.png" 
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="btn-outline cursor-pointer border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm">
                Upload Image
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || file.size > 8_000_000) return;
                    const reader = new FileReader();
                    reader.onload = () => setAttachUrl(String(reader.result || ''));
                    reader.readAsDataURL(file);
                  }} 
                />
              </label>
              <button 
                onClick={saveAttachedPlan} 
                disabled={saving || !selectedSlug} 
                className="btn-outline border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
              >
                Save Map
              </button>
              <button 
                onClick={generateFromAi} 
                disabled={aiBusy || saving || !selectedSlug || !attachUrl} 
                className="btn-primary bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-brand-500/20"
              >
                {aiBusy ? <RefreshCw width={16} className="animate-spin" /> : '✨ AI Generate Floor Plan'}
              </button>
            </div>
          </div>
        </details>

        {/* New Hall Creation Modal */}
        {showNewHall && (
          <div className="mb-6 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-slate-900">Create New Hall</h3>
              <button 
                onClick={() => setShowNewHall(false)} 
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X width={20} />
              </button>
            </div>
            <input 
              className="input mb-4 max-w-md border-slate-200 bg-white shadow-sm" 
              placeholder="Hall name (e.g., Main Hall, Hall A)" 
              value={hallForm.name} 
              onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} 
            />
            <div className="mb-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">Quick Layouts</div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button 
                    key={p.label} 
                    type="button" 
                    onClick={() => setHallForm({ ...hallForm, rowCounts: p.layout.map(String) })}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:border-brand-300 hover:bg-brand-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">Custom Layout (stalls per row)</div>
              <div className="flex flex-wrap gap-2">
                {hallForm.rowCounts.map((count, i) => (
                  <input 
                    key={i} 
                    className="input w-16 border-slate-200 bg-white text-center shadow-sm" 
                    type="number" 
                    min={1} 
                    max={24} 
                    value={count}
                    onChange={(e) => { const next = [...hallForm.rowCounts]; next[i] = e.target.value; setHallForm({ ...hallForm, rowCounts: next }); }} 
                  />
                ))}
                <button 
                  type="button" 
                  onClick={() => setHallForm({ ...hallForm, rowCounts: [...hallForm.rowCounts, '6'] })} 
                  className="rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600"
                >
                  + Add Row
                </button>
              </div>
            </div>
            <button 
              onClick={createHall} 
              disabled={saving} 
              className="btn-primary bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-base font-semibold shadow-lg shadow-brand-500/20"
            >
              {saving ? 'Creating...' : `Create Hall with ${layoutStallTotal(hallForm.rowCounts.map((v) => Number(v) || 0).filter((n) => n > 0))} Stalls`}
            </button>
          </div>
        )}

        {/* Empty State */}
        {halls.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-8 py-20 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Grid width={36} />
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900">No Floor Plan Yet</h3>
            <p className="mt-2 text-slate-500">Create your first hall to start designing the exhibition layout</p>
            <button 
              onClick={() => setShowNewHall(true)} 
              className="btn-primary mt-6 bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-3 text-base font-semibold shadow-lg shadow-brand-500/20"
            >
              <Plus width={18} className="mr-2" /> Create First Hall
            </button>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            {/* Main Floor Plan Grid */}
            <div className="card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              {/* Hall Controls Bar */}
              {hall && (
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <input 
                    className="input max-w-[160px] border-slate-200 bg-white text-sm shadow-sm" 
                    value={hallNameEdit} 
                    onChange={(e) => setHallNameEdit(e.target.value)} 
                    placeholder="Hall name" 
                  />
                  <div className="h-6 w-px bg-slate-300" />
                  <input 
                    className="input max-w-[120px] border-slate-200 bg-white text-sm shadow-sm" 
                    value={entranceLabel} 
                    onChange={(e) => setEntranceLabel(e.target.value)} 
                    placeholder="Entrance" 
                  />
                  <input 
                    className="input max-w-[120px] border-slate-200 bg-white text-sm shadow-sm" 
                    value={exitLabel} 
                    onChange={(e) => setExitLabel(e.target.value)} 
                    placeholder="Exit" 
                  />
                  <button 
                    onClick={renameHall} 
                    disabled={saving} 
                    className="btn-outline border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm"
                  >
                    Save
                  </button>
                  <div className="h-6 w-px bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Rows:</span>
                    {layoutEdit.map((count, i) => (
                      <input 
                        key={i} 
                        className="input w-10 border-slate-200 bg-white px-1 text-center text-xs shadow-sm" 
                        type="number" 
                        min={1} 
                        max={24} 
                        value={count}
                        onChange={(e) => { const next = [...layoutEdit]; next[i] = e.target.value; setLayoutEdit(next); }} 
                      />
                    ))}
                  </div>
                  <button 
                    onClick={applyLayout} 
                    disabled={saving} 
                    className="btn-outline border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm"
                  >
                    Apply
                  </button>
                  <button 
                    onClick={deleteHall} 
                    disabled={saving} 
                    className="ml-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 width={14} className="mr-1" /> Delete
                  </button>
                </div>
              )}

              {/* Current Tool Indicator */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-1.5 text-xs font-bold text-white shadow-md">
                    {PLACE_OPTIONS.find((o) => o.value === currentTypeValue)?.icon || '🏪'} {PLACE_OPTIONS.find((o) => o.value === currentTypeValue)?.label || 'Stall'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                    {currentMerge.label}
                  </span>
                  {selected && (
                    <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
                      {selected.code}
                    </span>
                  )}
                  {selectedMarkerId && (
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                      Amenity
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {stalls.length} stalls · {markers.items.length} amenities
                </div>
              </div>

              {/* Floor Plan Grid */}
              <div className="overflow-x-auto p-6">
                <div className="mx-auto rounded-2xl bg-gradient-to-b from-slate-50 to-white p-6 shadow-inner" style={{ minWidth: maxCols * (CELL + GAP) + 48 }}>
                  <div className="mb-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 py-2 text-center text-xs font-bold uppercase tracking-widest text-white shadow-md">
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
                    {Array.from({ length: rowsN * maxCols }).map((_, idx) => {
                      const row = Math.floor(idx / maxCols);
                      const col = idx % maxCols;
                      const inLayout = col < (layout[row] || 0);
                      const key = `${row}:${col}`;
                      const isOcc = occupied.has(key);
                      const inPreview = previewCells.has(key);
                      if (!inLayout) return <div key={key} style={cellStyle(row, col)} />;
                      const isOriginStall = stalls.some((s) => s.grid_row === row && s.grid_col === col);
                      const isOriginMarker = markers.items.some((m) => m.grid_row === row && m.grid_col === col);
                      if (isOriginStall || isOriginMarker) return <div key={key} style={cellStyle(row, col)} />;
                      if (isOcc) {
                        return <div key={key} style={cellStyle(row, col)} className={`pointer-events-none rounded-lg ${inPreview ? 'bg-brand-200/60 ring-2 ring-brand-400' : ''}`} />;
                      }
                      return (
                        <button
                          key={key}
                          type="button"
                          style={cellStyle(row, col)}
                          onClick={() => onCellAction(row, col)}
                          disabled={saving}
                          onMouseEnter={() => setHoverCell({ row, col })}
                          onMouseLeave={() => setHoverCell((h) => (h?.row === row && h?.col === col ? null : h))}
                          onDragOver={(e) => onDragOverCell(e, row, col)}
                          onDragLeave={() => setDragOver((d) => (d === key ? null : d))}
                          onDrop={(e) => onDropCell(e, row, col)}
                          className={`rounded-lg border-2 border-dashed text-xs font-bold transition-all ${
                            dragOver === key || inPreview 
                              ? 'border-brand-500 bg-brand-100 text-brand-700 scale-105 shadow-lg' 
                              : 'border-slate-300 bg-white text-slate-400 hover:border-brand-400 hover:bg-brand-50'
                          }`}
                        >
                          +
                        </button>
                      );
                    })}

                    {stalls.map((stall) => {
                      const { span_cols, span_rows } = stallSpans(stall);
                      const c = stallColors[stall.status];
                      const isSel = selectedIds.has(stall.id) || selected?.id === stall.id;
                      const isPending = pendingNextStall?.id === stall.id;
                      const isBeingDragged = isDragging && (selectedIds.has(stall.id) || selected?.id === stall.id);
                      const willAbsorb = footprintAbsorbIds.has(stall.id);
                      return (
                        <button
                          key={stall.id}
                          type="button"
                          draggable={!stallDirty || selected?.id === stall.id}
                          onDragStart={(e) => onDragStart(e, { type: 'stall', id: stall.id })}
                          onDragEnd={onDragEnd}
                          onClick={(e) => selectStall(stall, e)}
                          onDragOver={(e) => onDragOverCell(e, stall.grid_row, stall.grid_col)}
                          onDrop={(e) => onDropCell(e, stall.grid_row, stall.grid_col)}
                          style={cellStyle(stall.grid_row, stall.grid_col, span_cols, span_rows)}
                          className={`relative z-10 grid cursor-grab place-items-center rounded-xl border-2 font-bold transition-all active:cursor-grabbing hover:scale-[1.02] ${c.bg} ${c.border} ${c.text} ${
                            isPending ? 'ring-2 ring-amber-500 ring-offset-2'
                              : isSel ? 'ring-2 ring-brand-600 ring-offset-2 shadow-lg z-20'
                              : willAbsorb ? 'ring-2 ring-amber-400 ring-offset-1 opacity-70 z-20'
                              : 'shadow-md'
                          } ${isBeingDragged ? 'opacity-30 scale-95' : ''} ${span_cols * span_rows > 1 ? 'text-xs' : 'text-[10px]'}`}
                        >
                          {stall.code}
                          {willAbsorb && (
                            <span className="absolute inset-x-0 top-0 rounded-t-lg bg-amber-500/90 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">
                              Merge
                            </span>
                          )}
                          <span className="absolute bottom-1 right-1 rounded bg-black/10 px-1 text-[8px] font-semibold opacity-70">{span_cols}×{span_rows}</span>
                        </button>
                      );
                    })}

                    {markers.items.map((m) => {
                      const meta = MARKER_META[m.kind] || MARKER_META.custom;
                      const isBeingDragged = isDragging && selectedMarkerId === m.id;
                      const inBlockedFoot = selectionFootprint.some(
                        (cell) => cell.kind === 'blocked'
                          && cell.row >= m.grid_row && cell.row < m.grid_row + (m.span_rows || 1)
                          && cell.col >= m.grid_col && cell.col < m.grid_col + (m.span_cols || 1),
                      );
                      return (
                        <button
                          key={m.id}
                          type="button"
                          draggable
                          onDragStart={(e) => onDragStart(e, { type: 'marker', id: m.id })}
                          onDragEnd={onDragEnd}
                          onClick={() => {
                            setSelectedMarkerId(m.id);
                            setSelected(null);
                            setSelectedIds(new Set());
                            setPlaceTool({ kind: 'marker', marker: m.kind });
                            setMarkerPaint({ span_cols: m.span_cols || 1, span_rows: m.span_rows || 1 });
                            const hit = MERGE_SIZES.find((x) => x.span_cols === (m.span_cols || 1) && x.span_rows === (m.span_rows || 1));
                            setDraftMergeId(hit?.id || '1x1');
                            setStallDirty(false);
                            setPendingNextStall(null);
                            setSizeMenuOpen(false);
                          }}
                          onDragOver={(e) => onDragOverCell(e, m.grid_row, m.grid_col)}
                          onDrop={(e) => onDropCell(e, m.grid_row, m.grid_col)}
                          style={cellStyle(m.grid_row, m.grid_col, m.span_cols || 1, m.span_rows || 1)}
                          className={`z-10 grid cursor-grab place-items-center rounded-xl border-2 text-[10px] font-bold transition-all active:cursor-grabbing hover:scale-[1.02] ${meta.className} ${
                            selectedMarkerId === m.id ? 'ring-2 ring-brand-600 ring-offset-2 shadow-lg z-20'
                              : inBlockedFoot ? 'ring-2 ring-red-500 ring-offset-1 opacity-80'
                              : 'shadow-md'
                          } ${isBeingDragged ? 'opacity-30 scale-95' : ''}`}
                        >
                          <span className="text-center leading-tight">
                            {AMENITY_COPY[m.kind]?.icon || '📍'} {m.label}
                            <span className="mt-0.5 block text-[8px] opacity-70">{m.span_cols || 1}×{m.span_rows || 1}</span>
                          </span>
                        </button>
                      );
                    })}

                    {/* Selection footprint ghost — shows draft size from selected origin */}
                    {selectionFootprint.length > 0 && (() => {
                      const origin = selectionFootprint[0];
                      if (!origin) return null;
                      const minR = Math.min(...selectionFootprint.map((c) => c.row));
                      const minC = Math.min(...selectionFootprint.map((c) => c.col));
                      const maxR = Math.max(...selectionFootprint.map((c) => c.row));
                      const maxC = Math.max(...selectionFootprint.map((c) => c.col));
                      const spanCols = maxC - minC + 1;
                      const spanRows = maxR - minR + 1;
                      const bad = footprintBlocked;
                      return (
                        <>
                          {selectionFootprint.map((cell) => {
                            if (cell.kind === 'self') return null;
                            if (cell.row < 0 || cell.col < 0 || cell.row >= rowsN || cell.col >= maxCols) return null;
                            const tone = cell.kind === 'blocked' || cell.kind === 'oob'
                              ? 'border-red-500 bg-red-400/35'
                              : cell.kind === 'absorb'
                                ? 'border-amber-500 bg-amber-300/40'
                                : 'border-brand-500 bg-brand-300/35';
                            return (
                              <div
                                key={`foot-${cell.key}`}
                                style={cellStyle(cell.row, cell.col)}
                                className={`pointer-events-none z-[15] rounded-xl border-2 border-dashed ${tone}`}
                              />
                            );
                          })}
                          <div
                            style={cellStyle(minR, minC, spanCols, spanRows)}
                            className={`pointer-events-none z-[16] rounded-xl border-[3px] ${
                              bad ? 'border-red-500' : sizeDirty ? 'border-amber-500' : 'border-brand-600'
                            }`}
                          >
                            {sizeDirty && (
                              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${
                                bad ? 'bg-red-600' : 'bg-amber-500'
                              }`}>
                                {bad ? 'Blocked' : `Preview ${draftMerge.label} — Apply to save`}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* Ghost Preview for Drag Position */}
                    {isDragging && dragPreview && hoverCell && (
                      <div
                        style={cellStyle(dragPreview.row, dragPreview.col, dragPreview.spanCols, dragPreview.spanRows)}
                        className="pointer-events-none absolute z-20 grid place-items-center rounded-xl border-2 border-brand-500 bg-brand-100/80 text-brand-700 shadow-xl"
                      >
                        <div className="flex flex-col items-center">
                          <Move width={20} />
                          <span className="mt-1 text-xs font-bold">Drop here</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 rounded-full bg-slate-200 py-2 text-center text-xs font-bold uppercase tracking-widest text-slate-600">
                    {exitLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Sidebar Panel */}
            <aside className="card flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg xl:sticky xl:top-24">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                {/* Drag Instructions Panel */}
                {isDragging && (
                  <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-5 shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white">
                        <Move width={20} />
                      </div>
                      <div className="font-display text-base font-bold text-slate-900">Dragging Mode</div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">Drag</span>
                        <span>Move item to new position</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">↑ ↓ ← →</span>
                        <span>Fine-tune with arrow keys</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">Esc</span>
                        <span>Cancel drag operation</span>
                      </div>
                    </div>
                    {dragPreview && hoverCell && (
                      <div className="mt-3 rounded-lg bg-white p-3 text-xs">
                        <div className="font-semibold text-slate-700">Target Position</div>
                        <div className="mt-1 text-slate-600">Row: {hoverCell.row + 1}, Col: {hoverCell.col + 1}</div>
                        <div className="text-slate-600">Size: {dragPreview.spanCols}×{dragPreview.spanRows}</div>
                      </div>
                    )}
                  </div>
                )}

                {pendingNextStall && selected && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
                    <div className="text-sm font-bold text-amber-900">Unsaved changes on {selected.code}</div>
                    <p className="mt-1 text-xs text-amber-800">Switch to {pendingNextStall.code}?</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button type="button" onClick={saveAndSwitch} disabled={saving} className="btn-primary w-full text-sm font-semibold">Save & Switch</button>
                      <button type="button" onClick={discardAndSwitch} className="rounded-xl border border-amber-400 bg-white py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50">Discard</button>
                    <button type="button" onClick={cancelPendingSwitch} className="btn-outline w-full text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Tool Type — place mode only */}
              {!selected && !selectedMarkerId && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Place on empty cell</div>
                <div className="grid grid-cols-2 gap-2">
                  {PLACE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { void onTypeDropdownChange(o.value); }}
                      disabled={saving}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                        currentTypeValue === o.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-md'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">{o.icon}</span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Selected: clear edit header */}
              {(selected || selectedMarkerId) && selectedIds.size <= 1 && (
                <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Selected</div>
                      <div className="font-display text-base font-extrabold text-slate-900">
                        {selected ? selected.code : (markers.items.find((x) => x.id === selectedMarkerId)?.label || 'Amenity')}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        Change size below — neighbours highlighted on the plan. Click Apply to save.
                      </p>
                    </div>
                    <button type="button" onClick={clearSelection} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700">
                      <X width={18} />
                    </button>
                  </div>
                  {selected && (
                    <div className="mt-2">
                      <div className="mb-1 text-[10px] font-bold uppercase text-slate-500">Convert type</div>
                      <select
                        className="input border-slate-200 bg-white py-2 text-sm font-semibold shadow-sm"
                        value={currentTypeValue}
                        disabled={saving}
                        onChange={(e) => { void onTypeDropdownChange(e.target.value); }}
                      >
                        {PLACE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedMarkerId && (
                    <div className="mt-2">
                      <div className="mb-1 text-[10px] font-bold uppercase text-slate-500">Amenity type</div>
                      <select
                        className="input border-slate-200 bg-white py-2 text-sm font-semibold shadow-sm"
                        value={currentTypeValue}
                        disabled={saving}
                        onChange={(e) => { void onTypeDropdownChange(e.target.value); }}
                      >
                        {PLACE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Size Selector */}
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {selected || selectedMarkerId ? 'Size · merge cells' : 'Size for next place'}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSizeMenuOpen((o) => !o)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-all ${sizeDirty ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}
                  >
                    <MergeIcon cols={draftMerge.span_cols} rows={draftMerge.span_rows} active />
                    <span className="flex-1">
                      <span className="block font-display text-sm font-extrabold text-slate-900">{draftMerge.label}</span>
                      <span className="block text-xs font-medium text-slate-400">
                        {draftMerge.hint}
                        {sizeDirty ? ' · preview on plan' : ''}
                        {footprintBlocked ? ' · blocked' : ''}
                      </span>
                    </span>
                    <ChevronDown width={16} className={`text-slate-400 transition-transform ${sizeMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {sizeMenuOpen && (
                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      {MERGE_SIZES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setDraftMergeId(m.id);
                            setSizeMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-brand-50 ${draftMergeId === m.id ? 'bg-brand-50' : ''}`}
                        >
                          <MergeIcon cols={m.span_cols} rows={m.span_rows} active={draftMergeId === m.id} />
                          <span>
                            <span className="block text-sm font-bold text-slate-900">{m.label}</span>
                            <span className="block text-xs text-slate-400">{m.hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {(selected || selectedMarkerId) && sizeDirty && (
                  <div className={`mt-2 rounded-xl px-3 py-2 text-[11px] font-medium ${
                    footprintBlocked ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'
                  }`}>
                    {footprintBlocked
                      ? 'Red cells are blocked (booked / amenity / off-plan). Pick a smaller size or free those cells.'
                      : footprintAbsorbIds.size > 0
                        ? `Amber stalls (${footprintAbsorbIds.size}) will be merged into this booth when you Apply.`
                        : `Blue outline shows the new ${draftMerge.label} footprint. Click Apply to save.`}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { void applyMerge(); }}
                    disabled={saving || footprintBlocked || (!sizeDirty && !!(selected || selectedMarkerId))}
                    className={`btn-primary flex-1 bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-brand-500/20 ${sizeDirty && !footprintBlocked ? '' : 'opacity-50'}`}
                  >
                    {saving ? 'Applying…' : sizeDirty ? `Apply ${draftMerge.label}` : 'Apply Size'}
                  </button>
                  {sizeDirty && (selected || selectedMarkerId) && (
                    <button
                      type="button"
                      onClick={() => { setDraftMergeId(savedMerge.id); setSizeMenuOpen(false); }}
                      className="btn-outline border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
                    >
                      Discard
                    </button>
                  )}
                </div>
              </div>

              {/* Stall Details Panel */}
              {selected && !selectedMarkerId && selectedIds.size <= 1 && (
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-extrabold text-slate-900">Stall details</h3>
                  </div>
                  
                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Width</div>
                      <div className="font-display text-lg font-bold text-slate-900">{(stallSpans(selected).span_cols * 3)} m</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Depth</div>
                      <div className="font-display text-lg font-bold text-slate-900">{(stallSpans(selected).span_rows * 3)} m</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Area</div>
                      <div className="font-display text-lg font-bold text-brand-700">
                        {(stallSpans(selected).span_cols * stallSpans(selected).span_rows * 9)} m²
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Stall Code</span>
                      <input className="input border-slate-200 bg-white shadow-sm" value={stallForm.code} onChange={(e) => patchStallForm({ code: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Price (₹)</span>
                      <input className="input border-slate-200 bg-white shadow-sm" type="number" min={0} value={stallForm.price} onChange={(e) => patchStallForm({ price: e.target.value })} />
                      <span className="mt-1 block text-xs text-slate-400">{formatINR(Number(stallForm.price) || 0)}</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Zone</span>
                      <select className="input border-slate-200 bg-white shadow-sm" value={stallForm.zone} onChange={(e) => patchStallForm({ zone: e.target.value })}>
                        <option>Standard</option><option>Premium</option><option>Sponsor</option>
                      </select>
                    </label>
                  </div>

                  {/* Status Selector */}
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase text-slate-500">Status</div>
                    <div className="space-y-2">
                      {(Object.keys(stallColors) as (keyof typeof stallColors)[]).map((k) => (
                        <button key={k} type="button" onClick={() => patchStallForm({ status: k })}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${stallForm.status === k ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                          <span className={`h-4 w-4 rounded ${stallColors[k].legend}`} /> {stallColors[k].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Description</span>
                    <textarea className="input min-h-[80px] border-slate-200 bg-white shadow-sm" value={stallForm.description} onChange={(e) => patchStallForm({ description: e.target.value })} />
                  </label>

                  <button onClick={deleteSelectedStalls} disabled={saving} className="w-full rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-all">
                    <Trash2 width={14} className="mr-2" /> Delete Stall
                  </button>
                </div>
              )}

              {/* Amenity Details Panel */}
              {selectedMarkerId && (() => {
                const m = markers.items.find((x) => x.id === selectedMarkerId);
                if (!m) return null;
                const copy = AMENITY_COPY[m.kind] || AMENITY_COPY.custom;
                const meta = MARKER_META[m.kind] || MARKER_META.custom;
                return (
                  <div className="space-y-4 border-t border-slate-100 pt-5">
                    <div className={`rounded-2xl border-2 p-5 shadow-md ${meta.className}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{copy.icon}</span>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Amenity</div>
                          <div className="font-display text-xl font-extrabold">{copy.title}</div>
                        </div>
                      </div>
                      <p className="mt-2 text-sm opacity-90">{copy.tip}</p>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Label on Map</span>
                      <input 
                        className="input border-slate-200 bg-white shadow-sm" 
                        defaultValue={m.label} 
                        key={m.id} 
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== m.label) updateSelectedMarker({ label: v });
                        }} 
                      />
                    </label>
                    <button onClick={deleteSelectedMarker} disabled={saving} className="w-full rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-all">
                      <Trash2 width={14} className="mr-2" /> Remove from Plan
                    </button>
                  </div>
                );
              })()}

              {/* Placement Instructions */}
              {!selected && !selectedMarkerId && selectedIds.size <= 1 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 text-center shadow-sm">
                  <div className="text-2xl mb-2">{PLACE_OPTIONS.find((o) => o.value === currentTypeValue)?.icon || '🏪'}</div>
                  <div className="font-display text-sm font-bold text-slate-900">
                    Place {PLACE_OPTIONS.find((o) => o.value === currentTypeValue)?.label} · {currentMerge.label}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Click an empty cell (+) on the plan to place</p>
                  {placeTool.kind === 'marker' && (
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => onDragStart(e, { type: 'new-marker', kind: placeTool.marker })}
                      className={`mt-4 w-full cursor-grab rounded-xl border-2 px-4 py-3 text-sm font-bold active:cursor-grabbing transition-all ${MARKER_META[placeTool.marker].className}`}
                    >
                      Or drag onto plan
                    </button>
                  )}
                  <div className="mt-4 flex flex-col gap-2">
                    <button type="button" onClick={() => quickPlaceEnter('front-center')} disabled={saving}
                      className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all">
                      🚪 Quick Entrance
                    </button>
                    <button type="button" onClick={() => { setMarkerPaint({ span_cols: 2, span_rows: 2 }); setPlaceTool({ kind: 'marker', marker: 'stage' }); void quickPlaceStage(); }} disabled={saving}
                      className="rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-bold text-violet-800 hover:bg-violet-100 transition-all">
                      🎭 Quick Stage 2×2
                    </button>
                  </div>
                </div>
              )}

              {/* Multi-Selection Panel */}
              {selectedIds.size > 1 && (
                <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {selectedIds.size}
                    </div>
                    <div className="font-display text-sm font-bold text-slate-900">Stalls Selected</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={clearSelection} className="btn-outline flex-1 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm">Clear</button>
                    <button type="button" onClick={deleteSelectedStalls} className="flex-1 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-all">
                      <Trash2 width={14} className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Save Actions Footer */}
            {selected && !selectedMarkerId && selectedIds.size <= 1 && (
              <div className={`shrink-0 border-t px-5 py-4 ${stallDirty ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-white'}`}>
                <div className={`mb-3 text-center text-xs font-bold ${stallDirty ? 'text-amber-800' : 'text-slate-400'}`}>
                  {stallDirty ? '● Unsaved changes' : `Editing ${selected.code}`}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={discardStallEdits} disabled={!stallDirty || saving} className="btn-outline flex-1 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-40">Discard</button>
                  <button type="button" onClick={() => { void saveStall(); }} disabled={!stallDirty || saving}
                    className={`flex-[1.5] rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 shadow-lg ${stallDirty ? 'bg-gradient-to-r from-brand-600 to-brand-700' : 'bg-slate-300'}`}>
                    {saving ? 'Saving…' : 'Save Changes'}
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
