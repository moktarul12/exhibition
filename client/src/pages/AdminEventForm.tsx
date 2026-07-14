import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Spinner } from '../components/ui';
import { ArrowRight, Grid, Ticket } from '../components/icons';

const CITIES = ['Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune'];
const INDUSTRIES = [
  'Technology', 'Plastics', 'Food & Beverage', 'Industrial Automation', 'Medical Equipment',
  'Printing & Packaging', 'Renewable Energy', 'Handicrafts', 'Hospitality', 'Home Automation',
  'Logistics', 'Automotive', 'Real Estate', 'Education', 'Building & Construction',
];

const emptyForm = {
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
  row_layout: '10,5,8,6',
  floor_plan_url: '',
  floor_plan_mode: 'both' as 'attached' | 'interactive' | 'both',
};

export default function AdminEventForm() {
  const { slug } = useParams();
  const isEdit = !!slug;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/exhibitions/${slug}`)
      .then((r) => {
        const e = r.data;
        setForm({
          name: e.name || '',
          tagline: e.tagline || '',
          industry: e.industry || 'Technology',
          about: e.about || '',
          venue: e.venue || '',
          city: e.city || 'Bengaluru',
          address: e.address || '',
          start_date: e.start_date || '',
          end_date: e.end_date || '',
          status: e.status || 'upcoming',
          price_from: String(e.price_from ?? 45000),
          youtube_url: e.youtube_url || '',
          reel_url: e.reel_url || '',
          entry_free: !!e.entry_free,
          b2b: e.b2b !== 0,
          create_floor_plan: false,
          hall_count: '2',
          row_layout: '10,5,8,6',
          floor_plan_url: e.floor_plan_url || '',
          floor_plan_mode: (e.floor_plan_mode as 'attached' | 'interactive' | 'both') || 'both',
        });
      })
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const layout = String(form.row_layout || '')
        .split(/[,x×\s]+/i)
        .map((n) => Number(n.trim()))
        .filter((n) => n > 0);
      const payload = {
        ...form,
        price_from: Number(form.price_from) || 0,
        hall_count: Number(form.hall_count) || 2,
        row_layout: layout.length ? layout : [8, 8, 8, 8, 8, 8],
        create_floor_plan: form.floor_plan_mode === 'attached' ? false : form.create_floor_plan,
        floor_plan_url: form.floor_plan_url || null,
        floor_plan_mode: form.floor_plan_mode,
        tags: form.status === 'live' ? ['Live', 'New Launch'] : form.status === 'past' ? ['Past'] : ['Upcoming'],
      };
      if (isEdit) {
        await api.patch(`/admin/exhibitions/${slug}`, payload);
        navigate(`/admin/floor-plan?slug=${encodeURIComponent(slug!)}`);
      } else {
        const r = await api.post('/admin/exhibitions', payload);
        if (form.create_floor_plan) navigate(`/admin/floor-plan?slug=${encodeURIComponent(r.data.slug)}`);
        else navigate(`/exhibitions/${r.data.slug}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || (isEdit ? 'Could not update event' : 'Could not create event'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading event…" />;

  return (
    <div className="container-px py-8">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowRight width={14} className="rotate-180" /> Admin dashboard
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{isEdit ? 'Edit event' : 'Create event'}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {isEdit ? 'Update exhibition details, then manage the floor plan.' : 'Add a new exhibition and optionally generate its floor plan halls.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEdit && (
            <Link to={`/admin/floor-plan?slug=${encodeURIComponent(slug!)}`} className="btn-outline text-sm">
              <Grid width={15} /> Edit floor plan
            </Link>
          )}
          {!isEdit && (
            <Link to="/admin/floor-plan" className="btn-outline text-sm"><Grid width={15} /> Floor plans</Link>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event name" required>
            <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Bengaluru Tech Summit 2026" />
          </Field>
          <Field label="Industry" required>
            <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)}>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              {!INDUSTRIES.includes(form.industry) && form.industry && <option value={form.industry}>{form.industry}</option>}
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
              {!CITIES.includes(form.city) && form.city && <option value={form.city}>{form.city}</option>}
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
              <option value="disabled">Disabled (hidden)</option>
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

        <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
          <div className="mb-3 font-semibold text-ink-900">Official floor plan (attached map)</div>
          <p className="mb-3 text-sm text-ink-500">
            Already have a designed hall plan (PNG / JPG / PDF)? Attach it here. You can still keep the interactive stall grid for booking.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Display mode">
              <select className="input" value={form.floor_plan_mode} onChange={(e) => set('floor_plan_mode', e.target.value)}>
                <option value="both">Both — official map + book stalls</option>
                <option value="attached">Attached map only</option>
                <option value="interactive">Interactive stalls only</option>
              </select>
            </Field>
            <Field label="Map URL or upload">
              <input
                className="input"
                value={form.floor_plan_url}
                onChange={(e) => set('floor_plan_url', e.target.value)}
                placeholder="/sample-floor-plan.png or https://…"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="btn-outline cursor-pointer text-sm">
              Upload image/PDF
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 8_000_000) {
                    alert('Please use a file under 8MB');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => set('floor_plan_url', String(reader.result || ''));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <button type="button" className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600" onClick={() => set('floor_plan_url', '/sample-floor-plan.png')}>
              Use sample map 1
            </button>
            <button type="button" className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600" onClick={() => set('floor_plan_url', '/sample-floor-plan-2.png')}>
              Use sample map 2
            </button>
            {form.floor_plan_url && (
              <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => set('floor_plan_url', '')}>Clear</button>
            )}
          </div>
          {form.floor_plan_url && !form.floor_plan_url.startsWith('data:application/pdf') && (
            <img src={form.floor_plan_url} alt="Floor plan preview" className="mt-3 max-h-40 rounded-xl border border-ink-100 object-contain" />
          )}
        </div>

        {!isEdit && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.create_floor_plan}
                onChange={(e) => set('create_floor_plan', e.target.checked)}
                disabled={form.floor_plan_mode === 'attached'}
              />
              <div>
                <div className="font-semibold text-ink-900">Also create interactive floor plan</div>
                <div className="text-sm text-ink-500">
                  {form.floor_plan_mode === 'attached'
                    ? 'Disabled while display mode is “Attached map only”.'
                    : 'Generate halls and bookable stalls so exhibitors can reserve online.'}
                </div>
              </div>
            </label>
            {form.create_floor_plan && form.floor_plan_mode !== 'attached' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Halls">
                  <input className="input" type="number" min={1} max={6} value={form.hall_count} onChange={(e) => set('hall_count', e.target.value)} />
                </Field>
                <Field label="Stalls per row (custom)">
                  <input
                    className="input"
                    value={form.row_layout}
                    onChange={(e) => set('row_layout', e.target.value)}
                    placeholder="e.g. 10,5,8,6"
                  />
                  <span className="mt-1 block text-[11px] text-ink-400">Comma-separated — row 1 = 10 stalls, row 2 = 5, etc.</span>
                </Field>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-brand-700">{error}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" disabled={busy} className="btn-primary">
            <Ticket width={16} /> {busy ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save changes' : 'Create event')}
          </button>
          {isEdit && (
            <Link to={`/exhibitions/${slug}`} className="btn-outline">View public page</Link>
          )}
          {isEdit && form.status !== 'disabled' && (
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50"
              onClick={async () => {
                if (!confirm('Disable this event? It will hide from public listings.')) return;
                setBusy(true);
                try {
                  await api.post(`/admin/exhibitions/${slug}/disable`);
                  set('status', 'disabled');
                } catch {
                  setError('Could not disable event');
                } finally { setBusy(false); }
              }}
            >
              Disable event
            </button>
          )}
          {isEdit && form.status === 'disabled' && (
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              onClick={async () => {
                setBusy(true);
                try {
                  await api.post(`/admin/exhibitions/${slug}/enable`, { status: 'upcoming' });
                  set('status', 'upcoming');
                } catch {
                  setError('Could not enable event');
                } finally { setBusy(false); }
              }}
            >
              Re-enable event
            </button>
          )}
          {isEdit && (
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              onClick={async () => {
                if (!confirm('Permanently delete this event and its floor plans? This cannot be undone.')) return;
                setBusy(true);
                try {
                  await api.delete(`/admin/exhibitions/${slug}`);
                  navigate('/admin');
                } catch {
                  setError('Could not delete event');
                  setBusy(false);
                }
              }}
            >
              Delete event
            </button>
          )}
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
