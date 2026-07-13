import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Exhibition } from '../types';
import ExhibitionCard from '../components/ExhibitionCard';
import { Spinner } from '../components/ui';
import { Search, Grid, MapPin } from '../components/icons';
import { useCity } from '../city';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'live', label: 'Live now' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

export default function Exhibitions() {
  const [params, setParams] = useSearchParams();
  const { city: globalCity, cities } = useCity();
  const [list, setList] = useState<(Exhibition & { distance_km?: number | null })[]>([]);
  const [filters, setFilters] = useState<{ industries: string[]; cities: string[] }>({ industries: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [nearMe, setNearMe] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState('');

  const status = params.get('status') || '';
  const industry = params.get('industry') || '';
  // Default to the globally selected city; user can override or pick "all".
  const city = params.get('city') ?? globalCity;
  const q = params.get('q') || '';
  const cityActive = !nearMe && city && city !== 'all';

  useEffect(() => { api.get('/exhibitions/meta/filters').then((r) => setFilters(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (industry) query.set('industry', industry);
    if (cityActive) query.set('city', city);
    if (q) query.set('q', q);
    if (nearMe && coords) {
      query.set('lat', String(coords.lat));
      query.set('lng', String(coords.lng));
      query.set('radius_km', '60');
    }
    api.get(`/exhibitions?${query.toString()}`).then((r) => setList(r.data)).finally(() => setLoading(false));
  }, [status, industry, city, q, nearMe, coords, cityActive]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const enableNearMe = () => {
    setLocError('');
    if (!navigator.geolocation) { setCoords({ lat: 12.9716, lng: 77.5946 }); setNearMe(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearMe(true); },
      () => { setCoords({ lat: 12.9716, lng: 77.5946 }); setNearMe(true); setLocError('Location permission denied — showing nearest demo results.'); },
      { timeout: 8000 }
    );
  };

  const cityOptions = Array.from(new Set([...cities, ...filters.cities]));
  const clearAll = () => { setParams(new URLSearchParams()); setNearMe(false); setCoords(null); };
  const hasFilters = !!(status || industry || params.get('city') || q || nearMe);

  return (
    <div>
      <div className="border-b border-ink-100 bg-white">
        <div className="container-px py-9">
          <div className="eyebrow mb-2">{cityActive ? city : 'India'} · Trade fairs & expos</div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">Discover exhibitions</h1>
          <p className="mt-2 max-w-xl text-ink-500">Browse live, upcoming and past exhibitions{cityActive ? ` in ${city}` : ' across India'}, or find the ones nearest you.</p>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-ink-200 bg-white px-4 shadow-sm focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-100">
              <Search width={19} className="text-ink-400" />
              <input defaultValue={q} onChange={(e) => update('q', e.target.value)} placeholder="Search by name, industry or venue…" className="w-full bg-transparent py-3 text-sm outline-none" />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={cityActive ? city : 'all'} onChange={(e) => update('city', e.target.value)} className="input w-auto rounded-full">
                <option value="all">All cities</option>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={industry} onChange={(e) => update('industry', e.target.value)} className="input w-auto rounded-full">
                <option value="">All industries</option>{filters.industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <button onClick={enableNearMe} className={nearMe ? 'btn-primary' : 'btn-outline'}><MapPin width={16} /> Near me</button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((t) => (
              <button key={t.key} onClick={() => update('status', t.key)}
                className={`chip ${status === t.key ? 'chip-active' : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'}`}>{t.label}</button>
            ))}
            <span className="mx-1 h-4 w-px bg-ink-200" />
            {cityOptions.slice(0, 6).map((c) => (
              <button key={c} onClick={() => { setNearMe(false); update('city', c); }}
                className={`chip ${cityActive && c === city ? 'chip-active' : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'}`}>{c}</button>
            ))}
            {hasFilters && <button onClick={clearAll} className="ml-1 text-xs font-semibold text-brand-600 hover:underline">Clear all</button>}
          </div>
        </div>
      </div>

      <div className="container-px py-8">
        {(nearMe || locError) && (
          <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            {locError || `Showing exhibitions near you${list[0]?.distance_km != null ? ` · closest ${list[0].distance_km} km away` : ''}`}
          </div>
        )}

        {loading ? <Spinner /> : list.length === 0 ? (
          <div className="card grid place-items-center py-20 text-center text-ink-500"><Grid width={42} className="mb-3 text-ink-300" />No exhibitions match your filters.</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-ink-400">{list.length} exhibition{list.length !== 1 ? 's' : ''} found{cityActive ? ` in ${city}` : ''}</div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((e) => (
                <div key={e.id} className="relative">
                  {e.distance_km != null && (
                    <div className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-brand-700 shadow-sm">{e.distance_km} km</div>
                  )}
                  <ExhibitionCard e={e} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
