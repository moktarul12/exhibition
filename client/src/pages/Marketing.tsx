import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, Download, Grid, Eye,
  Ticket, MapPin, Calendar, Search, Star, Check, X,
} from '../components/icons';

/** Real screenshots captured from the running app — see scripts/capture-marketing-screenshots.mjs */
const SHOTS = {
  home: '/marketing/01-home.png',
  exhibitions: '/marketing/02-exhibitions.png',
  detail: '/marketing/03-exhibition-detail.png',
  floor: '/marketing/04-floor-plan.png',
  search: '/marketing/05-exhibitions-live.png',
  company: '/marketing/06-company-dashboard.png',
  bookings: '/marketing/07-my-bookings.png',
  admin: '/marketing/08-admin-dashboard.png',
  editor: '/marketing/09-floor-editor.png',
  ai: '/marketing/10-ai-discover.png',
};

const PROBLEMS = [
  { pain: 'Scattered information', detail: 'Expo dates, venues and stall lists live on PDFs, WhatsApp groups and random websites — nothing in one place.' },
  { pain: 'No city-wide view', detail: 'Visitors cannot easily see what is live, upcoming or finished in their city this month.' },
  { pain: 'Blind venue visits', detail: 'No preview of hall layout, exhibitor list, schedule or entry rules before travelling to the venue.' },
  { pain: 'Manual stall booking', detail: 'Exhibitors call organisers, wait for callbacks, and still risk double-booked stalls on paper floor plans.' },
];

const VISITOR_BENEFITS = [
  { icon: MapPin, title: 'Expos in your city', desc: 'Auto-detect or pick Bengaluru, Mumbai, Delhi — see live, upcoming and past fairs instantly.' },
  { icon: Search, title: 'Smart discovery', desc: 'Search by industry, date or keyword. Filter live expos happening right now.' },
  { icon: Eye, title: 'Preview before you go', desc: 'Event pages with reels, photo gallery, seminar schedule, venue map and exhibitor directory.' },
  { icon: Calendar, title: 'Plan your visit day', desc: 'Dates, entry fee (free or paid), visitor counts and documents — all on one page.' },
  { icon: Star, title: 'Save & follow', desc: 'Bookmark favourite expos and follow organisers — no booking required to browse.' },
  { icon: Ticket, title: 'Free to explore', desc: 'Visitors browse everything for free. Exhibitors book stalls; visitors discover and plan.' },
];

const SCREEN_SLIDES = [
  {
    img: SHOTS.home,
    tag: 'Visitor',
    title: 'City-aware homepage',
    purpose: 'Live stats, featured expos and industry browse — tailored to the visitor\'s city.',
    path: '/',
  },
  {
    img: SHOTS.exhibitions,
    tag: 'Visitor',
    title: 'Exhibition catalog',
    purpose: 'All expos in one list — filter live, upcoming or past; search by industry.',
    path: '/exhibitions',
  },
  {
    img: SHOTS.detail,
    tag: 'Visitor',
    title: 'Rich event page',
    purpose: 'About, floor plan, exhibitors, reels, schedule, location and reviews in one hub.',
    path: '/exhibitions/:slug',
  },
  {
    img: SHOTS.floor,
    tag: 'Exhibitor',
    title: 'Interactive floor plan',
    purpose: 'Click any stall — see size, price and live availability; book in one flow.',
    path: '#floor',
  },
  {
    img: SHOTS.company,
    tag: 'Exhibitor',
    title: 'Company workspace',
    purpose: 'Manage profile, active bookings and assigned stalls after booking.',
    path: '/company-dashboard',
  },
  {
    img: SHOTS.admin,
    tag: 'Organizer',
    title: 'Organizer dashboard',
    purpose: 'Revenue, bookings, top expos and stall availability — real-time KPIs.',
    path: '/admin',
  },
  {
    img: SHOTS.editor,
    tag: 'Organizer',
    title: 'Floor plan editor',
    purpose: 'Drag-drop stalls, merge cells (2×1, 2×2), place amenities, apply sizes.',
    path: '/admin/floor-plan',
  },
  {
    img: SHOTS.ai,
    tag: 'Organizer',
    title: 'AI discovery & import',
    purpose: 'Find trending expos by city; import venue maps into editable grids.',
    path: '/admin/discover',
  },
];

function SlideFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`marketing-slide relative flex min-h-[100dvh] flex-col justify-center bg-white px-6 py-10 sm:px-12 lg:px-16 print:min-h-0 print:py-8 ${className}`}>
      {children}
    </div>
  );
}

function SlideFooter({ n, total }: { n: number; total: number }) {
  return (
    <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[11px] font-medium text-ink-400 print:static print:mt-8">
      <span className="font-display font-bold text-brand">Expo Mela</span>
      <span>Slide {n} / {total}</span>
    </div>
  );
}

function ScreenShot({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-ink-200 bg-ink-50 shadow-[0_20px_50px_-20px_rgba(21,19,33,0.35)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-ink-100 bg-ink-50 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="mx-auto truncate text-[10px] text-ink-400">expomela.com — live product</span>
      </div>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  );
}

export default function Marketing() {
  const [present, setPresent] = useState(false);
  const [slide, setSlide] = useState(0);
  const totalSlides = 5 + SCREEN_SLIDES.length + 1; // cover + problem + solution + visitor + flow + screens + cta

  const go = useCallback((n: number) => {
    setSlide(Math.max(0, Math.min(totalSlides - 1, n)));
  }, [totalSlides]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(slide + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(slide - 1); }
      if (e.key === 'Escape') setPresent(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present, slide, go]);

  useEffect(() => {
    document.body.classList.toggle('marketing-present', present);
    return () => document.body.classList.remove('marketing-present');
  }, [present]);

  const toolbar = (
    <div className="sticky top-[72px] z-30 border-b border-ink-100 bg-white/95 backdrop-blur print:hidden">
      <div className="container-px flex flex-wrap items-center justify-between gap-2 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <Grid width={16} className="text-brand" />
          Product deck
          {present && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-700">Presenting</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {present && (
            <>
              <button type="button" onClick={() => go(slide - 1)} disabled={slide === 0} className="btn-outline py-1.5 text-xs disabled:opacity-40">
                <ChevronRight width={14} className="rotate-180" /> Prev
              </button>
              <span className="min-w-[4rem] text-center text-xs font-bold text-ink-600">{slide + 1} / {totalSlides}</span>
              <button type="button" onClick={() => go(slide + 1)} disabled={slide >= totalSlides - 1} className="btn-outline py-1.5 text-xs disabled:opacity-40">
                Next <ChevronRight width={14} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => { setPresent((p) => !p); if (!present) setSlide(0); }}
            className="btn-outline py-1.5 text-xs"
          >
            <Eye width={14} /> {present ? 'Exit present' : 'Present mode'}
          </button>
          <button type="button" onClick={() => window.print()} className="btn-primary py-1.5 text-xs">
            <Download width={14} /> Save as PDF
          </button>
        </div>
      </div>
    </div>
  );

  const slides = (
    <div className={present ? 'fixed inset-0 top-0 z-50 overflow-y-auto bg-white pt-0' : ''}>
      {present && (
        <div className="fixed right-4 top-4 z-[60] print:hidden">
          <button type="button" onClick={() => setPresent(false)} className="rounded-full bg-ink-900/80 p-2 text-white">
            <X width={18} />
          </button>
        </div>
      )}

      {/* 1 Cover */}
      <SlideFrame className={`bg-gradient-to-br from-brand-soft via-white to-grape-50 ${present && slide !== 0 ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-4xl text-center">
          <p className="eyebrow mb-3 justify-center">Expo Mela · Product presentation</p>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-6xl">
            India's exhibition platform<br /><span className="text-grad">discover · book · grow</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-500">
            One place for visitors to find expos, for exhibitors to book exact stalls,
            and for organizers to design halls and track revenue — live.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-ink-600">
            <span><b className="text-ink-900">3</b> audiences</span>
            <span><b className="text-ink-900">10+</b> product screens</span>
            <span><b className="text-ink-900">Real-time</b> stall grid</span>
          </div>
        </div>
        <SlideFooter n={1} total={totalSlides} />
      </SlideFrame>

      {/* 2 Problem */}
      <SlideFrame className={`bg-ink-900 text-white ${present && slide !== 1 ? 'hidden' : ''}`}>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-red-300">The problem</p>
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Trade fairs still run on PDFs and phone calls
            </h2>
            <p className="mt-4 text-white/60 leading-relaxed">
              Visitors hunt across Google and WhatsApp for expo dates. Exhibitors wait days for stall confirmation.
              Organizers redraw floor plans in Excel. Nobody has a live, shared view of the venue.
            </p>
          </div>
          <div className="space-y-3">
            {PROBLEMS.map((p, i) => (
              <div key={p.pain} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-500/20 text-sm font-bold text-red-200">{i + 1}</span>
                  <div>
                    <div className="font-bold text-white">{p.pain}</div>
                    <div className="mt-1 text-sm text-white/55">{p.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <SlideFooter n={2} total={totalSlides} />
      </SlideFrame>

      {/* 3 Solution */}
      <SlideFrame className={`${present && slide !== 2 ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-4xl text-center">
          <p className="eyebrow mb-2 justify-center">What we solve</p>
          <h2 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            A live digital twin of every exhibition hall
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-500">
            Expo Mela replaces static PDF floor plans with an interactive grid that updates in real time —
            so visitors discover events, exhibitors pick exact stalls, and organizers fill every square metre.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { who: 'Visitors', what: 'Discover & plan visits', color: 'border-emerald-200 bg-emerald-50' },
              { who: 'Exhibitors', what: 'Book exact stalls online', color: 'border-brand-200 bg-brand-soft' },
              { who: 'Organizers', what: 'Design halls & track KPIs', color: 'border-grape-200 bg-grape-50' },
            ].map((x) => (
              <div key={x.who} className={`rounded-2xl border p-5 ${x.color}`}>
                <div className="font-display text-lg font-extrabold text-ink-900">{x.who}</div>
                <div className="mt-1 text-sm text-ink-600">{x.what}</div>
              </div>
            ))}
          </div>
        </div>
        <SlideFooter n={3} total={totalSlides} />
      </SlideFrame>

      {/* 4 Visitor benefits — hero slide for user request */}
      <SlideFrame className={`bg-gradient-to-br from-emerald-50/80 to-white ${present && slide !== 3 ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-2">For visitors</p>
          <h2 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            How visitors benefit
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500">
            No account needed to browse. Find what's live in your city, preview the venue, and plan your day — before you leave home.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VISITOR_BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <b.icon width={20} />
                </div>
                <div>
                  <div className="font-bold text-ink-900">{b.title}</div>
                  <div className="mt-0.5 text-sm leading-snug text-ink-500">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <SlideFooter n={4} total={totalSlides} />
      </SlideFrame>

      {/* 5 Visitor journey + real screenshot */}
      <SlideFrame className={`${present && slide !== 4 ? 'hidden' : ''}`}>
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Visitor journey</p>
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              From "what's on in my city?" to "I'm at the right hall"
            </h2>
            <ol className="mt-6 space-y-4">
              {[
                'Open Expo Mela → see live expos in Bengaluru (or your city)',
                'Search by industry — tech, food, medical, auto…',
                'Open event page → schedule, map, reels, exhibitor list',
                'Check entry fee, dates and visitor count',
                'Visit venue prepared — or book a stall if you are an exhibitor',
              ].map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-ink-600">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <ScreenShot src={SHOTS.home} alt="Expo Mela homepage — real screenshot" />
        </div>
        <SlideFooter n={5} total={totalSlides} />
      </SlideFrame>

      {/* Product screens with real screenshots */}
      {SCREEN_SLIDES.map((s, i) => {
        const slideNum = 6 + i;
        return (
          <SlideFrame key={s.title} className={present && slide !== slideNum ? 'hidden' : ''}>
            <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <span className="pill mb-3 border border-ink-200 bg-ink-50 text-ink-600">{s.tag}</span>
                <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{s.title}</h2>
                <p className="mt-3 text-ink-500 leading-relaxed">{s.purpose}</p>
                <code className="mt-3 inline-block rounded-lg bg-ink-100 px-2 py-1 text-xs text-ink-600">{s.path}</code>
                <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Check width={14} /> Real product screenshot — not a mockup
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <ScreenShot src={s.img} alt={`${s.title} — real screenshot`} />
              </div>
            </div>
            <SlideFooter n={slideNum} total={totalSlides} />
          </SlideFrame>
        );
      })}

      {/* CTA */}
      <SlideFrame className={`bg-grad text-white ${present && slide !== totalSlides - 1 ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Ready to see it live?</h2>
          <p className="mt-4 text-white/80">
            Browse expos as a visitor, book a stall as an exhibitor, or design a hall as an organizer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
            <Link to="/exhibitions" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-lg">
              Explore live expos <ArrowRight width={16} className="inline" />
            </Link>
            <Link to="/register" className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white">
              Create free account
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/50">Demo: visitor@expomela.com · exhibitor@expomela.com · admin@expomela.com</p>
        </div>
        <SlideFooter n={totalSlides} total={totalSlides} />
      </SlideFrame>
    </div>
  );

  return (
    <div className="marketing-deck print:bg-white">
      <style>{`
        @media print {
          header, footer, .print\\:hidden { display: none !important; }
          .marketing-slide { page-break-after: always; break-after: page; min-height: 100vh; }
          .marketing-slide:last-child { page-break-after: auto; }
        }
        body.marketing-present header { display: none; }
        body.marketing-present footer { display: none; }
        body.marketing-present main { padding: 0; }
      `}</style>
      {toolbar}
      {slides}
    </div>
  );
}
