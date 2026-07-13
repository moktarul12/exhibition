import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatDate, formatINR, daysUntil, dayOfEvent } from '../api';
import type { Exhibition, Hall, Organizer, Seminar, Company } from '../types';
import { StatusBadge, Spinner, Stat, Tag } from '../components/ui';
import FloorPlan from '../components/FloorPlan';
import { MapPin, Calendar, Users, Grid, Ticket, Building, Clock, Globe, Phone, Mail, ArrowRight } from '../components/icons';
import { useAuth } from '../auth';

type Detail = Exhibition & { organizer: Organizer; halls: Hall[]; seminars: Seminar[]; exhibitors: (Company & { stall_code: string; hall_name: string })[] };

const TABS = ['Overview', 'Location', 'Video', 'Floor Plan', 'Exhibitors', 'Seminars', 'Gallery', 'FAQs'] as const;

function mapsEmbedUrl(lat?: number, lng?: number, query?: string) {
  if (lat != null && lng != null) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(query || 'Bengaluru')}&z=14&output=embed`;
}

function mapsOpenUrl(lat?: number, lng?: number, query?: string) {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Bengaluru')}`;
}

export default function ExhibitionDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/exhibitions/${slug}`).then((r) => setData(r.data)).finally(() => setLoading(false));
    if (window.location.hash === '#floor-plan') setTab('Floor Plan');
    if (window.location.hash === '#location') setTab('Location');
    if (window.location.hash === '#video') setTab('Video');
    if (window.location.hash === '#gallery') setTab('Gallery');
  }, [slug]);

  if (loading) return <Spinner label="Loading exhibition…" />;
  if (!data) return <div className="container-px py-24 text-center text-slate-500">Exhibition not found.</div>;

  const day = data.status === 'live' ? dayOfEvent(data.start_date, data.end_date) : null;
  const startsIn = data.status === 'upcoming' ? daysUntil(data.start_date) : null;
  const placeQuery = `${data.venue}, ${data.city}`;
  const mapSrc = mapsEmbedUrl(data.lat, data.lng, placeQuery);
  const mapLink = mapsOpenUrl(data.lat, data.lng, placeQuery);

  return (
    <div>
      <div className="relative h-64 overflow-hidden bg-slate-900 lg:h-80">
        <img src={data.banner} alt={data.name} className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <div className="container-px absolute inset-x-0 bottom-0 pb-6">
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={data.status} />
            {data.tags.map((t) => <span key={t} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{t}</span>)}
          </div>
          <h1 className="text-3xl font-extrabold text-white lg:text-4xl">{data.name}</h1>
          <p className="mt-1 text-brand-100">{data.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-200">
            <span className="flex items-center gap-1.5"><MapPin width={16} /> {data.venue}, {data.city}</span>
            <span className="flex items-center gap-1.5"><Calendar width={16} /> {formatDate(data.start_date)} – {formatDate(data.end_date)}</span>
            {day && <span className="flex items-center gap-1.5 font-semibold text-red-300"><Clock width={16} /> Day {day.current} of {day.total}</span>}
            {startsIn != null && <span className="flex items-center gap-1.5 font-semibold text-amber-300"><Clock width={16} /> Starts in {startsIn} days</span>}
          </div>
        </div>
      </div>

      <div className="container-px -mt-6 relative z-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<Grid width={20} />} label="Total Stalls" value={data.total_stalls ?? 0} />
          <Stat icon={<Ticket width={20} />} label="Available Stalls" value={data.available_stalls ?? 0} accent="bg-emerald-50 text-emerald-600" />
          <Stat icon={<Building width={20} />} label="Exhibitors" value={data.exhibitors.length} accent="bg-indigo-50 text-indigo-600" />
          <Stat icon={<Users width={20} />} label={data.status === 'live' ? 'Visitors Today' : 'Total Visitors'} value={(data.status === 'live' ? data.visitors_today : data.total_visitors).toLocaleString('en-IN')} accent="bg-amber-50 text-amber-600" />
        </div>
      </div>

      <div className="container-px mt-8">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="py-8">
          {tab === 'Overview' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="mb-3 text-lg font-bold text-slate-900">About the Exhibition</h2>
                  <p className="leading-relaxed text-slate-600">{data.about}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Tag>{data.industry}</Tag>
                    <Tag>Bengaluru</Tag>
                    {data.b2b ? <Tag>B2B</Tag> : null}
                    {data.international ? <Tag>International</Tag> : null}
                    {data.government ? <Tag>Government</Tag> : null}
                    {data.entry_free ? <Tag>Free Entry</Tag> : null}
                  </div>
                  {data.status !== 'past' && (
                    <button onClick={() => setTab('Floor Plan')} className="btn-primary mt-6">
                      {canBook ? <>Book Your Stall <ArrowRight width={16} /></> : <>View Floor Plan <ArrowRight width={16} /></>}
                    </button>
                  )}
                </div>

                {/* Preview strip: map + reel + photos */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <button type="button" onClick={() => setTab('Location')} className="card overflow-hidden text-left transition-shadow hover:shadow-soft">
                    <div className="h-36 overflow-hidden bg-slate-100">
                      <iframe title="Map preview" src={mapSrc} className="pointer-events-none h-full w-full border-0" loading="lazy" />
                    </div>
                    <div className="p-3 text-sm font-semibold text-slate-800">Location · Google Map →</div>
                  </button>
                  {data.youtube_url && (
                    <button type="button" onClick={() => setTab('Video')} className="card overflow-hidden text-left transition-shadow hover:shadow-soft">
                      <div className="relative h-36 bg-slate-900">
                        <iframe title="Reel preview" src={data.youtube_url} className="pointer-events-none h-full w-full border-0" />
                      </div>
                      <div className="p-3 text-sm font-semibold text-slate-800">YouTube reel / walkthrough →</div>
                    </button>
                  )}
                </div>
                {data.gallery?.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Pictures</h3>
                      <button onClick={() => setTab('Gallery')} className="text-xs font-semibold text-brand-700">View all</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {data.gallery.slice(0, 4).map((g, i) => (
                        <button key={i} type="button" onClick={() => setLightbox(g)} className="overflow-hidden rounded-xl">
                          <img src={g} alt="" className="h-24 w-full object-cover transition-transform hover:scale-105 sm:h-28" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="card p-5">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Organizer</h3>
                {data.organizer && (
                  <div>
                    <div className="flex items-center gap-3">
                      <img src={data.organizer.logo} alt="" className="h-12 w-12 rounded-lg" />
                      <div><div className="font-semibold text-slate-900">{data.organizer.name}</div><div className="text-xs text-slate-500">Event Organizer</div></div>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{data.organizer.about}</p>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><Globe width={16} className="text-slate-400" /> {data.organizer.website}</div>
                      <div className="flex items-center gap-2"><Mail width={16} className="text-slate-400" /> {data.organizer.email}</div>
                      <div className="flex items-center gap-2"><Phone width={16} className="text-slate-400" /> {data.organizer.phone}</div>
                    </div>
                    <div className="mt-4 rounded-xl bg-brand-50 p-3 text-center">
                      <div className="text-xs text-brand-700">Stall price starts from</div>
                      <div className="text-xl font-extrabold text-brand-700">{formatINR(data.price_from)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'Location' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-3 text-lg font-bold text-slate-900">Venue location</h2>
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <iframe
                    title={`${data.name} map`}
                    src={mapSrc}
                    className="h-[380px] w-full border-0 lg:h-[460px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
              <div className="card h-fit space-y-4 p-5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Venue</div>
                  <div className="mt-1 text-base font-bold text-slate-900">{data.venue}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Address</div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-600">{data.address || `${data.venue}, ${data.city}`}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">City</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">Bengaluru, Karnataka</div>
                </div>
                {data.lat != null && data.lng != null && (
                  <div className="text-xs text-slate-400">Coordinates: {data.lat.toFixed(4)}, {data.lng.toFixed(4)}</div>
                )}
                <a href={mapLink} target="_blank" rel="noreferrer" className="btn-primary w-full">
                  <MapPin width={16} /> Open in Google Maps
                </a>
              </div>
            </div>
          )}

          {tab === 'Video' && (
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-2 text-lg font-bold text-slate-900">Exhibition reel / walkthrough</h2>
              <p className="mb-4 text-sm text-slate-500">Watch a short video of the venue and exhibition experience.</p>
              {data.youtube_url ? (
                <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900 shadow-soft ring-1 ring-black/5">
                  <iframe
                    title={`${data.name} YouTube`}
                    src={data.youtube_url}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="card py-16 text-center text-slate-500">Video coming soon.</div>
              )}
            </div>
          )}

          {tab === 'Floor Plan' && (
            data.status === 'past'
              ? <div className="card py-16 text-center text-slate-500">This exhibition has concluded. The final stall layout is archived.</div>
              : <FloorPlan halls={data.halls} exhibitionName={data.name} />
          )}

          {tab === 'Exhibitors' && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Exhibitor Directory <span className="text-slate-400">({data.exhibitors.length})</span></h2>
              {data.exhibitors.length === 0 ? <div className="card py-12 text-center text-slate-500">Exhibitor list opens closer to the event.</div> : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.exhibitors.map((c) => (
                    <Link to={`/company/${c.id}?exhibition=${data.id}`} key={c.id} className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-soft">
                      <img src={c.logo} alt="" className="h-12 w-12 rounded-lg" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{c.name}</div>
                        <div className="truncate text-xs text-slate-500">{c.industry}</div>
                        <div className="mt-0.5 text-[11px] font-medium text-brand-600">{c.hall_name} · Stall {c.stall_code} · Message →</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Seminars' && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Seminar & Conference Schedule</h2>
              {data.seminars.length === 0 ? <div className="card py-12 text-center text-slate-500">Schedule coming soon.</div> : (
                <div className="space-y-3">
                  {data.seminars.map((s) => (
                    <div key={s.id} className="card flex items-center gap-4 p-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-50 text-center text-brand-700">
                        <div className="text-[10px] font-semibold uppercase">{s.day}</div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{s.title}</div>
                        <div className="text-sm text-slate-500">by {s.speaker}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700"><Clock width={15} /> {s.time}</div>
                        <div className="text-xs text-slate-400">{s.hall}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Gallery' && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Pictures from the exhibition</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {data.gallery.map((g, i) => (
                  <button key={i} type="button" onClick={() => setLightbox(g)} className="group overflow-hidden rounded-xl">
                    <img src={g} alt="" className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105 md:h-52" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'FAQs' && (
            <div className="mx-auto max-w-2xl space-y-3">
              {[
                { q: 'Where is this exhibition held?', a: `All ExpoHub demo exhibitions are in Bengaluru. This one is at ${data.venue}${data.address ? ` — ${data.address}` : ''}.` },
                { q: 'How do I book a stall?', a: 'Open the Floor Plan tab, click any green (available) stall, fill your company details and confirm — it books instantly. (Exhibitor login required.)' },
                { q: 'What is included in the stall price?', a: 'Standard stalls include fascia name board, carpet, two chairs, a table, spotlights and a power socket. Corner and premium zones cost slightly more.' },
                { q: 'Can I get a refund?', a: 'Cancellations up to 30 days before the event are eligible for a refund minus processing charges.' },
                { q: 'Do visitors need to register?', a: data.entry_free ? 'Entry is free — just register online for a visitor pass.' : 'Yes, visitors register online and receive a QR pass for entry.' },
              ].map((f) => (
                <details key={f.q} className="card p-4">
                  <summary className="cursor-pointer font-semibold text-slate-900">{f.q}</summary>
                  <p className="mt-2 text-sm text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-5xl rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold" onClick={() => setLightbox(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
