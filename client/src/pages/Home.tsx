import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatINR, formatDateShort } from '../api';
import type { Exhibition, Stats } from '../types';
import { Spinner, SectionHeading } from '../components/ui';
import ExhibitionCard from '../components/ExhibitionCard';
import {
  Search, MapPin, Calendar, Users, Building, Ticket, Grid, ArrowRight, ChevronRight,
  Eye, Trending, Shield, Headset, Zap, Layout, Cog, Chip, Cup, Heart, Crane, Car, Bookmark,
  Star,
} from '../components/icons';
import { useAuth } from '../auth';
import { useCity } from '../city';





const INDUSTRIES = [
  { name: 'Industrial', icon: Cog, events: '125+ Events', bg: 'bg-brand-50 text-brand-600', q: 'Industrial Automation' },
  { name: 'Technology', icon: Chip, events: '98+ Events', bg: 'bg-grape-100 text-grape-600', q: 'Home Automation' },
  { name: 'Food & Beverages', icon: Cup, events: '87+ Events', bg: 'bg-amber-100 text-amber-600', q: 'Food & Beverage' },
  { name: 'Healthcare', icon: Heart, events: '75+ Events', bg: 'bg-emerald-100 text-emerald-600', q: 'Medical Equipment' },
  { name: 'Building & Construction', icon: Crane, events: '63+ Events', bg: 'bg-sky-100 text-sky-600', q: '' },
  { name: 'Automotive', icon: Car, events: '52+ Events', bg: 'bg-indigo-100 text-indigo-600', q: 'Automotive' },
  { name: 'More', icon: Grid, events: 'View All', bg: 'bg-ink-100 text-ink-500', q: '' },
];

const WHY = [
  { icon: Layout, title: 'Interactive Floor Plans', desc: 'Pick your perfect stall with ease', bg: 'bg-brand-50 text-brand-600' },
  { icon: Zap, title: 'Live Availability', desc: 'Real-time stall status at your fingertips', bg: 'bg-grape-100 text-grape-600' },
  { icon: Shield, title: 'Secure Payments', desc: '100% safe & transparent transactions', bg: 'bg-emerald-50 text-emerald-600' },
  { icon: Headset, title: 'Dedicated Support', desc: "We're here to help you succeed", bg: 'bg-amber-50 text-amber-600' },
];

const POPULAR = [
  { label: 'Bangalore', city: 'Bengaluru' },
  { label: 'Mumbai', city: 'Mumbai' },
  { label: 'Delhi', city: 'New Delhi' },
  { label: 'Chennai', city: 'Chennai' },
  { label: 'Hyderabad', city: 'Hyderabad' },
  { label: 'Pune', city: 'Pune' },
];

const TABS = [
  { key: 'live' as const, label: 'Live now' },
  { key: 'upcoming' as const, label: 'Upcoming' },
  { key: 'past' as const, label: 'Past' },
];

const BADGE_STYLES: Record<string, string> = {
  Featured: 'bg-brand-600 text-white',
  Trending: 'bg-emerald-500 text-white',
  Live: 'bg-brand-600 text-white',
  'New Launch': 'bg-grape-600 text-white',
  Recommended: 'bg-amber-500 text-white',
  'Most Booked': 'bg-brand-600 text-white',
  'Free Entry': 'bg-sky-500 text-white',
  Upcoming: 'bg-grape-600 text-white',
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { city, setCity } = useCity();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const [stats, setStats] = useState<Stats | null>(null);
  const [all, setAll] = useState<Exhibition[]>([]);
  const [filters, setFilters] = useState<{ industries: string[]; cities: string[] }>({ industries: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'live' | 'upcoming' | 'past'>('live');

  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [date, setDate] = useState('');
  const [industry, setIndustry] = useState('');

  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.get('/stats'), api.get('/exhibitions'), api.get('/exhibitions/meta/filters')])
      .then(([s, e, f]) => { setStats(s.data); setAll(e.data); setFilters(f.data); })
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => {
    const flagged = all.filter((e) => e.tags?.some((t) => ['Trending', 'Most Booked', 'Recommended', 'New Launch'].includes(t)));
    return (flagged.length >= 4 ? flagged : all).slice(0, 8);
  }, [all]);

  const inCity = useMemo(() => all.filter((e) => e.city === city), [all, city]);
  const cityStats = useMemo(() => ({
    live: inCity.filter((e) => e.status === 'live').length,
    upcoming: inCity.filter((e) => e.status === 'upcoming').length,
    stalls: inCity.reduce((n, e) => n + (e.total_stalls ?? 0), 0),
  }), [inCity]);
  const visible = useMemo(() => inCity.filter((e) => e.status === tab), [inCity, tab]);
  const featuredInCity = useMemo(
    () => inCity.filter((e) => e.tags?.some((t) => ['Trending', 'Most Booked', 'Recommended'].includes(t))).slice(0, 3),
    [inCity],
  );
  const heroEvent = useMemo(
    () => inCity.find((e) => e.status === 'live') || inCity.find((e) => e.status === 'upcoming') || inCity[0],
    [inCity],
  );

  const doSearch = () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (loc) p.set('city', loc);
    if (industry) p.set('industry', industry);
    navigate(`/exhibitions?${p.toString()}`);
  };

  if (loading) return <Spinner label="Loading exhibitions…" />;

  return (
    <div className="overflow-x-hidden">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* Soft pink hero background */}
        <div className="absolute inset-0 -z-20" style={{ background: 'linear-gradient(180deg,#fdf2f8 0%, #f5f3ff 55%, #ffffff 100%)' }} />

        <div className="container-px relative z-10 grid items-center gap-10 pb-16 pt-10 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-14">
          {/* Left — city-aware copy + inline search */}
          <div className="max-w-xl">
            <h1 className="font-display text-[2.45rem] font-extrabold leading-[1.1] text-ink-900 sm:text-5xl lg:text-[3.2rem]">
              {canBook ? (
                <>Book your stall at the best <span className="text-grad">expos</span> in {city}.</>
              ) : (
                <>Discover the biggest <span className="text-grad">exhibitions</span> in {city}.</>
              )}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-500 sm:text-[17px]">
              {canBook
                ? `Browse live floor plans, pick your exact stall and book instantly at leading trade fairs in ${city}.`
                : `Explore live and upcoming trade fairs in ${city}, meet exhibitors, watch venue reels and plan your visit.`}
            </p>

            {/* Inline search */}
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

            {/* Live city stats */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-brand" /><b className="text-ink-900">{cityStats.live}</b> live in {city}</span>
              <span><b className="text-ink-900">{cityStats.upcoming}</b> upcoming</span>
              <span><b className="text-ink-900">{cityStats.stalls.toLocaleString('en-IN')}</b> stalls</span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/exhibitions" className="btn-primary px-6 py-3 text-[15px]">Explore Exhibitions <ArrowRight width={17} /></Link>
              <Link to="/register" className="btn-outline px-6 py-3 text-[15px]"><Ticket width={17} /> List Your Event</Link>
            </div>
          </div>

          {/* Right — layered exhibition collage */}
          <HeroVisual heroEvent={heroEvent} secondary={inCity.filter((e) => e.id !== heroEvent?.id).slice(0, 2)} cityStats={cityStats} />
        </div>

        {/* Bottom curve — soft arc into white (ux.png section transition) */}
        <svg className="pointer-events-none absolute bottom-0 left-0 -z-10 w-full text-white" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden>
          <path fill="currentColor" d="M0,52 C360,92 720,28 1080,52 C1260,64 1380,72 1440,68 L1440,90 L0,90 Z" />
        </svg>
      </section>

      {/* ---------------- Search card (ux floating bar) ---------------- */}
      <div className="container-px relative z-20 -mt-6 lg:-mt-10">
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="mb-3 text-sm font-semibold text-ink-700">Search exhibitions, industry or keyword</div>
            <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
              <label className="flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-100">
                <Search width={18} className="shrink-0 text-ink-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="e.g. Electronics, Machinery, Food…" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink-400" />
              </label>
              <SelectField icon={<MapPin width={17} className="text-ink-400" />} value={loc} onChange={setLoc}>
                <option value="">All Cities</option>
                {filters.cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectField>
              <label className="flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-100">
                <Calendar width={17} className="shrink-0 text-ink-400" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent py-3 text-sm text-ink-600 outline-none" />
              </label>
              <SelectField icon={<Grid width={17} className="text-ink-400" />} value={industry} onChange={setIndustry}>
                <option value="">All Industries</option>
                {filters.industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </SelectField>
              <button onClick={doSearch} className="btn-primary px-6 py-3">Search Now</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-400">Popular searches:</span>
              {POPULAR.map((p) => (
                <button key={p.label} onClick={() => { setCity(p.city); navigate(`/exhibitions?city=${encodeURIComponent(p.city)}`); }}
                  className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-700">{p.label}</button>
              ))}
            </div>
          </div>
        </div>


      {/* ---------------- Live stats band ---------------- */}
      {stats && (
        <section className="container-px mt-10">
          <div className="grid gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
            <StatPill label="Live expos" value={stats.live} accent="text-emerald-600" />
            <StatPill label="Upcoming" value={stats.upcoming} accent="text-brand-600" />
            <StatPill label="Exhibitors" value={stats.companies.toLocaleString('en-IN')} accent="text-grape-600" />
            <StatPill label="Bookings" value={stats.bookings.toLocaleString('en-IN')} accent="text-sky-600" />
          </div>
        </section>
      )}

      {/* ---------------- Browse exhibitions in city ---------------- */}
      <section className="container-px mt-16">
        <SectionHeading
          title={`Browse exhibitions in ${city}`}
          subtitle={canBook ? 'Pick a live expo and book your stall in minutes.' : 'Explore live, upcoming and past trade fairs near you.'}
        />
        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? 'bg-brand-600 text-white shadow-soft' : 'bg-ink-50 text-ink-600 hover:bg-brand-50 hover:text-brand-700'}`}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-80">
                ({t.key === 'live' ? cityStats.live : t.key === 'upcoming' ? cityStats.upcoming : inCity.filter((e) => e.status === 'past').length})
              </span>
            </button>
          ))}
        </div>
        {visible.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-6 py-12 text-center">
            <p className="font-display text-lg font-bold text-ink-800">No {tab === 'live' ? 'live' : tab} exhibitions in {city} right now</p>
            <p className="mt-2 text-sm text-ink-500">Try another tab or switch city from the navbar.</p>
            <Link to="/exhibitions" className="btn-primary mt-5 inline-flex px-5 py-2.5">Browse all exhibitions</Link>
          </div>
        )}
        {visible.length > 0 && (
          <div className="mt-8 text-center">
            <Link to={`/exhibitions?city=${encodeURIComponent(city)}&status=${tab}`} className="link-brand inline-flex items-center gap-1 text-sm font-semibold">
              View all {tab} in {city} <ArrowRight width={15} />
            </Link>
          </div>
        )}
      </section>

      {/* ---------------- Featured in city ---------------- */}
      {featuredInCity.length > 0 && (
        <section className="container-px mt-16">
          <SectionHeading title={`Featured in ${city}`} subtitle="Hand-picked expos trending with exhibitors and visitors." />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredInCity.map((e) => <ExhibitionCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {/* ---------------- Browse by Industry ---------------- */}
      <section className="container-px mt-16">
        <div className="mb-8">
          <h2 className="inline-block font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Browse by Industry</h2>
          <div className="mt-2 h-1 w-12 rounded-full bg-grad" />
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {INDUSTRIES.map((ind) => (
            <button key={ind.name} onClick={() => navigate(ind.q ? `/exhibitions?industry=${encodeURIComponent(ind.q)}` : '/exhibitions')}
              className="group flex flex-col items-center gap-2.5 rounded-2xl p-3 text-center transition-colors hover:bg-ink-50">
              <span className={`grid h-16 w-16 place-items-center rounded-full ${ind.bg} transition-transform group-hover:scale-105`}><ind.icon width={26} /></span>
              <span className="text-sm font-bold text-ink-800">{ind.name}</span>
              <span className="text-[11px] font-medium text-ink-400">{ind.events}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- Featured Exhibitions ---------------- */}
      <section className="container-px mt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Featured Exhibitions</h2>
          <Link to="/exhibitions" className="link-brand inline-flex items-center gap-1 text-sm">View all exhibitions <ArrowRight width={15} /></Link>
        </div>
        <div className="relative">
          <div ref={railRef} className="no-scrollbar flex snap-x gap-5 overflow-x-auto pb-2">
            {featured.map((e) => <FeaturedCard key={e.id} e={e} />)}
          </div>
          <button onClick={() => railRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
            className="absolute -right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-ink-100 bg-white text-ink-700 shadow-soft hover:text-brand-600 lg:grid">
            <ChevronRight width={20} />
          </button>
        </div>
      </section>

      {/* ---------------- Why Choose ---------------- */}
      <section className="container-px mt-16">
        <div className="grid gap-8 rounded-3xl bg-ink-50 p-8 lg:grid-cols-[1fr_2.2fr] lg:items-center lg:p-10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Why Choose Expo Mela?</h2>
            <p className="mt-3 text-ink-500">We make exhibition booking simple, transparent and hassle-free.</p>
            <Link to="/register" className="btn-primary mt-5 px-5 py-2.5">Learn More <ArrowRight width={16} /></Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div key={w.title}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${w.bg}`}><w.icon width={22} /></span>
                <div className="mt-3.5 font-display text-base font-bold text-ink-900">{w.title}</div>
                <p className="mt-1 text-sm text-ink-500">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-px mt-16 mb-4">
        <div className="relative overflow-hidden rounded-3xl px-8 py-10 lg:px-12" style={{ backgroundImage: 'var(--grad)' }}>
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <img src="/hero-booth.png" alt="Exhibition stall" className="mx-auto max-h-56 w-auto drop-shadow-2xl" />
            <div className="text-white">
              <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">Exhibit your brand.<br />Expand your reach.</h2>
              <p className="mt-3 max-w-lg text-white/85">Join thousands of brands that trust Expo Mela to connect, showcase and grow their business.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/register" className="btn bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-white/90">List Your Event</Link>
                <a href="#" className="btn border-2 border-white/70 px-6 py-3 font-semibold text-white hover:bg-white/10">Talk to Our Expert</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const HERO_SLIDES = [
  {
    src: '/hero-expo-hall.png',
    alt: 'Live exhibition hall with stalls',
    label: 'Live Exhibition',
    caption: 'Explore floor plans',
    fit: 'object-cover' as const,
  },
  {
    src: '/hero-stall-booth.png',
    alt: 'Premium exhibition stall',
    label: 'Premium Stall',
    caption: 'Book your spot',
    fit: 'object-cover' as const,
  },
  {
    src: '/hero-booth.png',
    alt: 'ExpoMela exhibition booth',
    label: 'ExpoMela',
    caption: 'Showcase your brand',
    fit: 'object-contain bg-white' as const,
  },
];

function HeroVisual({
  heroEvent,
  secondary,
  cityStats,
}: {
  heroEvent?: Exhibition;
  secondary: Exhibition[];
  cityStats: { live: number; upcoming: number; stalls: number };
}) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((i) => (i + 1) % HERO_SLIDES.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <div className="relative mx-auto w-full max-w-[560px] pb-14 lg:max-w-none lg:justify-self-end lg:pb-10">
      {/* Soft concentric rings */}
      <div className="pointer-events-none absolute left-1/2 top-[46%] z-0 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(252,232,239,0.95) 0%, rgba(243,232,255,0.35) 45%, transparent 70%)' }} />
        <div className="absolute inset-[10%] rounded-full border-[32px] border-brand-100/60" />
        <div className="absolute inset-[26%] rounded-full border-[24px] border-grape-100/50" />
      </div>
      <div
        className="pointer-events-none absolute right-1 top-4 z-0 h-24 w-24 opacity-40"
        style={{ backgroundImage: 'radial-gradient(#9ca3af 1.2px, transparent 1.2px)', backgroundSize: '9px 9px' }}
      />

      {/* Main hero carousel — hall → premium stall → ExpoMela */}
      <div className="relative z-10 overflow-hidden rounded-[1.75rem] shadow-soft ring-1 ring-black/5">
        <div className="relative h-[280px] sm:h-[340px] lg:h-[400px]">
          {HERO_SLIDES.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.alt}
              className={`absolute inset-0 h-full w-full transition-all duration-700 ease-out ${s.fit} ${
                i === slide ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
              }`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-700/30 via-transparent to-grape-600/10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 via-ink-950/20 to-transparent p-4 sm:p-5">
          {slide === 0 && heroEvent ? (
            <Link to={`/exhibitions/${heroEvent.slug}`} className="group block">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 shadow-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                {heroEvent.status === 'live' ? 'Live now' : heroEvent.status === 'upcoming' ? 'Upcoming' : 'Featured'}
              </span>
              <p className="mt-2 line-clamp-1 font-display text-base font-bold text-white group-hover:underline sm:text-lg">{heroEvent.name}</p>
              <p className="flex items-center gap-1 text-xs text-white/80"><MapPin width={12} /> {heroEvent.venue}</p>
            </Link>
          ) : (
            <div className="transition-opacity duration-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 shadow-sm">
                {current.label}
              </span>
              <p className="mt-2 font-display text-base font-bold text-white sm:text-lg">{current.caption}</p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-1.5">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.src}
                type="button"
                aria-label={`Show ${s.label}`}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slide ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating live count chip */}
      <div className="absolute -top-3 right-4 z-20 flex items-center gap-2 rounded-full border border-white bg-white/95 px-3 py-1.5 shadow-soft backdrop-blur sm:right-6">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-grad text-white"><Star width={12} style={{ fill: '#fff' }} /></span>
        <div className="leading-tight">
          <div className="text-[10px] font-medium text-ink-400">In this city</div>
          <div className="text-xs font-extrabold text-ink-900">{cityStats.live} live · {cityStats.upcoming} soon</div>
        </div>
      </div>

      {/* Mini exhibition thumbs */}
      {secondary.length > 0 && (
        <div className="absolute -left-2 top-10 z-20 hidden flex-col gap-2 sm:flex lg:-left-4">
          {secondary.map((e, i) => (
            <Link
              key={e.id}
              to={`/exhibitions/${e.slug}`}
              className={`overflow-hidden rounded-xl border-2 border-white shadow-soft ${i === 0 ? 'animate-floaty' : ''}`}
              style={i === 1 ? { animationDelay: '1.5s' } : undefined}
            >
              <img src={e.banner} alt={e.name} className="h-16 w-24 object-cover" />
            </Link>
          ))}
        </div>
      )}

  
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className={`font-display text-2xl font-extrabold ${accent}`}>{value}</div>
      <div className="text-sm text-ink-500">{label}</div>
    </div>
  );
}

function SelectField({ icon, value, onChange, children }: { icon: React.ReactNode; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-100">
      {icon}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent py-3 text-sm text-ink-600 outline-none">
        {children}
      </select>
    </label>
  );
}

function FeaturedCard({ e }: { e: Exhibition }) {
  const badge = e.tags?.[0] || 'Featured';
  return (
    <Link to={`/exhibitions/${e.slug}`} className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
      <div className="relative h-40 overflow-hidden">
        <img src={e.banner} alt={e.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${BADGE_STYLES[badge] || 'bg-brand-600 text-white'}`}>{badge}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400"><Calendar width={13} /> {formatDateShort(e.start_date)} – {formatDateShort(e.end_date)}</div>
        <h3 className="mt-1.5 line-clamp-1 font-display text-[15px] font-bold text-ink-900">{e.name}</h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500"><MapPin width={13} className="text-brand-500" /> <span className="line-clamp-1">{e.venue}, {e.city}</span></div>
        <div className="mt-3 flex items-end justify-between border-t border-ink-100 pt-3">
          <div>
            <div className="text-[10px] text-ink-400">From</div>
            <div className="font-display text-base font-extrabold text-ink-900">{formatINR(e.price_from)} <span className="text-[11px] font-medium text-ink-400">/sq.m</span></div>
          </div>
          <span className="text-ink-300 transition-colors group-hover:text-brand-500"><Bookmark width={18} /></span>
        </div>
      </div>
    </Link>
  );
}
