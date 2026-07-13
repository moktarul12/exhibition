import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatINR, formatDateShort } from '../api';
import type { Exhibition, Stats } from '../types';
import { Spinner } from '../components/ui';
import {
  Search, MapPin, Calendar, Users, Building, Ticket, Grid, ArrowRight, ChevronRight,
  Eye, Trending, Shield, Headset, Zap, Layout, Cog, Chip, Cup, Heart, Crane, Car, Bookmark,
} from '../components/icons';
import { useCity } from '../city';

const HERO_STATS = [
  { icon: Ticket, value: '1,200+', label: 'Exhibitions' },
  { icon: Users, value: '25K+', label: 'Exhibitors' },
  { icon: Eye, value: '2M+', label: 'Visitors' },
  { icon: Building, value: '500+', label: 'Venues' },
];

const TRUST = [
  { icon: Users, label: 'Trusted by', value: '25K+', sub: 'Exhibitors' },
  { icon: Building, label: 'Across', value: '350+', sub: 'Cities' },
  { icon: Trending, label: 'Annual Footfall', value: '2M+', sub: 'Visitors' },
  { icon: Shield, label: 'Success Rate', value: '98%', sub: 'Customer Satisfaction' },
  { icon: Headset, label: 'Support', value: '24/7', sub: 'Expert Assistance' },
];

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
  const { setCity } = useCity();
  const [, setStats] = useState<Stats | null>(null);
  const [all, setAll] = useState<Exhibition[]>([]);
  const [filters, setFilters] = useState<{ industries: string[]; cities: string[] }>({ industries: [], cities: [] });
  const [loading, setLoading] = useState(true);

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
      <section className="relative">
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(180deg,#fdf2f8 0%, #f5f3ff 45%, #ffffff 100%)' }} />
        <div className="container-px grid items-center gap-10 pb-6 pt-12 lg:grid-cols-2 lg:pt-16">
          <div className="max-w-xl">
            <div className="eyebrow mb-4">India's Smart Exhibition Booking Platform</div>
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.08] text-ink-900 sm:text-5xl lg:text-[3.4rem]">
              The right exhibition.<br />The right audience.<br /><span className="text-grad">Real business growth.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-500">
              Discover top exhibitions, compare venues, explore floor plans and book your stall in just a few clicks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/exhibitions" className="btn-primary px-6 py-3 text-[15px]">Explore Exhibitions <ArrowRight width={17} /></Link>
              <Link to="/register" className="btn-outline px-6 py-3 text-[15px]"><Ticket width={17} /> List Your Event</Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-4 -top-6 -z-10 h-48 w-48 rounded-full bg-grape-400/30 blur-3xl" />
            <div className="absolute -bottom-8 -left-6 -z-10 h-40 w-40 rounded-full bg-brand-300/40 blur-3xl" />
            <img src="/hero-expo-hall.png" alt="Exhibition hall" className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-soft ring-1 ring-black/5" />

            {/* stats — overlay on desktop, stacked on mobile */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft sm:grid-cols-4 lg:absolute lg:-bottom-12 lg:left-1/2 lg:mt-0 lg:w-[92%] lg:-translate-x-1/2">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><s.icon width={19} /></span>
                  <div>
                    <div className="font-display text-lg font-extrabold text-ink-900">{s.value}</div>
                    <div className="text-[11px] font-medium text-ink-400">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------- Search card ---------------- */}
        <div className="container-px mt-8 lg:mt-24">
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
      </section>

      {/* ---------------- Trust band ---------------- */}
      <section className="container-px mt-10">
        <div className="grid gap-6 rounded-3xl px-6 py-8 text-white sm:grid-cols-2 lg:grid-cols-5 lg:gap-2"
          style={{ backgroundImage: 'linear-gradient(120deg,#171436 0%,#241a4d 55%,#3a1c56 100%)' }}>
          {TRUST.map((t, i) => (
            <div key={t.label} className={`flex items-center gap-3.5 ${i < TRUST.length - 1 ? 'lg:border-r lg:border-white/10' : ''}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-white"><t.icon width={22} /></span>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-white/50">{t.label}</div>
                <div className="font-display text-2xl font-extrabold leading-tight">{t.value}</div>
                <div className="text-xs text-white/60">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

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
