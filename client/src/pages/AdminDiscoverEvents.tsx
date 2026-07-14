import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDate, formatINR } from '../api';
import { Spinner } from '../components/ui';
import { ArrowRight, MapPin, Search, Ticket } from '../components/icons';
import { useCity } from '../city';

const CITIES = ['Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad', 'Kolkata', 'Jaipur'];

interface DiscoveredEvent {
  name: string;
  tagline?: string;
  industry: string;
  venue: string;
  city: string;
  address?: string;
  start_date: string;
  end_date: string;
  status: string;
  price_from: number;
  b2b?: boolean;
  entry_free?: boolean;
  international?: boolean;
  why?: string;
  source?: string;
}

export default function AdminDiscoverEvents() {
  const { city: userCity } = useCity();
  const navigate = useNavigate();
  const [city, setCity] = useState(userCity || 'Bengaluru');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('');
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [events, setEvents] = useState<DiscoveredEvent[]>([]);
  const [searched, setSearched] = useState(false);

  const discover = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!city.trim()) return;
    setBusy(true);
    setError('');
    setSearched(true);
    try {
      const r = await api.post('/admin/discover-events', { city: city.trim() });
      setEvents(r.data.events || []);
      setMode(r.data.mode || '');
      setOpenaiConfigured(!!r.data.openai_configured);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Discovery failed');
      setEvents([]);
    } finally {
      setBusy(false);
    }
  };

  const addEvent = async (ev: DiscoveredEvent) => {
    setAdding(ev.name);
    try {
      const r = await api.post('/admin/exhibitions', {
        name: ev.name,
        tagline: ev.tagline,
        industry: ev.industry,
        about: `${ev.name} at ${ev.venue}, ${ev.city}. ${ev.why || ''}`.trim(),
        venue: ev.venue,
        city: ev.city,
        address: ev.address,
        start_date: ev.start_date,
        end_date: ev.end_date,
        status: ['live', 'upcoming', 'past'].includes(ev.status) ? ev.status : 'upcoming',
        price_from: ev.price_from || 45000,
        b2b: ev.b2b !== false,
        entry_free: !!ev.entry_free,
        international: !!ev.international,
        create_floor_plan: false,
        tags: ['AI discovered', 'New'],
      });
      setEvents((list) => list.filter((x) => x.name !== ev.name));
      if (confirm(`Added “${ev.name}”. Open floor plan editor?`)) {
        navigate(`/admin/floor-plan?slug=${encodeURIComponent(r.data.slug)}`);
      } else {
        navigate(`/admin/events/${r.data.slug}/edit`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Could not add event');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="container-px py-8">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowRight width={14} className="rotate-180" /> Admin dashboard
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Discover events (AI)</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          Enter a city to find trade shows and expos that are available but not yet in your database. Review and add any you want.
        </p>
      </div>

      <form onSubmit={discover} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <label className="min-w-[200px] flex-1 text-sm">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">
            <MapPin width={12} /> City
          </span>
          <input
            className="input"
            list="discover-cities"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Bengaluru"
            required
          />
          <datalist id="discover-cities">
            {CITIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <button type="submit" disabled={busy} className="btn-primary">
          <Search width={16} /> {busy ? 'Searching…' : 'Find events'}
        </button>
      </form>

      {error && <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{error}</div>}

      {busy && <Spinner label="AI agent scanning events not in DB…" />}

      {!busy && searched && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <span className="rounded-full bg-ink-100 px-2.5 py-1 font-semibold text-ink-700">
              {events.length} event{events.length === 1 ? '' : 's'} not in DB
            </span>
            <span>
              Source: {mode === 'openai' ? 'OpenAI agent' : mode === 'generated' ? 'generated suggestions' : 'AI discovery catalog'}
              {openaiConfigured ? ' · OpenAI key configured' : ' · add OPENAI_API_KEY for live AI'}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 px-6 py-14 text-center">
              <Ticket width={28} className="mx-auto text-ink-300" />
              <p className="mt-3 font-display text-lg font-bold text-ink-800">No missing events found for {city}</p>
              <p className="mt-1 text-sm text-ink-500">Everything in the discovery set for this city is already in your database.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.name} className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-ink-900">{ev.name}</h2>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">{ev.status}</span>
                      <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">{ev.industry}</span>
                    </div>
                    {ev.tagline && <p className="mt-1 text-sm text-ink-500">{ev.tagline}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                      <span>{ev.venue} · {ev.city}</span>
                      <span>{formatDate(ev.start_date)} – {formatDate(ev.end_date)}</span>
                      <span>From {formatINR(ev.price_from)}</span>
                    </div>
                    {ev.why && <p className="mt-2 text-xs italic text-ink-400">{ev.why}</p>}
                  </div>
                  <button
                    onClick={() => addEvent(ev)}
                    disabled={adding === ev.name}
                    className="btn-primary shrink-0 self-start text-sm"
                  >
                    {adding === ev.name ? 'Adding…' : 'Add to ExpoMela'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
