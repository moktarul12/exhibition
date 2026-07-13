import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Exhibition, Stats } from '../types';
import ExhibitionCard from '../components/ExhibitionCard';
import { Stat, Spinner } from '../components/ui';
import { Search, Building, Users, Ticket, Grid, ArrowRight, Trending, Calendar, Star, ChevronDown, Phone } from '../components/icons';
import { useAuth } from '../auth';

const TABS = [
  { key: 'live', label: 'Live Now' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past Exhibitions' },
] as const;

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const [stats, setStats] = useState<Stats | null>(null);
  const [all, setAll] = useState<Exhibition[]>([]);
  const [filters, setFilters] = useState<{ industries: string[]; cities: string[] }>({ industries: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/stats'),
      api.get('/exhibitions'),
      api.get('/exhibitions/meta/filters'),
    ]).then(([s, e, f]) => {
      setStats(s.data); setAll(e.data); setFilters(f.data);
    }).finally(() => setLoading(false));
  }, []);

  const chips = ['Trending', 'B2B', 'International', 'Government', 'Free Entry', 'Early Bird'];
  const toggleChip = (c: string) => setActiveChips((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const visible = useMemo(() => {
    return all.filter((e) => {
      if (e.status !== tab) return false;
      if (industry && e.industry !== industry) return false;
      if (city && e.city !== city) return false;
      if (q && !`${e.name} ${e.industry} ${e.venue} ${e.city}`.toLowerCase().includes(q.toLowerCase())) return false;
      for (const c of activeChips) {
        if (c === 'Trending' && !e.tags.includes('Trending')) return false;
        if (c === 'B2B' && !e.b2b) return false;
        if (c === 'International' && !e.international) return false;
        if (c === 'Government' && !e.government) return false;
        if (c === 'Free Entry' && !e.entry_free) return false;
        if (c === 'Early Bird' && !e.early_bird) return false;
      }
      return true;
    });
  }, [all, tab, industry, city, q, activeChips]);

  const featured = all.filter((e) => e.tags?.includes('Trending') || e.tags?.includes('Most Booked')).slice(0, 3);

  const doSearch = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (industry) params.set('industry', industry);
    if (city) params.set('city', city);
    navigate(`/exhibitions?${params.toString()}`);
  };

  if (loading) return <Spinner label="Loading exhibitions…" />;

  return (
    <div className="overflow-hidden bg-white">
      {/* Hero banner — 100% match ux.png */}
      <section className="relative bg-white">
        <div className="container-px relative grid items-center gap-6 pt-8 pb-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-12 lg:pb-16">
          {/* Left copy */}
          <div className="relative z-10 max-w-[560px]">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: 'var(--brand-soft)', borderColor: 'var(--brand-ring)', color: 'var(--brand)' }}
            >
              <Star width={13} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
              India's #1 Stall Booking Platform
            </span>
            <h1 className="mt-5 text-[2.4rem] font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-[2.85rem] lg:text-[3.25rem]">
              {canBook ? <>Discover. Book. Exhibit.<br /><span style={{ color: 'var(--brand)' }}>Grow Your Business.</span></> : <>Discover Exhibitions.<br /><span style={{ color: 'var(--brand)' }}>Meet Exhibitors.</span></>}
            </h1>
            <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-slate-500">
              {canBook
                ? 'Find, book and manage your perfect stall at leading trade fairs and exhibitions in Bengaluru – with live floor plans and instant booking.'
                : 'Explore live and upcoming trade fairs in Bengaluru, browse exhibitor profiles, and plan your visit — no booking required.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/exhibitions?status=live" className="btn-primary h-11 px-6 text-[15px]">
                {canBook ? <>Book a Stall <ArrowRight width={18} /></> : <>Discover Live Expos <ArrowRight width={18} /></>}
              </Link>
              <Link to="/exhibitions" className="btn-outline h-11 px-6 text-[15px]">
                Explore Exhibitions
              </Link>
            </div>
          </div>

          {/* Right visual — real exhibition / stall composition */}
          <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none lg:justify-self-end">
            {/* Soft pink circles + dots (design backdrop) */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[115%] w-[115%] -translate-x-1/2 -translate-y-1/2">
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(252,232,239,0.9) 0%, rgba(252,232,239,0.25) 48%, transparent 72%)' }} />
              <div className="absolute inset-[12%] rounded-full border-[36px]" style={{ borderColor: 'rgba(247,201,214,0.5)' }} />
              <div className="absolute inset-[28%] rounded-full border-[28px]" style={{ borderColor: 'rgba(247,201,214,0.35)' }} />
            </div>
            <div
              className="pointer-events-none absolute right-2 top-2 z-0 h-28 w-28 opacity-35"
              style={{ backgroundImage: 'radial-gradient(#9ca3af 1.3px, transparent 1.3px)', backgroundSize: '10px 10px' }}
            />

            {/* Main: busy exhibition hall */}
            <div className="relative z-10 overflow-hidden rounded-3xl shadow-soft ring-1 ring-black/5">
              <img
                src="/hero-expo-hall.png"
                alt="Live exhibition hall with stalls"
                className="h-[300px] w-full object-cover sm:h-[340px] lg:h-[380px]"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#a30d3a]/25 via-transparent to-transparent" />
              <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#a30d3a] shadow-sm">
                Live Exhibition
              </div>
            </div>

            {/* Floating: real stall booth photo */}
            <div className="absolute -bottom-2 left-3 z-20 w-[46%] overflow-hidden rounded-2xl border-4 border-white shadow-soft sm:left-4 sm:w-[42%]">
              <img
                src="/hero-stall-booth.png"
                alt="Premium exhibition stall"
                className="h-28 w-full object-cover sm:h-32"
              />
              <div className="bg-white px-2.5 py-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#a30d3a]">Premium Stall</div>
                <div className="text-xs font-bold text-slate-800">Book your spot</div>
              </div>
            </div>

            {/* Need Help card */}
            <div className="absolute -bottom-1 right-2 z-20 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-soft sm:right-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}>
                <Phone width={16} />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-bold text-slate-900">Need Help?</div>
                <div className="text-[11px] text-slate-500">Talk to our expert</div>
                <div className="text-sm font-bold" style={{ color: 'var(--brand)' }}>+91 98765 43210</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating search bar */}
        <div className="container-px relative z-20 -mb-5">
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-soft sm:flex-row sm:items-center sm:gap-0 sm:p-1.5 sm:pl-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 sm:py-0">
              <Search width={18} className="shrink-0 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder="Search exhibitions, industry, venue..."
                className="w-full bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="relative px-2">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full appearance-none bg-transparent py-2.5 pr-7 text-sm font-medium text-slate-700 outline-none sm:w-40"
              >
                <option value="">All Industries</option>
                {filters.industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <ChevronDown width={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="relative px-2">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full appearance-none bg-transparent py-2.5 pr-7 text-sm font-medium text-slate-700 outline-none sm:w-36"
              >
                <option value="">All Cities</option>
                {filters.cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown width={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button onClick={doSearch} className="btn-primary h-11 shrink-0 px-6 sm:ml-1">
              <Search width={16} /> Search
            </button>
          </div>
        </div>
      </section>

      <div className="container-px mt-12 relative z-10">
        {/* Quick stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat icon={<Ticket width={20} />} label="Live Exhibitions" value={stats.live} accent="bg-red-50 text-red-600" />
            <Stat icon={<Calendar width={20} />} label="Upcoming" value={stats.upcoming} accent="bg-amber-50 text-amber-600" />
            <Stat icon={<Building width={20} />} label="Companies" value={stats.companies} />
            <Stat icon={<Users width={20} />} label="Organizers" value={stats.organizers} accent="bg-indigo-50 text-indigo-600" />
            <Stat icon={<Users width={20} />} label="Total Visitors" value={`${(stats.visitors / 1000).toFixed(0)}K+`} accent="bg-emerald-50 text-emerald-600" />
            <Stat icon={<Grid width={20} />} label="Bookings" value={stats.bookings} accent="bg-purple-50 text-purple-600" />
          </div>
        )}
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-px mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Trending width={20} className="text-brand-600" />
            <h2 className="text-xl font-bold text-slate-900">Featured & Trending</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {/* Tabs + Filters */}
      <section className="container-px mt-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-500">{visible.length} exhibition{visible.length !== 1 && 's'}</div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c} onClick={() => toggleChip(c)}
              className={`chip ${activeChips.includes(c) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
              {c}
            </button>
          ))}
          {(activeChips.length > 0 || industry || city || q) && (
            <button onClick={() => { setActiveChips([]); setIndustry(''); setCity(''); setQ(''); }} className="chip border-transparent text-slate-400 hover:text-slate-600">Clear all</button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="card grid place-items-center py-16 text-center text-slate-500">
            <Grid width={40} className="mb-3 text-slate-300" />
            No exhibitions match your filters.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        )}
      </section>

      {/* Unique features */}
      <section className="container-px mt-16">
        <div className="rounded-3xl bg-slate-900 p-8 text-white lg:p-12">
          <h2 className="text-2xl font-bold">Why exhibitors love ExpoHub</h2>
          <p className="mt-2 max-w-xl text-slate-300">A powerful, BookMyShow-style experience for exhibitions — with real-time stall booking built in.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: 'Live Stall Availability', d: 'Stall colors update instantly as bookings happen.' },
              { t: 'Interactive Floor Plans', d: 'Pick your exact stall visually, hall by hall.' },
              { t: 'Compare Exhibitions', d: 'Visitors, exhibitors, industries & pricing side by side.' },
              { t: 'Watch & Get Notified', d: 'Be alerted the moment bookings open.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl bg-white/5 p-5">
                <div className="text-base font-bold">{f.t}</div>
                <div className="mt-1.5 text-sm text-slate-300">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
