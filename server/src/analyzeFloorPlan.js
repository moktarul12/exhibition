import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spansForSize, defaultHallMarkers, MARKER_KINDS } from './floorLayout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', '..', 'client', 'public');

function mimeFromExt(ext) {
  const e = String(ext || '').toLowerCase();
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'pdf') return 'application/pdf';
  return 'image/png';
}

/** Turn a public path, remote URL, or data URL into a vision-usable image payload. */
export async function resolveImageForVision(url) {
  if (!url || typeof url !== 'string') throw new Error('floor_plan_url is required');
  const trimmed = url.trim();

  if (trimmed.startsWith('data:')) {
    if (trimmed.startsWith('data:application/pdf')) {
      throw new Error('PDF floor plans cannot be vision-read yet — upload a PNG or JPG of the map');
    }
    return { type: 'image_url', image_url: { url: trimmed } };
  }

  if (trimmed.startsWith('/')) {
    const filePath = path.join(publicDir, trimmed.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) throw new Error(`Local floor plan file not found: ${trimmed}`);
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1);
    const mime = mimeFromExt(ext);
    if (mime === 'application/pdf') {
      throw new Error('PDF floor plans cannot be vision-read yet — upload a PNG or JPG of the map');
    }
    return {
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${buf.toString('base64')}` },
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { type: 'image_url', image_url: { url: trimmed } };
  }

  throw new Error('Unsupported floor plan URL — use https, /public path, or image upload');
}

function clamp(n, min, max) {
  return Math.min(Math.max(Number(n) || 0, min), max);
}

function normalizeAnalysis(raw) {
  const grid_cols = clamp(raw.grid_cols ?? 16, 6, 32);
  const grid_rows = clamp(raw.grid_rows ?? 12, 4, 24);
  const stalls = Array.isArray(raw.stalls) ? raw.stalls : [];
  const markers = Array.isArray(raw.markers) ? raw.markers : [];

  const normStalls = stalls.slice(0, 200).map((s, i) => {
    const sizeInfo = spansForSize(s.display_size || (Number(s.span_cols) >= 2 && Number(s.span_rows) >= 2 ? 'xlarge' : Number(s.span_cols) >= 2 ? 'large' : 'medium'));
    const span_cols = clamp(s.span_cols ?? sizeInfo.span_cols, 1, 4);
    const span_rows = clamp(s.span_rows ?? sizeInfo.span_rows, 1, 4);
    let row = clamp(s.row ?? s.grid_row, 0, grid_rows - 1);
    let col = clamp(s.col ?? s.grid_col, 0, grid_cols - 1);
    if (row + span_rows > grid_rows) row = Math.max(0, grid_rows - span_rows);
    if (col + span_cols > grid_cols) col = Math.max(0, grid_cols - span_cols);
    return {
      code: String(s.code || `S-${i + 1}`).slice(0, 24),
      grid_row: row,
      grid_col: col,
      span_cols,
      span_rows,
      display_size: sizeInfo.display_size,
      zone: String(s.zone || 'Standard').slice(0, 40),
      type: String(s.type || 'Standard').slice(0, 40),
      price: Number(s.price) || (sizeInfo.display_size === 'large' || sizeInfo.display_size === 'xlarge' ? 75000 : 45000),
      label: s.label ? String(s.label).slice(0, 80) : null,
    };
  });

  const base = defaultHallMarkers();
  const normMarkers = markers.slice(0, 40).map((m, i) => {
    const kind = MARKER_KINDS.includes(m.kind) ? m.kind : 'custom';
    const span_cols = clamp(m.span_cols ?? (kind === 'stage' || kind === 'lounge' ? 2 : 1), 1, 6);
    const span_rows = clamp(m.span_rows ?? 1, 1, 4);
    let row = clamp(m.row ?? m.grid_row, 0, grid_rows - 1);
    let col = clamp(m.col ?? m.grid_col, 0, grid_cols - 1);
    if (row + span_rows > grid_rows) row = Math.max(0, grid_rows - span_rows);
    if (col + span_cols > grid_cols) col = Math.max(0, grid_cols - span_cols);
    return {
      id: `ai-${i}-${kind}`,
      kind,
      label: String(m.label || kind).slice(0, 40),
      grid_row: row,
      grid_col: col,
      span_cols,
      span_rows,
    };
  });

  return {
    entrance_label: String(raw.entrance_label || base.entrance_label).slice(0, 80),
    exit_label: String(raw.exit_label || base.exit_label).slice(0, 80),
    grid_rows,
    grid_cols,
    row_layout: Array.from({ length: grid_rows }, () => grid_cols),
    stalls: normStalls,
    markers: {
      entrance_label: String(raw.entrance_label || base.entrance_label).slice(0, 80),
      exit_label: String(raw.exit_label || base.exit_label).slice(0, 80),
      items: normMarkers,
    },
    notes: raw.notes ? String(raw.notes).slice(0, 500) : '',
  };
}

/** Heuristic fallback when OpenAI is unavailable — still produces an editable plan. */
export function fallbackAnalysisFromImageHint() {
  return normalizeAnalysis({
    entrance_label: 'Main entrance',
    exit_label: 'Exit / registration',
    grid_cols: 14,
    grid_rows: 10,
    notes: 'Fallback layout (OpenAI unavailable). Edit stalls after generate.',
    stalls: [
      ...Array.from({ length: 8 }, (_, i) => ({ code: `A${i + 1}`, row: 0, col: i + 2, span_cols: 1, display_size: 'small' })),
      ...Array.from({ length: 6 }, (_, i) => ({ code: `B${i + 1}`, row: 2, col: i + 3, span_cols: i % 3 === 0 ? 2 : 1, display_size: i % 3 === 0 ? 'large' : 'medium' })),
      ...Array.from({ length: 6 }, (_, i) => ({ code: `C${i + 1}`, row: 4, col: i + 3, span_cols: 1, display_size: 'medium' })),
      { code: 'D1', row: 6, col: 3, span_cols: 2, span_rows: 2, display_size: 'xlarge', zone: 'Premium' },
      { code: 'D2', row: 6, col: 6, span_cols: 2, span_rows: 2, display_size: 'xlarge', zone: 'Premium' },
      ...Array.from({ length: 5 }, (_, i) => ({ code: `E${i + 1}`, row: 9, col: i + 4, span_cols: 1, display_size: 'medium' })),
    ],
    markers: [
      { kind: 'enter', label: 'Entry', row: 9, col: 0 },
      { kind: 'exit', label: 'Exit', row: 9, col: 13 },
      { kind: 'lounge', label: 'Lounge', row: 3, col: 0, span_cols: 2 },
      { kind: 'food', label: 'Food', row: 5, col: 11, span_cols: 2 },
      { kind: 'stage', label: 'Stage', row: 7, col: 10, span_cols: 2 },
      { kind: 'restroom', label: 'WC', row: 1, col: 12 },
    ],
  });
}

export async function analyzeFloorPlanImage(imageUrl) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ...fallbackAnalysisFromImageHint(), source: 'fallback', openai_configured: false };
  }

  const imagePart = await resolveImageForVision(imageUrl);
  const prompt = `You are an exhibition floor-plan digitizer.
Look at this floor plan image and extract a bookable stall layout for ExpoMela.

Return ONLY JSON (no markdown) with this shape:
{
  "entrance_label": "string",
  "exit_label": "string",
  "grid_cols": number (8-28),
  "grid_rows": number (6-20),
  "stalls": [
    {
      "code": "booth id e.g. A12 or 01",
      "row": 0-based grid row,
      "col": 0-based grid col,
      "span_cols": 1-4,
      "span_rows": 1-3,
      "display_size": "small"|"medium"|"large"|"xlarge",
      "zone": "Standard"|"Premium"|"Sponsor",
      "label": "optional exhibitor or booth name"
    }
  ],
  "markers": [
    {
      "kind": "enter"|"exit"|"lounge"|"food"|"restroom"|"info"|"stage"|"clinic"|"custom",
      "label": "string",
      "row": number,
      "col": number,
      "span_cols": number,
      "span_rows": number
    }
  ],
  "notes": "short note"
}

Rules:
- Map the visual booths onto a coarse grid (not pixel-perfect).
- Larger booths → larger span / display_size.
- Include Enter/Exit, catering/food, lounge, stage, washrooms as markers when visible.
- Prefer 20–80 stalls for dense plans; skip tiny unreadable booths.
- Do not invent booths that are clearly empty aisle space.`;

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              imagePart,
            ],
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('OpenAI vision network error:', err.message);
    return {
      ...fallbackAnalysisFromImageHint(),
      source: 'fallback',
      openai_configured: true,
      notes: `AI network error; used fallback layout. ${err.message}`,
    };
  }

  if (!res.ok) {
    const text = await res.text();
    console.warn('OpenAI vision floor plan error:', res.status, text.slice(0, 300));
    return {
      ...fallbackAnalysisFromImageHint(),
      source: 'fallback',
      openai_configured: true,
      notes: `AI vision failed (${res.status}); used fallback layout. ${text.slice(0, 120)}`,
    };
  }

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ...fallbackAnalysisFromImageHint(), source: 'fallback', openai_configured: true, notes: 'Could not parse AI JSON' };
  }
  const analysis = normalizeAnalysis(parsed);
  return { ...analysis, source: 'openai', openai_configured: true };
}
