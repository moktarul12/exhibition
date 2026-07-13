import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Exhibition } from '../types';
import ExhibitionCard from '../components/ExhibitionCard';
import { Spinner } from '../components/ui';
import { Search, Grid, MapPin } from '../components/icons';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  BIEC: { lat: 13.0716, lng: 77.4784 },
  Whitefield: { lat: 12.9698, lng: 77.7500 },
  'Palace Grounds': { lat: 12.9981, lng: 77.5920 },
  Hebbal: { lat: 13.0358, lng: 77.5970 },
};

export default function Exhibitions() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<(Exhibition & { distance_km?: number | null })[]>([]);
  const [filters, setFilters] = useState<{ industries: string[]; cities: string[] }>({ industries: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [nearMe, setNearMe] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLabel, setLocLabel] = useState('');
  const [locError, setLocError] = useState('');

  const status = params.get('status') || '';
  const industry = params.get('industry') || '';
  const city = params.get('city') || '';
  const q = params.get('q') || '';

  useEffect(() => { api.get('/exhibitions/meta/filters').then((r) => setFilters(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (industry) query.set('industry', industry);
    if (city) query.set('city', city);
    if (q) query.set('q', q);
    if (nearMe && coords) {
      query.set('lat', String(coords.lat));
      query.set('lng', String(coords.lng));
      query.set('radius_km', '50');
    }
    api.get(`/exhibitions?${query.toString()}`).then((r) => setList(r.data)).finally(() => setLoading(false));
  }, [status, industry, city, q, nearMe, coords]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const enableNearMe = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setCoords(CITY_COORDS.Bengaluru);
      setLocLabel('Bengaluru (demo)');
      setNearMe(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLabel('Your current location');
        setNearMe(true);
      },
      () => {
        setCoords(CITY_COORDS.Bengaluru);
        setLocLabel('Bengaluru (demo fallback)');
        setNearMe(true);
        setLocError('Location permission denied — showing Bengaluru as demo.');
      },
      { timeout: 8000 }
    );
  };

  const pickCityLocation = (c: string) => {
    if (!CITY_COORDS[c]) return;
    setCoords(CITY_COORDS[c]);
    setLocLabel(c === 'Bengaluru' ? 'Bengaluru' : `${c}, Bengaluru`);
    setNearMe(true);
    update('city', '');
  };

  return (
    <div className="container-px py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Discover Exhibitions</h1>
          <p className="text-sm text-slate-500">All shows are in Bengaluru — browse live, upcoming and past exhibitions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={enableNearMe} className={`btn ${nearMe ? 'btn-primary' : 'btn-outline'}`}>
            <MapPin width={16} /> Near Me
          </button>
          {nearMe && (
            <button onClick={() => { setNearMe(false); setCoords(null); }} className="btn-ghost text-sm">Clear location</button>
          )}
        </div>
      </div>

      {(nearMe || locError) && (
        <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {locError || `Showing exhibitions near ${locLabel}${list[0]?.distance_km != null ? ` · closest ${list[0].distance_km} km away` : ''}`}
        </div>
      )}

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Search width={18} className="text-slate-400" />
          <input defaultValue={q} onChange={(e) => update('q', e.target.value)} placeholder="Search exhibitions…" className="w-full py-2.5 text-sm outline-none" />
        </div>
        <select value={status} onChange={(e) => update('status', e.target.value)} className="input w-auto">
          <option value="">All Status</option><option value="live">Live Now</option><option value="upcoming">Upcoming</option><option value="past">Past</option>
        </select>
        <select value={industry} onChange={(e) => update('industry', e.target.value)} className="input w-auto">
          <option value="">All Industries</option>{filters.industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={city} onChange={(e) => update('city', e.target.value)} className="input w-auto">
          <option value="">All Cities</option>{filters.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 self-center">Bengaluru venues:</span>
        {Object.keys(CITY_COORDS).map((c) => (
          <button key={c} onClick={() => pickCityLocation(c)} className="chip border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700">{c}</button>
        ))}
      </div>

      {loading ? <Spinner /> : list.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center text-slate-500"><Grid width={40} className="mb-3 text-slate-300" />No exhibitions found.</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((e) => (
            <div key={e.id} className="relative">
              {e.distance_km != null && (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-brand-700 shadow-sm">
                  {e.distance_km} km
                </div>
              )}
              <ExhibitionCard e={e} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
