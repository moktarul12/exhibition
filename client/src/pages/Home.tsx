import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Exhibition, Stats } from '../types';
import ExhibitionCard from '../components/ExhibitionCard';
import { Spinner, SectionHeading } from '../components/ui';
import { Search, Building, Users, Ticket, Grid, ArrowRight, Calendar, Star, MapPin, Zap, Layout, Eye, Sparkle } from '../components/icons';
import { useAuth } from '../auth';

const TABS = [
  { key: 'live', label: 'Live now' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
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

  useEffect(() => {
    Promise.all([api.get('/stats'), api.get('/exhibitions'), api.get('/exhibitions/meta/filters')])
      .then(([s, e, f]) => { setStats(s.data); setAll(e.data); setFilters(f.data); })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => all.filter((e) => e.status === tab), [all, tab]);
  const featured = all.filter((e) => e.tags?.includes('Trending') || e.tags?.includes('Most Booked')).slice(0, 3);

  const doSearch = () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (industry) p.set('industry', industry);
    navigate(`/exhibitions?${p.toString()}`);
  };

  if (loading) return <Spinner label="Loading exhibitions…" />;

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="mesh absolute inset-0 opacity-90" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="container-px relative grid items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="relative z-10 max-w-xl">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white">
              <Star width={13} style={{ color: '#fbbf24', fill: '#fbbf24' }} /> Bengaluru's #1 stall booking platform
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
              {canBook ? <>Book your stall at<br />Bengaluru's best <span className="text-brand-300">expos.</span></> : <>Discover Bengaluru's<br />biggest <span className="text-brand-300">exhibitions.</span></>}
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-300">
              {canBook
                ? 'Browse live floor plans, pick your exact stall and book instantly at leading trade fairs across Bengaluru.'
                : 'Explore live and upcoming trade fairs across Bengaluru, meet exhibitors, watch venue reels and plan your visit.'}
            </p>

            {/* Search */}
            <div className="mt-7 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-soft sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search width={18} className="shrink-0 text-ink-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="Search exhibitions, industry, venue…" className="w-full bg-transparent py-2.5 text-sm text-ink-800 outline-none placeholder:text-ink-400" />
              </div>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-xl bg-ink-50 px-3 py-2.5 text-sm font-medium text-ink-700 outline-none sm:w-40">
                <option value="">All industries</option>
                {filters.industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <button onClick={doSearch} className="btn-primary shrink-0">Search</button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-300">
              {stats && <><b className="text-white">{stats.live}</b> live now</>}
              {stats && <span className="flex items-center gap-1.5"><b className="text-white">{stats.companies}</b> exhibitors</span>}
              {stats && <span className="flex items-center gap-1.5"><b className="text-white">{(stats.visitors / 1000).toFixed(0)}K+</b> visitors</span>}
            </div>
          </div>

          {/* Visual */}
          <div className="relative z-10 hidden lg:block">
            <div className="relative mx-auto max-w-md">
              <div className="overflow-hidden rounded-4xl border border-white/10 shadow-2xl">
                <img src="/hero-expo-hall.png" alt="Exhibition hall in Bengaluru" className="h-[400px] w-full object-cover" />
              </div>
              <div className="absolute -left-6 top-10 w-44 animate-floaty overflow-hidden rounded-2xl border-4 border-white/90 shadow-2xl">
                <img src="/hero-stall-booth.png" alt="Premium stall" className="h-28 w-full object-cover" />
                <div className="bg-white px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Premium stall</div>
                  <div className="text-xs font-bold text-ink-900">From ₹45,000</div>
                </div>
              </div>
              <div className="absolute -right-4 bottom-8 glass rounded-2xl px-4 py-3 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live availability</div>
                <div className="mt-1 font-display text-2xl font-extrabold">1,804 stalls</div>
                <div className="text-[11px] text-ink-300">across all Bengaluru halls</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Stats band ---------------- */}
      {stats && (
        <section className="container-px -mt-10 relative z-20">
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
          <SectionHeading eyebrow="Handpicked" title="Featured & trending" subtitle="The most talked-about exhibitions happening in Bengaluru right now."
            action={<Link to="/exhibitions" className="btn-outline">View all <ArrowRight width={16} /></Link>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {/* ---------------- Browse by status ---------------- */}
      <section className="container-px mt-16">
        <SectionHeading eyebrow="What's on" title="Browse exhibitions"
          action={
            <div className="inline-flex rounded-full border border-ink-200 bg-white p-1">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? 'bg-brand text-white' : 'text-ink-600 hover:bg-ink-50'}`}>{t.label}</button>
              ))}
            </div>
          } />
        {visible.length === 0 ? (
          <div className="card grid place-items-center py-16 text-center text-ink-500"><Grid width={40} className="mb-3 text-ink-300" />No {tab} exhibitions right now.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.slice(0, 8).map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to={`/exhibitions?status=${tab}`} className="btn-outline">See all {tab} exhibitions <ArrowRight width={16} /></Link>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="container-px mt-20">
        <div className="relative overflow-hidden rounded-4xl bg-ink-950 p-8 text-white lg:p-14">
          <div className="mesh absolute inset-0 opacity-70" />
          <div className="relative">
            <div className="eyebrow mb-3 text-brand-300">Why ExpoHub</div>
            <h2 className="max-w-2xl font-display text-3xl font-extrabold lg:text-4xl">A BookMyShow-style experience for exhibitions</h2>
            <p className="mt-3 max-w-xl text-ink-300">Everything you need to discover expos and book stalls in real time — all in Bengaluru.</p>
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
          <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Ready to exhibit in Bengaluru?</h2>
          <p className="max-w-lg text-ink-500">Create a free account, explore live floor plans and secure your stall at the city's leading trade fairs.</p>
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
