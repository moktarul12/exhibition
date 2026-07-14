import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowRight, Grid, Ticket } from '../components/icons';

const CITIES = ['Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune'];
const INDUSTRIES = [
  'Technology', 'Plastics', 'Food & Beverage', 'Industrial Automation', 'Medical Equipment',
  'Printing & Packaging', 'Renewable Energy', 'Handicrafts', 'Hospitality', 'Home Automation',
  'Logistics', 'Automotive', 'Real Estate', 'Education', 'Building & Construction',
];

export default function AdminCreateEvent() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    tagline: '',
    industry: 'Technology',
    about: '',
    venue: '',
    city: 'Bengaluru',
    address: '',
    start_date: '',
    end_date: '',
    status: 'upcoming',
    price_from: '45000',
    youtube_url: '',
    reel_url: '',
    entry_free: false,
    b2b: true,
    create_floor_plan: true,
    hall_count: '2',
    grid_rows: '6',
    grid_cols: '8',
  });

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.post('/admin/exhibitions', {
        ...form,
        price_from: Number(form.price_from) || 0,
        hall_count: Number(form.hall_count) || 2,
        grid_rows: Number(form.grid_rows) || 6,
        grid_cols: Number(form.grid_cols) || 8,
        tags: form.status === 'live' ? ['Live', 'New Launch'] : ['Upcoming'],
      });
      if (form.create_floor_plan) navigate(`/admin/floor-plan?slug=${encodeURIComponent(r.data.slug)}`);
      else navigate(`/exhibitions/${r.data.slug}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not create event');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-px py-8">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowRight width={14} className="rotate-180" /> Admin dashboard
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Create event</h1>
          <p className="mt-1 text-sm text-ink-500">Add a new exhibition and optionally generate its floor plan halls.</p>
        </div>
        <Link to="/admin/floor-plan" className="btn-outline text-sm"><Grid width={15} /> Create floor plan</Link>
      </div>

      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event name" required>
            <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Bengaluru Tech Summit 2026" />
          </Field>
          <Field label="Industry" required>
            <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)}>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Tagline">
          <input className="input" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Short one-line pitch" />
        </Field>

        <Field label="About / description">
          <textarea className="input min-h-[100px]" value={form.about} onChange={(e) => set('about', e.target.value)} placeholder="What visitors and exhibitors should expect…" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue" required>
            <input className="input" required value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="BIEC / KTPO / Palace Grounds" />
          </Field>
          <Field label="City" required>
            <select className="input" value={form.city} onChange={(e) => set('city', e.target.value)}>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Address">
          <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full venue address" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Start date" required>
            <input className="input" type="date" required value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </Field>
          <Field label="End date" required>
            <input className="input" type="date" required value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="past">Past</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stall price from (₹)">
            <input className="input" type="number" min={0} value={form.price_from} onChange={(e) => set('price_from', e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
              <input type="checkbox" checked={form.b2b} onChange={(e) => set('b2b', e.target.checked)} /> B2B
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
              <input type="checkbox" checked={form.entry_free} onChange={(e) => set('entry_free', e.target.checked)} /> Free visitor entry
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="YouTube video URL">
            <input className="input" value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} placeholder="https://youtube.com/…" />
          </Field>
          <Field label="Reel URL">
            <input className="input" value={form.reel_url} onChange={(e) => set('reel_url', e.target.value)} placeholder="Instagram / Shorts URL" />
          </Field>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={form.create_floor_plan} onChange={(e) => set('create_floor_plan', e.target.checked)} />
            <div>
              <div className="font-semibold text-ink-900">Also create floor plan</div>
              <div className="text-sm text-ink-500">Generate halls and available stalls so you can edit them next.</div>
            </div>
          </label>
          {form.create_floor_plan && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Halls">
                <input className="input" type="number" min={1} max={6} value={form.hall_count} onChange={(e) => set('hall_count', e.target.value)} />
              </Field>
              <Field label="Rows">
                <input className="input" type="number" min={3} max={12} value={form.grid_rows} onChange={(e) => set('grid_rows', e.target.value)} />
              </Field>
              <Field label="Columns">
                <input className="input" type="number" min={4} max={16} value={form.grid_cols} onChange={(e) => set('grid_cols', e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        {error && <p className="text-sm font-medium text-brand-700">{error}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" disabled={busy} className="btn-primary">
            <Ticket width={16} /> {busy ? 'Creating…' : 'Create event'}
          </button>
          <Link to="/admin" className="btn-outline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
