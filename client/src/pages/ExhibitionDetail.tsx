import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatDate, formatINR, daysUntil, dayOfEvent } from '../api';
import type { Exhibition, Hall, Organizer, Seminar, Company } from '../types';
import { StatusBadge, Spinner } from '../components/ui';
import FloorPlan from '../components/FloorPlan';
import { MapPin, Calendar, Users, Grid, Ticket, Building, Clock, Globe, Phone, Mail, ArrowRight, Star } from '../components/icons';
import { useAuth } from '../auth';
import { toEmbedUrl, mediaKind } from '../media';

type Detail = Exhibition & { organizer: Organizer; halls: Hall[]; seminars: Seminar[]; exhibitors: (Company & { stall_code: string; hall_name: string })[] };

const TABS = ['Overview', 'Location', 'Video', 'Floor plan', 'Exhibitors', 'Seminars', 'Gallery', 'FAQs'] as const;
type TabKey = (typeof TABS)[number];

function mapsEmbedUrl(lat?: number, lng?: number, query?: string) {
  if (lat != null && lng != null) return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query || 'Bengaluru')}&z=14&output=embed`;
}
function mapsOpenUrl(lat?: number, lng?: number, query?: string) {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Bengaluru')}`;
}

export default function ExhibitionDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('Overview');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/exhibitions/${slug}`).then((r) => setData(r.data)).finally(() => setLoading(false));
    const h = window.location.hash.replace('#', '');
    if (h === 'floor-plan') setTab('Floor plan');
    if (h === 'location') setTab('Location');
    if (h === 'video') setTab('Video');
    if (h === 'gallery') setTab('Gallery');
  }, [slug]);

  if (loading) return <Spinner label="Loading exhibition…" />;
  if (!data) return <div className="container-px py-24 text-center text-ink-500">Exhibition not found.</div>;

  const day = data.status === 'live' ? dayOfEvent(data.start_date, data.end_date) : null;
  const startsIn = data.status === 'upcoming' ? daysUntil(data.start_date) : null;
  const placeQuery = `${data.venue}, ${data.city}`;
  const mapSrc = mapsEmbedUrl(data.lat, data.lng, placeQuery);
  const mapLink = mapsOpenUrl(data.lat, data.lng, placeQuery);
  const goFloor = () => { setTab('Floor plan'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <div className="relative">
        <div className="relative h-[300px] overflow-hidden bg-ink-950 lg:h-[380px]">
          <img src={data.banner} alt={data.name} className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-ink-950/20" />
        </div>

        <div className="container-px relative">
          <div className="-mt-40 pb-6 lg:-mt-48">
            <Link to="/exhibitions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white">
              <ArrowRight width={16} className="rotate-180" /> All exhibitions
            </Link>
            <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
              <div className="text-white">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={data.status} />
                  {data.tags.slice(0, 3).map((t) => <span key={t} className="glass rounded-full px-3 py-1 text-[11px] font-semibold">{t}</span>)}
                </div>
                <h1 className="font-display text-3xl font-extrabold leading-tight lg:text-5xl">{data.name}</h1>
                <p className="mt-2 max-w-2xl text-white/80">{data.tagline}</p>
                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
                  <span className="flex items-center gap-1.5"><MapPin width={16} className="text-brand-300" /> {data.venue}, {data.city}</span>
                  <span className="flex items-center gap-1.5"><Calendar width={16} className="text-brand-300" /> {formatDate(data.start_date)} – {formatDate(data.end_date)}</span>
                  {day && <span className="flex items-center gap-1.5 font-semibold text-amber-300"><Clock width={16} /> Day {day.current} of {day.total}</span>}
                  {startsIn != null && startsIn >= 0 && <span className="flex items-center gap-1.5 font-semibold text-amber-300"><Clock width={16} /> Starts in {startsIn} days</span>}
                </div>
              </div>

              {/* Action card */}
              <div className="card p-5 shadow-soft">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-ink-400">Stalls from</div>
                    <div className="font-display text-3xl font-extrabold text-ink-900">{formatINR(data.price_from)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-extrabold text-emerald-600">{data.available_stalls ?? 0}</div>
                    <div className="text-[11px] text-ink-400">available now</div>
                  </div>
                </div>
                {data.status !== 'past' ? (
                  <button onClick={goFloor} className="btn-primary mt-4 w-full">
                    {canBook ? 'Book your stall' : 'View floor plan'} <ArrowRight width={16} />
                  </button>
                ) : (
                  <button onClick={() => setTab('Gallery')} className="btn-dark mt-4 w-full">View event report</button>
                )}
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-400">
                  <Star width={13} style={{ color: '#fbbf24', fill: '#fbbf24' }} /> Instant confirmation · Secure booking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Stat row ---------------- */}
      <div className="container-px">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat icon={<Grid width={18} />} label="Total stalls" value={data.total_stalls ?? 0} />
          <MiniStat icon={<Ticket width={18} />} label="Available" value={data.available_stalls ?? 0} accent="bg-emerald-50 text-emerald-600" />
          <MiniStat icon={<Building width={18} />} label="Exhibitors" value={data.exhibitors.length} accent="bg-indigo-50 text-indigo-600" />
          <MiniStat icon={<Users width={18} />} label={data.status === 'live' ? 'Visitors today' : 'Total visitors'} value={(data.status === 'live' ? data.visitors_today : data.total_visitors).toLocaleString('en-IN')} accent="bg-amber-50 text-amber-600" />
        </div>
      </div>

      {/* ---------------- Tabs ---------------- */}
      <div className="sticky top-16 z-30 mt-8 border-y border-ink-100 bg-[var(--paper)]/90 backdrop-blur">
        <div className="container-px">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative whitespace-nowrap px-4 py-4 text-sm font-semibold transition-colors ${tab === t ? 'text-brand-700' : 'text-ink-500 hover:text-ink-900'}`}>
                {t}
                {tab === t && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-px py-10">
        {tab === 'Overview' && <Overview data={data} mapSrc={mapSrc} onFloor={goFloor} onTab={setTab} onPhoto={setLightbox} canBook={canBook} />}
        {tab === 'Location' && <Location data={data} mapSrc={mapSrc} mapLink={mapLink} />}
        {tab === 'Video' && <Video data={data} />}
        {tab === 'Floor plan' && (
          data.status === 'past'
            ? <div className="card py-16 text-center text-ink-500">This exhibition has concluded. The final stall layout is archived.</div>
            : <FloorPlan halls={data.halls} exhibitionName={data.name} />
        )}
        {tab === 'Exhibitors' && <Exhibitors data={data} />}
        {tab === 'Seminars' && <Seminars data={data} />}
        {tab === 'Gallery' && <Gallery data={data} onPhoto={setLightbox} />}
        {tab === 'FAQs' && <FAQs data={data} />}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/85 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-5xl rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-5 top-5 rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold" onClick={() => setLightbox(null)}>Close</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Sections ---------------- */

function Overview({ data, mapSrc, onFloor, onTab, onPhoto, canBook }: { data: Detail; mapSrc: string; onFloor: () => void; onTab: (t: TabKey) => void; onPhoto: (s: string) => void; canBook: boolean }) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <section>
          <h2 className="font-display text-xl font-extrabold text-ink-900">About the exhibition</h2>
          <p className="mt-3 leading-relaxed text-ink-600">{data.about}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Chip>{data.industry}</Chip><Chip>{data.city}</Chip>
            {data.b2b ? <Chip>B2B</Chip> : null}
            {data.international ? <Chip>International</Chip> : null}
            {data.government ? <Chip>Government</Chip> : null}
            {data.entry_free ? <Chip>Free entry</Chip> : null}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-display text-lg font-bold text-ink-900">What to expect</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: <Building width={18} />, t: 'Live product demos', d: 'See the latest products in action across every hall.' },
              { icon: <Users width={18} />, t: 'B2B networking', d: 'Meet manufacturers, suppliers and buyers in one place.' },
              { icon: <Ticket width={18} />, t: 'Knowledge sessions', d: 'Expert-led seminars and panel discussions.' },
              { icon: <Grid width={18} />, t: 'Interactive floor plan', d: 'Explore halls and pick your exact stall visually.' },
            ].map((f) => (
              <div key={f.t} className="card flex gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{f.icon}</div>
                <div><div className="font-semibold text-ink-900">{f.t}</div><div className="text-sm text-ink-500">{f.d}</div></div>
              </div>
            ))}
          </div>
        </section>

        {/* Preview: map + video */}
        <section className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => onTab('Location')} className="card overflow-hidden text-left transition-shadow hover:shadow-soft">
            <div className="h-40 overflow-hidden bg-ink-100"><iframe title="Map preview" src={mapSrc} className="pointer-events-none h-full w-full border-0" loading="lazy" /></div>
            <div className="flex items-center justify-between p-4"><span className="font-semibold text-ink-900">Venue location</span><span className="text-sm font-semibold text-brand-600">Open map →</span></div>
          </button>
          {(data.youtube_url || data.reel_url) && (
            <button onClick={() => onTab('Video')} className="card overflow-hidden text-left transition-shadow hover:shadow-soft">
              <div className="relative h-40 bg-ink-950">
                <iframe title="Reel preview" src={toEmbedUrl(data.youtube_url) || toEmbedUrl(data.reel_url) || data.youtube_url} className="pointer-events-none h-full w-full border-0" />
              </div>
              <div className="flex items-center justify-between p-4"><span className="font-semibold text-ink-900">Video & reels</span><span className="text-sm font-semibold text-brand-600">Watch →</span></div>
            </button>
          )}
        </section>

        {data.gallery?.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink-900">Gallery</h3>
              <button onClick={() => onTab('Gallery')} className="text-sm font-semibold text-brand-600">View all →</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.gallery.slice(0, 4).map((g, i) => (
                <button key={i} onClick={() => onPhoto(g)} className="overflow-hidden rounded-2xl">
                  <img src={g} alt="" className="h-28 w-full object-cover transition-transform hover:scale-105" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-4">
        <div className="card p-5">
          <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-ink-400">Event details</h3>
          <dl className="space-y-3.5 text-sm">
            <Row icon={<Calendar width={16} />} label="Dates" value={`${formatDate(data.start_date)} – ${formatDate(data.end_date)}`} />
            <Row icon={<MapPin width={16} />} label="Venue" value={`${data.venue}, ${data.city}`} />
            <Row icon={<Ticket width={16} />} label="Entry" value={data.entry_free ? 'Free (register online)' : 'Paid visitor pass'} />
            <Row icon={<Grid width={16} />} label="Stalls" value={`${data.available_stalls ?? 0} of ${data.total_stalls ?? 0} available`} />
          </dl>
          {data.status !== 'past' && (
            <button onClick={onFloor} className="btn-primary mt-5 w-full">{canBook ? 'Book your stall' : 'View floor plan'} <ArrowRight width={16} /></button>
          )}
        </div>

        {data.organizer && (
          <div className="card p-5">
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-ink-400">Organizer</h3>
            <div className="flex items-center gap-3">
              <img src={data.organizer.logo} alt="" className="h-12 w-12 rounded-xl" />
              <div><div className="font-semibold text-ink-900">{data.organizer.name}</div><div className="text-xs text-ink-400">Event organizer</div></div>
            </div>
            <p className="mt-3 text-sm text-ink-500">{data.organizer.about}</p>
            <div className="mt-4 space-y-2 text-sm text-ink-600">
              <div className="flex items-center gap-2"><Globe width={15} className="text-ink-400" /> {data.organizer.website}</div>
              <div className="flex items-center gap-2"><Mail width={15} className="text-ink-400" /> {data.organizer.email}</div>
              <div className="flex items-center gap-2"><Phone width={15} className="text-ink-400" /> {data.organizer.phone}</div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Location({ data, mapSrc, mapLink }: { data: Detail; mapSrc: string; mapLink: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="mb-4 font-display text-xl font-extrabold text-ink-900">Venue location</h2>
        <div className="overflow-hidden rounded-3xl border border-ink-100 shadow-sm">
          <iframe title={`${data.name} map`} src={mapSrc} className="h-[380px] w-full border-0 lg:h-[480px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      </div>
      <div className="card h-fit space-y-5 p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><MapPin width={24} /></div>
        <Field label="Venue" value={data.venue} big />
        <Field label="Address" value={data.address || `${data.venue}, ${data.city}`} />
        <Field label="City" value={data.city} />
        {data.lat != null && data.lng != null && <Field label="Coordinates" value={`${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`} />}
        <a href={mapLink} target="_blank" rel="noreferrer" className="btn-primary w-full"><MapPin width={16} /> Open in Google Maps</a>
      </div>
    </div>
  );
}

function Video({ data }: { data: Detail }) {
  const videoSrc = toEmbedUrl(data.youtube_url);
  const reelSrc = toEmbedUrl(data.reel_url);
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-1 font-display text-xl font-extrabold text-ink-900">Exhibition video & reels</h2>
      <p className="mb-5 text-sm text-ink-500">A short walkthrough of the venue and the exhibition experience.</p>
      {!videoSrc && !reelSrc ? (
        <div className="card py-16 text-center text-ink-500">Video coming soon.</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {videoSrc && (
            <div>
              <div className="mb-2 text-sm font-semibold text-ink-700">Highlights video</div>
              <div className="aspect-video overflow-hidden rounded-3xl bg-ink-950 shadow-soft">
                <iframe title={`${data.name} video`} src={videoSrc} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>
            </div>
          )}
          {reelSrc && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-700">Reel <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-600">{mediaKind(data.reel_url) === 'instagram' ? 'Instagram' : 'Short'}</span></div>
              <div className="mx-auto aspect-[9/16] max-h-[560px] w-full max-w-[320px] overflow-hidden rounded-3xl bg-ink-950 shadow-soft">
                <iframe title={`${data.name} reel`} src={reelSrc} className="h-full w-full border-0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen scrolling="no" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Exhibitors({ data }: { data: Detail }) {
  return (
    <div>
      <h2 className="mb-5 font-display text-xl font-extrabold text-ink-900">Exhibitor directory <span className="text-ink-300">({data.exhibitors.length})</span></h2>
      {data.exhibitors.length === 0 ? <div className="card py-12 text-center text-ink-500">Exhibitor list opens closer to the event.</div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.exhibitors.map((c) => (
            <Link to={`/company/${c.id}?exhibition=${data.id}`} key={c.id} className="card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft">
              <img src={c.logo} alt="" className="h-12 w-12 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink-900">{c.name}</div>
                <div className="truncate text-xs text-ink-400">{c.industry}</div>
                <div className="mt-0.5 text-[11px] font-medium text-brand-600">{c.hall_name} · Stall {c.stall_code}</div>
              </div>
              <ArrowRight width={16} className="text-ink-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Seminars({ data }: { data: Detail }) {
  return (
    <div>
      <h2 className="mb-5 font-display text-xl font-extrabold text-ink-900">Seminar & conference schedule</h2>
      {data.seminars.length === 0 ? <div className="card py-12 text-center text-ink-500">Schedule coming soon.</div> : (
        <div className="space-y-3">
          {data.seminars.map((s) => (
            <div key={s.id} className="card flex items-center gap-4 p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-center text-brand-700"><div className="text-[10px] font-bold uppercase">{s.day}</div></div>
              <div className="flex-1"><div className="font-semibold text-ink-900">{s.title}</div><div className="text-sm text-ink-500">by {s.speaker}</div></div>
              <div className="text-right text-sm"><div className="flex items-center gap-1.5 font-medium text-ink-700"><Clock width={15} /> {s.time}</div><div className="text-xs text-ink-400">{s.hall}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Gallery({ data, onPhoto }: { data: Detail; onPhoto: (s: string) => void }) {
  return (
    <div>
      <h2 className="mb-5 font-display text-xl font-extrabold text-ink-900">Pictures from the exhibition</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {data.gallery.map((g, i) => (
          <button key={i} onClick={() => onPhoto(g)} className="group overflow-hidden rounded-2xl">
            <img src={g} alt="" className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105 md:h-52" />
          </button>
        ))}
      </div>
    </div>
  );
}

function FAQs({ data }: { data: Detail }) {
  const faqs = [
    { q: 'Where is this exhibition held?', a: `This exhibition is held in ${data.city} at ${data.venue}${data.address ? ` — ${data.address}` : ''}.` },
    { q: 'How do I book a stall?', a: 'Open the Floor plan tab, click any green (available) stall, fill your company details and confirm — it books instantly. (Exhibitor login required.)' },
    { q: 'What is included in the stall price?', a: 'Standard stalls include fascia name board, carpet, two chairs, a table, spotlights and a power socket. Corner and premium zones cost slightly more.' },
    { q: 'Can I get a refund?', a: 'Cancellations up to 30 days before the event are eligible for a refund minus processing charges.' },
    { q: 'Do visitors need to register?', a: data.entry_free ? 'Entry is free — just register online for a visitor pass.' : 'Yes, visitors register online and receive a QR pass for entry.' },
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h2 className="mb-5 font-display text-xl font-extrabold text-ink-900">Frequently asked questions</h2>
      {faqs.map((f) => (
        <details key={f.q} className="card p-5">
          <summary className="cursor-pointer font-semibold text-ink-900">{f.q}</summary>
          <p className="mt-2 text-sm text-ink-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ---------------- Small helpers ---------------- */
function MiniStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${accent || 'bg-brand-50 text-brand-600'}`}>{icon}</div>
      <div className="min-w-0"><div className="font-display text-xl font-extrabold text-ink-900">{value}</div><div className="truncate text-xs text-ink-400">{label}</div></div>
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">{children}</span>;
}
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500">{icon}</span>
      <div><dt className="text-[11px] uppercase tracking-wide text-ink-400">{label}</dt><dd className="font-medium text-ink-800">{value}</dd></div>
    </div>
  );
}
function Field({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</div>
      <div className={`mt-1 ${big ? 'text-base font-bold text-ink-900' : 'text-sm leading-relaxed text-ink-600'}`}>{value}</div>
    </div>
  );
}
