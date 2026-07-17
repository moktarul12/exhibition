import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building, Calendar, Check, Cog, Download, Eye, Globe, Grid,
  Sparkle, Trending, Users, Zap,
} from '../components/icons';

type FlyerId =
  | 'master'
  | 'home'
  | 'event'
  | 'floor-design'
  | 'booking'
  | 'visitor-company'
  | 'visitor'
  | 'company'
  | 'admin'
  | 'business';

const NAV: { id: FlyerId; label: string; group: string }[] = [
  { id: 'master', label: 'Main', group: 'Brand' },
  { id: 'home', label: 'Home page', group: 'Product UI' },
  { id: 'event', label: 'Event details', group: 'Product UI' },
  { id: 'floor-design', label: 'Floor design', group: 'Product UI' },
  { id: 'booking', label: 'Stall booking', group: 'Product UI' },
  { id: 'visitor-company', label: 'Visitor → company', group: 'Product UI' },
  { id: 'visitor', label: 'Visitor flyer', group: 'Roles' },
  { id: 'company', label: 'Company flyer', group: 'Roles' },
  { id: 'admin', label: 'Admin flyer', group: 'Roles' },
  { id: 'business', label: 'Business advantage', group: 'Biz' },
];

const SHOTS = {
  home: '/marketing/01-home.png',
  exhibitions: '/marketing/02-exhibitions.png',
  detail: '/marketing/03-exhibition-detail.png',
  floor: '/marketing/04-floor-plan.png',
  companyDash: '/marketing/06-company-dashboard.png',
  admin: '/marketing/08-admin-dashboard.png',
  editor: '/marketing/09-floor-editor.png',
};

function FlyerShell({
  id,
  children,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      id={`flyer-${id}`}
      className={`flyer-sheet relative mx-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-[1.75rem] shadow-[0_28px_70px_-30px_rgba(21,19,33,0.55)] print:max-w-none print:rounded-none print:shadow-none ${className}`}
      style={{ aspectRatio: '210 / 297', minHeight: 560 }}
    >
      {children}
    </article>
  );
}

function ShotFrame({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200/80 bg-ink-50 shadow-md">
      <div className="flex items-center gap-1 border-b border-ink-100 bg-ink-50 px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {caption && <span className="ml-1 truncate text-[8px] text-ink-400">{caption}</span>}
      </div>
      <img src={src} alt={alt} className="block w-full object-cover object-top" style={{ maxHeight: 220 }} />
    </div>
  );
}

function MiniHall({
  mode = 'view',
}: {
  mode?: 'view' | 'book' | 'edit';
}) {
  const cells = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/15 p-2">
      {cells.map((i) => {
        const booked = [1, 2, 7].includes(i);
        const available = [3, 5, 8, 10].includes(i);
        const focus = (mode === 'book' && i === 5) || (mode === 'edit' && i === 9) || (mode === 'view' && i === 1);
        let bg = booked ? 'bg-brand-400' : available ? 'bg-emerald-300' : 'bg-white/40';
        if (focus && mode === 'book') bg = 'bg-brand ring-2 ring-white';
        if (focus && mode === 'edit') bg = 'bg-grape-400 ring-2 ring-white';
        if (focus && mode === 'view') bg = 'bg-amber-300 ring-2 ring-white';
        return <div key={i} className={`aspect-square rounded ${bg}`} />;
      })}
    </div>
  );
}

function FlyerFooter({ light = false }: { light?: boolean }) {
  return (
    <div className={`mt-auto flex items-center justify-between pt-4 text-[10px] font-bold uppercase tracking-wider ${light ? 'text-white/55' : 'text-ink-400'}`}>
      <span>Expo Mela</span>
      <span>expomela.com</span>
    </div>
  );
}

/* ——— Brand ——— */
function FlyerMaster() {
  return (
    <FlyerShell id="master" className="bg-[#151321] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(214,32,110,0.55),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(124,58,237,0.4),_transparent_45%)]" />
      <div className="relative flex h-full flex-col p-7 sm:p-8">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-brand-200">
          <span>Expo Mela</span>
          <span>expomela.com</span>
        </div>
        <h1 className="mt-8 font-display text-[2.1rem] font-extrabold leading-[1.05] sm:text-[2.35rem]">
          Discover expos.<br />Book stalls.<br />
          <span style={{ backgroundImage: 'var(--grad)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Grow live.
          </span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Home → event → floor → book or chat — one live platform for exhibitions.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] font-bold">
          {['Home page', 'Event details', 'Floor design', 'Stall booking', 'Company profile', 'Live KPIs'].map((t) => (
            <span key={t} className="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-center">{t}</span>
          ))}
        </div>
        <div className="mt-5"><MiniHall mode="book" /></div>
        <div className="mt-auto rounded-2xl bg-white px-4 py-3 text-center text-ink-900">
          <div className="text-xs font-bold">Open the product kit</div>
          <div className="text-[10px] text-ink-500">/flyers · /live · /pitch</div>
        </div>
      </div>
    </FlyerShell>
  );
}

/* ——— Product UI: Home ——— */
function FlyerHome() {
  return (
    <FlyerShell id="home" className="bg-white text-ink-900">
      <div className="flex h-full flex-col p-5 sm:p-6">
        <div className="rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand w-fit">
          Product screen · Home
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">
          City-aware homepage
        </h2>
        <p className="mt-1.5 text-xs text-ink-500">
          Live · upcoming · past expos. Search, industries, and featured stalls — tailored to Bengaluru (or any city).
        </p>
        <div className="mt-4 flex-1">
          <ShotFrame src={SHOTS.home} alt="Expo Mela home page" caption="expomela.com/" />
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-ink-600">
          {[
            'Hero: discover exhibitions in your city',
            'Stats: live / upcoming / stall counts',
            'Live now cards + industry browse',
          ].map((t) => (
            <li key={t} className="flex gap-2"><Check width={12} className="mt-0.5 shrink-0 text-brand" />{t}</li>
          ))}
        </ul>
        <FlyerFooter />
      </div>
    </FlyerShell>
  );
}

/* ——— Product UI: Event details ——— */
function FlyerEvent() {
  return (
    <FlyerShell id="event" className="bg-[#f7f5fb] text-ink-900">
      <div className="flex h-full flex-col p-5 sm:p-6">
        <div className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
          Product screen · Event details
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">
          Full event hub
        </h2>
        <p className="mt-1.5 text-xs text-ink-500">
          About, gallery, schedule, floor plan, exhibitors — everything before you travel.
        </p>
        <div className="mt-4">
          <ShotFrame src={SHOTS.detail} alt="Exhibition detail page" caption="expomela.com/exhibitions/:slug" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] font-bold">
          {['About', 'Floor plan', 'Exhibitors', 'Schedule', 'Gallery', 'FAQs'].map((t) => (
            <span key={t} className="rounded-lg border border-ink-100 bg-white px-2 py-2 text-center shadow-sm">{t}</span>
          ))}
        </div>
        <FlyerFooter />
      </div>
    </FlyerShell>
  );
}

/* ——— Product UI: Floor design (admin) ——— */
function FlyerFloorDesign() {
  return (
    <FlyerShell id="floor-design" className="bg-[#1a1430] text-white">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-grape-500/25 blur-3xl" />
      <div className="relative flex h-full flex-col p-5 sm:p-6">
        <div className="w-fit rounded-full bg-grape-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-grape-200">
          Product screen · Floor design
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">
          How admins design the hall
        </h2>
        <p className="mt-1.5 text-xs text-white/60">
          Drag-drop stalls, merge sizes, place amenities, set prices — PDF becomes live inventory.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
          <img src={SHOTS.editor} alt="Floor plan editor" className="block w-full object-cover object-top" style={{ maxHeight: 200 }} />
        </div>
        <div className="mt-3"><MiniHall mode="edit" /></div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
          {['Add stall', 'Merge 2×1', 'Amenity', 'Price', 'AI digitize'].map((t) => (
            <span key={t} className="rounded-full bg-white/10 px-2.5 py-1">{t}</span>
          ))}
        </div>
        <FlyerFooter light />
      </div>
    </FlyerShell>
  );
}

/* ——— Product UI: Company booking with available ——— */
function FlyerBooking() {
  const stalls = [
    { id: 'A3', status: 'Available', price: '₹48,000', open: true },
    { id: 'B3', status: 'Available', price: '₹55,000', open: true },
    { id: 'B2', status: 'Booked', price: '—', open: false },
    { id: 'C1', status: 'Available', price: '₹38,000', open: true },
  ];
  return (
    <FlyerShell id="booking" className="bg-gradient-to-b from-brand-soft to-white text-ink-900">
      <div className="flex h-full flex-col p-5 sm:p-6">
        <div className="w-fit rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Product screen · Company booking
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">
          Book with live availability
        </h2>
        <p className="mt-1.5 text-xs text-ink-500">
          Company owners see free vs booked stalls, pick one, and confirm in one flow.
        </p>
        <div className="mt-3">
          <ShotFrame src={SHOTS.floor} alt="Interactive floor plan booking" caption="#floor · live inventory" />
        </div>
        <div className="mt-3 rounded-xl border border-brand-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink-400">
            <span>Available options</span>
            <span className="flex gap-2 normal-case">
              <span className="text-emerald-600">● Free</span>
              <span className="text-brand">● Booked</span>
            </span>
          </div>
          <ul className="space-y-1.5">
            {stalls.map((s) => (
              <li
                key={s.id}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                  s.open ? 'bg-emerald-50 text-emerald-900' : 'bg-ink-50 text-ink-400'
                }`}
              >
                <span className="font-bold">Stall {s.id}</span>
                <span>{s.status}</span>
                <span className="font-extrabold">{s.price}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 rounded-full bg-brand py-2 text-center text-[11px] font-bold text-white">
            Book Stall B3 →
          </div>
        </div>
        <FlyerFooter />
      </div>
    </FlyerShell>
  );
}

/* ——— Product UI: Visitor clicks stall → company ——— */
function FlyerVisitorCompany() {
  return (
    <FlyerShell id="visitor-company" className="bg-gradient-to-b from-emerald-50 to-white text-ink-900">
      <div className="flex h-full flex-col p-5 sm:p-6">
        <div className="w-fit rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Product screen · Visitor → company
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">
          Click a stall. Meet the brand.
        </h2>
        <p className="mt-1.5 text-xs text-ink-500">
          Visitors tap a booked stall on the floor plan → open company details → send a chat / enquiry.
        </p>

        {/* Storyboard strip */}
        <div className="mt-3 flex items-stretch gap-1.5 text-[9px] font-bold">
          {['1 Floor', '2 Stall', '3 Company', '4 Chat'].map((s, i) => (
            <div key={s} className="flex-1 rounded-lg bg-emerald-600/90 px-1 py-2 text-center text-white">
              {s}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-ink-100 bg-white p-2 shadow-sm">
            <div className="mb-1 text-[9px] font-bold uppercase text-ink-400">Floor · click</div>
            <MiniHall mode="view" />
            <div className="mt-1 text-center text-[9px] font-bold text-amber-700">Stall A1 selected</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-2 shadow-sm">
            <div className="mb-1 text-[9px] font-bold uppercase text-ink-400">Company card</div>
            <div className="flex gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-grad text-sm font-extrabold text-white">N</div>
              <div>
                <div className="text-xs font-extrabold">NovaTech</div>
                <div className="text-[9px] text-ink-500">AI hardware · A1</div>
              </div>
            </div>
            <div className="mt-2 rounded-full bg-emerald-600 py-1.5 text-center text-[9px] font-bold text-white">
              View profile / Chat
            </div>
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-50 px-3 py-1.5 text-[9px] font-bold text-ink-400">Company page preview</div>
          <img src={SHOTS.companyDash} alt="Company workspace / profile" className="block w-full object-cover object-top" style={{ maxHeight: 140 }} />
        </div>

        <ul className="mt-2 space-y-1 text-[11px] text-ink-600">
          <li className="flex gap-1.5"><Check width={11} className="mt-0.5 text-emerald-600" /> See who’s in which stall</li>
          <li className="flex gap-1.5"><Check width={11} className="mt-0.5 text-emerald-600" /> Open brand media & brochures</li>
          <li className="flex gap-1.5"><Check width={11} className="mt-0.5 text-emerald-600" /> Message the exhibitor in-app</li>
        </ul>
        <FlyerFooter />
      </div>
    </FlyerShell>
  );
}

/* ——— Role flyers ——— */
function FlyerVisitor() {
  return (
    <FlyerShell id="visitor" className="bg-gradient-to-b from-emerald-700 via-teal-700 to-emerald-950 text-white">
      <div className="relative flex h-full flex-col p-7 sm:p-8">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
          <Eye width={12} /> Visitor / Guest
        </div>
        <h2 className="mt-6 font-display text-3xl font-extrabold leading-tight">Know the fair before you go</h2>
        <p className="mt-3 text-sm text-white/70">Browse free — home, event pages, floor browse, company chat.</p>
        <ul className="mt-6 space-y-2.5">
          {['City homepage', 'Event details hub', 'Browse floor plan', 'Company profiles', 'Chat / enquiry'].map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-emerald-700"><Check width={12} /></span>
              {p}
            </li>
          ))}
        </ul>
        <FlyerFooter light />
      </div>
    </FlyerShell>
  );
}

function FlyerCompany() {
  return (
    <FlyerShell id="company" className="bg-gradient-to-br from-[#d6206e] via-[#b21caf] to-[#7c3aed] text-white">
      <div className="relative flex h-full flex-col p-7 sm:p-8">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
          <Building width={12} /> Company owner
        </div>
        <h2 className="mt-6 font-display text-3xl font-extrabold leading-tight">Book the stall you want</h2>
        <p className="mt-3 text-sm text-white/75">Available options on a live grid — confirm, then manage every location.</p>
        <div className="mt-5"><MiniHall mode="book" /></div>
        <ul className="mt-5 space-y-2">
          {['See Available / Booked', 'Book with price & zone', 'Company public profile', 'List of all stall locations'].map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm"><Zap width={14} /> {p}</li>
          ))}
        </ul>
        <FlyerFooter light />
      </div>
    </FlyerShell>
  );
}

function FlyerAdmin() {
  return (
    <FlyerShell id="admin" className="bg-[#1a1430] text-white">
      <div className="relative flex h-full flex-col p-7 sm:p-8">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-grape-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-grape-200">
          <Cog width={12} /> Admin
        </div>
        <h2 className="mt-6 font-display text-3xl font-extrabold leading-tight">Design. Publish. Measure.</h2>
        <p className="mt-3 text-sm text-white/60">Event profile → floor editor → live dashboard.</p>
        <div className="mt-5 overflow-hidden rounded-xl border border-white/15">
          <img src={SHOTS.admin} alt="Admin dashboard" className="block w-full object-cover object-top" style={{ maxHeight: 120 }} />
        </div>
        <ul className="mt-5 space-y-2">
          {['Create event profile', 'Design stall layout', 'Track revenue live'].map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm"><Grid width={14} className="text-grape-300" /> {p}</li>
          ))}
        </ul>
        <FlyerFooter light />
      </div>
    </FlyerShell>
  );
}

function FlyerBusiness() {
  const advantages = [
    { icon: Trending, t: 'Fill every sq.m faster', d: 'Live stall sales beat phone queues.' },
    { icon: Users, t: 'Three audiences, one twin', d: 'Visitor, company, admin share one hall.' },
    { icon: Globe, t: 'City → network', d: 'Launch locally; scale metro by metro.' },
    { icon: Sparkle, t: 'AI-assisted ops', d: 'Discover expos & digitize maps.' },
    { icon: Calendar, t: 'Always-on discovery', d: 'Expos stay searchable year-round.' },
    { icon: Zap, t: 'Lower ops cost', d: 'Less Excel. More confirmed bookings.' },
  ];
  return (
    <FlyerShell id="business" className="bg-[#f7f5fb] text-ink-900">
      <div className="flex h-full flex-col">
        <div className="bg-grad px-7 py-6 text-white sm:px-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Business advantage</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">Why partners choose Expo Mela</h2>
        </div>
        <div className="flex flex-1 flex-col px-5 py-4 sm:px-6">
          <ul className="grid flex-1 gap-2">
            {advantages.map((a) => (
              <li key={a.t} className="flex gap-2.5 rounded-xl border border-ink-100 bg-white p-2 shadow-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><a.icon width={14} /></span>
                <div>
                  <div className="text-xs font-bold">{a.t}</div>
                  <div className="text-[10px] text-ink-500">{a.d}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-soft/50 px-3 py-2.5 text-center text-[11px]">
            <b className="text-brand-800">hello@expomela.com</b> · expomela.com
          </div>
        </div>
      </div>
    </FlyerShell>
  );
}

const FLYERS: { id: FlyerId; title: string; node: React.ReactNode }[] = [
  { id: 'master', title: '1 · Main flyer', node: <FlyerMaster /> },
  { id: 'home', title: '2 · Home page', node: <FlyerHome /> },
  { id: 'event', title: '3 · Event details', node: <FlyerEvent /> },
  { id: 'floor-design', title: '4 · Floor design (admin)', node: <FlyerFloorDesign /> },
  { id: 'booking', title: '5 · Stall booking (available)', node: <FlyerBooking /> },
  { id: 'visitor-company', title: '6 · Visitor → company details', node: <FlyerVisitorCompany /> },
  { id: 'visitor', title: '7 · Visitor role', node: <FlyerVisitor /> },
  { id: 'company', title: '8 · Company role', node: <FlyerCompany /> },
  { id: 'admin', title: '9 · Admin role', node: <FlyerAdmin /> },
  { id: 'business', title: '10 · Business advantage', node: <FlyerBusiness /> },
];

export default function Flyers() {
  const [focus, setFocus] = useState<FlyerId | 'all'>('all');

  const visible = focus === 'all' ? FLYERS : FLYERS.filter((f) => f.id === focus);

  const printOne = (id: FlyerId) => {
    setFocus(id);
    requestAnimationFrame(() => setTimeout(() => window.print(), 60));
  };

  return (
    <div className="flyers-page bg-[#ebe7f2] pb-16">
      <style>{`
        @media print {
          header, footer, .print\\:hidden { display: none !important; }
          .flyers-page { background: white !important; }
          .flyer-sheet {
            page-break-after: always;
            break-after: page;
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            aspect-ratio: auto !important;
            margin: 0 auto !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .flyer-sheet:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="border-b border-ink-200/60 bg-white/80 backdrop-blur print:hidden">
        <div className="container-px flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Print kit · 10 flyers</p>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">Expo Mela flyers</h1>
            <p className="max-w-xl text-sm text-ink-500">
              Product screens (home, event, floor design, booking, visitor→company) plus role & business flyers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setFocus('all'); setTimeout(() => window.print(), 80); }} className="btn-primary text-xs">
              <Download width={14} /> Print all PDF
            </button>
            <Link to="/live" className="btn-outline text-xs">Interactive sample</Link>
            <Link to="/pitch" className="btn-outline text-xs">Pitch</Link>
          </div>
        </div>
        <div className="container-px flex flex-wrap gap-1.5 pb-4">
          <button
            type="button"
            onClick={() => setFocus('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${focus === 'all' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600'}`}
          >
            All
          </button>
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setFocus(n.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${focus === n.id ? 'bg-brand text-white' : 'bg-white text-ink-600'}`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container-px grid gap-10 py-10 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((f) => (
          <div key={f.id}>
            <div className="mb-3 flex items-center justify-between print:hidden">
              <h2 className="text-sm font-bold text-ink-700">{f.title}</h2>
              <button type="button" onClick={() => printOne(f.id)} className="text-xs font-bold text-brand">Print this</button>
            </div>
            {f.node}
          </div>
        ))}
      </div>
    </div>
  );
}
