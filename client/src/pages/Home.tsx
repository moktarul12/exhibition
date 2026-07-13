import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Exhibition, Stats } from '../types';
import ExhibitionCard from '../components/ExhibitionCard';
import { Spinner, SectionHeading } from '../components/ui';
import { Search, Building, Users, Ticket, Grid, ArrowRight, Calendar, Star, MapPin, Zap, Layout, Eye, Sparkle, ChevronDown, Check } from '../components/icons';
import { useAuth } from '../auth';
import { useCity } from '../city';
import { StatusBadge } from '../components/ui';

const TABS = [
  { key: 'live', label: 'Live now' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
] as const;

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { city } = useCity();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const [stats, setStats] = useState<Stats | null>(null);
  const [all, setAll] = useState<Exhibition[]>([]);
  const [filters, setFilters] = useState<{ industries: string[]; cities: string[] }>({ industries: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');

  useEffect(() => {
    Promise.all([api.get('/stats'), api.get('/exhibitions'), api.get('/exhibitions/meta/filters')])
      .then(([s, e, f]) => { setStats(s.data); setAll(e.data); setFilters(f.data); })
      .finally(() => setLoading(false));
  }, []);

  const inCity = useMemo(() => all.filter((e) => e.city === city), [all, city]);
  const cityStats = useMemo(() => ({
    live: inCity.filter((e) => e.status === 'live').length,
    upcoming: inCity.filter((e) => e.status === 'upcoming').length,
    exhibitors: inCity.reduce((n, e) => n + (e.companies ?? 0), 0),
    stalls: inCity.reduce((n, e) => n + (e.total_stalls ?? 0), 0),
  }), [inCity]);
  const heroEvent = useMemo(
    () => inCity.find((e) => e.status === 'live') || inCity.find((e) => e.status === 'upcoming') || inCity[0],
    [inCity]
  );
  const visible = useMemo(() => inCity.filter((e) => e.status === tab), [inCity, tab]);
  const featured = inCity.filter((e) => e.tags?.includes('Trending') || e.tags?.includes('Most Booked')).slice(0, 3);

  const doSearch = () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (industry) p.set('industry', industry);
    if (city) p.set('city', city);
    navigate(`/exhibitions?${p.toString()}`);
  };

  if (loading) return <Spinner label="Loading exhibitions…" />;

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(180deg,#fff6f8 0%, #fdf0f3 45%, var(--paper) 100%)' }} />
        <div className="absolute -right-32 -top-24 -z-10 h-[26rem] w-[26rem] rounded-full opacity-50 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(233,55,101,0.30), transparent 70%)' }} />
        <div className="absolute -left-24 top-32 -z-10 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.30), transparent 70%)' }} />

        <div className="container-px relative grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="relative z-10 max-w-xl">
            <HeroCityPill />
            <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.05] text-ink-900 sm:text-5xl lg:text-[3.5rem]">
              {canBook ? <>Book your stall at the best <span className="text-brand-600">expos</span> in {city}.</>
                : <>Discover the biggest <span className="text-brand-600">exhibitions</span> in {city}.</>}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-500">
              {canBook
                ? `Browse live floor plans, pick your exact stall and book instantly at leading trade fairs in ${city} and beyond.`
                : `Explore live and upcoming trade fairs in ${city}, meet exhibitors, watch venue reels and plan your visit.`}
            </p>

            <div className="mt-7 flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-2 shadow-soft sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search width={18} className="shrink-0 text-ink-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder={`Search expos in ${city}…`} className="w-full bg-transparent py-2.5 text-sm text-ink-800 outline-none placeholder:text-ink-400" />
              </div>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-xl bg-ink-50 px-3 py-2.5 text-sm font-medium text-ink-700 outline-none sm:w-40">
                <option value="">All industries</option>
                {filters.industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <button onClick={doSearch} className="btn-primary shrink-0">Search</button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-ink-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-brand" /><b className="text-ink-900">{cityStats.live}</b> live in {city}</span>
              <span><b className="text-ink-900">{cityStats.upcoming}</b> upcoming</span>
              <span><b className="text-ink-900">{cityStats.stalls.toLocaleString('en-IN')}</b> stalls</span>
            </div>
          </div>

          {/* Visual — a real "happening now" event card for the selected city */}
          <div className="relative z-10">
            {heroEvent ? (
              <Link to={`/exhibitions/${heroEvent.slug}`} className="group block overflow-hidden rounded-4xl border border-ink-100 bg-white shadow-soft transition-transform hover:-translate-y-1">
                <div className="relative h-56 overflow-hidden sm:h-64">
                  <img src={heroEvent.banner} alt={heroEvent.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
                  <div className="absolute left-4 top-4"><StatusBadge status={heroEvent.status} /></div>
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{heroEvent.industry}</div>
                    <div className="font-display text-xl font-extrabold leading-tight">{heroEvent.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-white/85"><MapPin width={13} /> {heroEvent.venue}, {heroEvent.city}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex gap-5">
                    <div><div className="font-display text-lg font-extrabold text-emerald-600">{heroEvent.available_stalls ?? 0}</div><div className="text-[11px] text-ink-400">available</div></div>
                    <div><div className="font-display text-lg font-extrabold text-ink-900">{heroEvent.companies ?? 0}</div><div className="text-[11px] text-ink-400">exhibitors</div></div>
                    <div><div className="font-display text-lg font-extrabold text-ink-900">{formatFrom(heroEvent.price_from)}</div><div className="text-[11px] text-ink-400">from</div></div>
                  </div>
                  <span className="btn-primary !px-4">{canBook ? 'Book' : 'View'} <ArrowRight width={16} /></span>
                </div>
              </Link>
            ) : (
              <div className="grid h-72 place-items-center rounded-4xl border border-dashed border-ink-200 bg-white text-center text-ink-400">
                <div><Calendar width={36} className="mx-auto mb-2 text-ink-300" />No exhibitions in {city} yet.<br />Pick another city from the selector.</div>
              </div>
            )}
            <div className="absolute -bottom-4 -left-3 hidden items-center gap-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-soft sm:flex">
              <div className="flex items-center gap-0.5 text-amber-400">{[0, 1, 2, 3, 4].map((i) => <Star key={i} width={13} style={{ fill: '#fbbf24' }} />)}</div>
              <div className="text-xs"><b className="text-ink-900">4.9/5</b> <span className="text-ink-400">exhibitor rating</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Stats band ---------------- */}
      {stats && (
        <section className="container-px relative z-20 mt-4">
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-soft md:grid-cols-3 lg:grid-cols-6">
            <MiniStat icon={<Ticket width={18} />} value={stats.live} label="Live expos" accent="bg-brand-50 text-brand-600" />
            <MiniStat icon={<Calendar width={18} />} value={stats.upcoming} label="Upcoming" accent="bg-amber-50 text-amber-600" />
            <MiniStat icon={<Building width={18} />} value={stats.companies} label="Exhibitors" accent="bg-indigo-50 text-indigo-600" />
            <MiniStat icon={<Users width={18} />} value={stats.organizers} label="Organizers" accent="bg-sky-50 text-sky-600" />
            <MiniStat icon={<Users width={18} />} value={`${(stats.visitors / 1000).toFixed(0)}K+`} label="Visitors" accent="bg-emerald-50 text-emerald-600" />
            <MiniStat icon={<Grid width={18} />} value={stats.bookings} label="Bookings" accent="bg-purple-50 text-purple-600" />
          </div>
        </section>
      )}

      {/* ---------------- Featured ---------------- */}
      {featured.length > 0 && (
        <section className="container-px mt-16">
          <SectionHeading eyebrow="Handpicked" title={`Featured in ${city}`} subtitle={`The most talked-about exhibitions happening in ${city} right now.`}
            action={<Link to={`/exhibitions?city=${encodeURIComponent(city)}`} className="btn-outline">View all <ArrowRight width={16} /></Link>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {/* ---------------- Browse by status ---------------- */}
      <section className="container-px mt-16">
        <SectionHeading eyebrow="What's on" title={`Browse exhibitions in ${city}`}
          action={
            <div className="inline-flex rounded-full border border-ink-200 bg-white p-1">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? 'bg-brand text-white' : 'text-ink-600 hover:bg-ink-50'}`}>{t.label}</button>
              ))}
            </div>
          } />
        {visible.length === 0 ? (
          <div className="card grid place-items-center py-16 text-center text-ink-500"><Grid width={40} className="mb-3 text-ink-300" />No {tab} exhibitions in {city} right now. Try another city or <Link to="/exhibitions" className="ml-1 link-brand">browse all</Link>.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.slice(0, 8).map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to={`/exhibitions?status=${tab}&city=${encodeURIComponent(city)}`} className="btn-outline">See all {tab} exhibitions in {city} <ArrowRight width={16} /></Link>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="container-px mt-20">
        <div className="relative overflow-hidden rounded-4xl bg-ink-950 p-8 text-white lg:p-14">
          <div className="mesh absolute inset-0 opacity-70" />
          <div className="relative">
            <div className="eyebrow mb-3 text-brand-300">Why Expo Mela</div>
            <h2 className="max-w-2xl font-display text-3xl font-extrabold lg:text-4xl">A BookMyShow-style experience for exhibitions</h2>
            <p className="mt-3 max-w-xl text-ink-300">Everything you need to discover expos and book stalls in real time — across India's top cities.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: <Zap width={22} />, t: 'Live availability', d: 'Stall colours update instantly as bookings happen.' },
                { icon: <Layout width={22} />, t: 'Interactive floor plans', d: 'Pick your exact stall visually, hall by hall.' },
                { icon: <Eye width={22} />, t: 'Venue reels & maps', d: 'Watch YouTube reels and see the venue on Google Maps.' },
                { icon: <Sparkle width={22} />, t: 'Instant booking', d: 'Confirm your stall in seconds with instant confirmation.' },
              ].map((f) => (
                <div key={f.t} className="glass rounded-3xl p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white">{f.icon}</div>
                  <div className="mt-4 font-display text-lg font-bold">{f.t}</div>
                  <div className="mt-1.5 text-sm text-ink-300">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-px mt-16">
        <div className="flex flex-col items-center gap-5 rounded-4xl border border-brand-100 bg-brand-50 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm"><MapPin width={26} /></div>
          <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Ready to exhibit in {city}?</h2>
          <p className="max-w-lg text-ink-500">Create a free account, explore live floor plans and secure your stall at {city}'s leading trade fairs.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {!user && <Link to="/register" className="btn-primary">Create free account</Link>}
            <Link to="/exhibitions" className="btn-dark">Browse exhibitions <ArrowRight width={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ icon, value, label, accent }: { icon: React.ReactNode; value: React.ReactNode; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2.5">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <div className="font-display text-xl font-extrabold text-ink-900">{value}</div>
        <div className="truncate text-[11px] font-medium text-ink-400">{label}</div>
      </div>
    </div>
  );
}

function formatFrom(n: number) {
  if (!n) return '—';
  return n >= 1000 ? `₹${Math.round(n / 1000)}K` : `₹${n}`;
}

function HeroCityPill() {
  const { city, cities, setCity, detect, detecting } = useCity();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-800 shadow-sm hover:border-brand-300">
        <MapPin width={15} className="text-brand-600" /> {detecting ? 'Detecting…' : city}
        <ChevronDown width={15} className="text-ink-400" />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft" onMouseLeave={() => setOpen(false)}>
          <div className="border-b border-ink-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Choose city</div>
          <div className="max-h-64 overflow-y-auto py-1">
            {cities.map((c) => (
              <button key={c} onClick={() => { setCity(c); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-ink-50 ${c === city ? 'font-semibold text-brand-700' : 'text-ink-700'}`}>
                {c}{c === city && <Check width={16} />}
              </button>
            ))}
          </div>
          <button onClick={() => { detect(); setOpen(false); }} className="flex w-full items-center gap-2 border-t border-ink-100 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50">
            <MapPin width={16} /> Detect my location
          </button>
        </div>
      )}
    </div>
  );
}
