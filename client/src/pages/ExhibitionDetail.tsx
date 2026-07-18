import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatDate, formatINR, daysUntil, dayOfEvent } from '../api';
import type { Exhibition, Hall, Organizer, Seminar, Company, ExhibitionComment, ExhibitionMedia, MediaDoc, User } from '../types';
import { StatusBadge, Spinner } from '../components/ui';
import FloorPlan from '../components/FloorPlan';
import AttachedFloorPlan from '../components/AttachedFloorPlan';
import {
  MapPin, Calendar, Users, Grid, Ticket, Building, Clock, Globe, Phone, Mail, ArrowRight, Star,
  Heart, Bookmark, Download, Instagram, Youtube, Facebook, Linkedin, Twitter, Check,
} from '../components/icons';
import { useAuth } from '../auth';
import { toEmbedUrl, mediaKind, youtubeThumb } from '../media';

type Detail = Exhibition & {
  organizer: Organizer;
  halls: Hall[];
  seminars: Seminar[];
  exhibitors: (Company & { stall_code: string; hall_name: string })[];
  documents?: MediaDoc[];
};

type SectionId = 'overview' | 'floor' | 'exhibitors' | 'media' | 'reviews' | 'schedule';

const SECTION_IDS: SectionId[] = ['overview', 'floor', 'exhibitors', 'media', 'reviews', 'schedule'];

function mapsOpenUrl(lat?: number, lng?: number, query?: string) {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Bengaluru')}`;
}

function favKey(slug: string) { return `expomela:fav:${slug}`; }
function followKey(id: number) { return `expomela:follow:org:${id}`; }

export default function ExhibitionDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const canManageMedia = isAdmin; // organizer tools = admin in this product
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [comments, setComments] = useState<ExhibitionComment[]>([]);
  const [media, setMedia] = useState<ExhibitionMedia[]>([]);
  const [fav, setFav] = useState(false);
  const [following, setFollowing] = useState(false);
  const [shareOk, setShareOk] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [floorView, setFloorView] = useState<'map' | 'book'>('map');
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/exhibitions/${slug}`).then((r) => {
      setData(r.data);
      setFav(localStorage.getItem(favKey(slug)) === '1');
      if (r.data.organizer?.id) setFollowing(localStorage.getItem(followKey(r.data.organizer.id)) === '1');
      const mode = r.data.floor_plan_mode || 'both';
      const hasAttach = !!r.data.floor_plan_url;
      if (mode === 'interactive' || (!hasAttach && mode !== 'attached')) setFloorView('book');
      else setFloorView('map');
    }).finally(() => setLoading(false));
    api.get(`/exhibitions/${slug}/comments`).then((r) => setComments(r.data)).catch(() => setComments([]));
    api.get(`/exhibitions/${slug}/media`).then((r) => setMedia(r.data)).catch(() => setMedia([]));
  }, [slug]);

  const avgRating = useMemo(() => {
    if (!comments.length) return 0;
    return Math.round((comments.reduce((n, c) => n + (c.rating || 0), 0) / comments.length) * 10) / 10;
  }, [comments]);

  const reels = useMemo(() => media.filter((m) => m.kind === 'reel' || mediaKind(m.url) === 'instagram'), [media]);
  const videos = useMemo(() => media.filter((m) => m.kind === 'video' || (m.kind !== 'photo' && m.kind !== 'reel' && mediaKind(m.url) === 'youtube')), [media]);
  const photos = useMemo(() => media.filter((m) => m.kind === 'photo'), [media]);

  const onMediaAdded = (item: ExhibitionMedia) => {
    setMedia((prev) => [item, ...prev]);
    if (item.kind === 'photo' && data) setData({ ...data, gallery: [item.url, ...(data.gallery || [])] });
  };

  const toggleFav = () => {
    if (!slug) return;
    const next = !fav;
    setFav(next);
    localStorage.setItem(favKey(slug), next ? '1' : '0');
  };
  const toggleFollow = () => {
    if (!data?.organizer?.id) return;
    const next = !following;
    setFollowing(next);
    localStorage.setItem(followKey(data.organizer.id), next ? '1' : '0');
  };
  const shareEvent = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: data?.name, text: data?.tagline, url });
      else { await navigator.clipboard.writeText(url); setShareOk(true); setTimeout(() => setShareOk(false), 2000); }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.05, 0.25] },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [data]);

  const goSection = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <Spinner label="Loading exhibition…" />;
  if (!data) return <div className="container-px py-24 text-center text-ink-500">Exhibition not found.</div>;

  const day = data.status === 'live' ? dayOfEvent(data.start_date, data.end_date) : null;
  const startsIn = data.status === 'upcoming' ? daysUntil(data.start_date) : null;
  const placeQuery = data.address || `${data.venue}, ${data.city}`;
  const mapLink = mapsOpenUrl(data.lat, data.lng, placeQuery);
  const docs = data.documents?.length ? data.documents : [];
  const allPhotos = [...(data.gallery || []), ...photos.map((p) => p.url)].filter((v, i, a) => a.indexOf(v) === i);
  const mediaCount = reels.length + videos.length + allPhotos.length + (data.reel_url ? 1 : 0) + (data.youtube_url ? 1 : 0);

  const NAV: { id: SectionId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'floor', label: 'Floor plan' },
    { id: 'exhibitors', label: 'Exhibitors', count: data.exhibitors.length },
    { id: 'media', label: 'Media', count: mediaCount },
    { id: 'reviews', label: 'Reviews', count: comments.length },
    { id: 'schedule', label: 'Schedule', count: data.seminars.length },
  ];

  return (
    <div className="pb-16">
      {/* ---- Compact cinematic hero ---- */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img src={data.banner} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/25" />
        </div>
        <div className="container-px relative pb-20 pt-8 lg:pb-24 lg:pt-10">
          <div className="flex items-center justify-between">
            <Link to="/exhibitions" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 hover:text-white">
              <ArrowRight width={16} className="rotate-180" /> All exhibitions
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFav}
                aria-label="Save"
                className={`grid h-10 w-10 place-items-center rounded-full backdrop-blur transition ${fav ? 'bg-brand text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
              >
                <Heart width={17} style={fav ? { fill: 'currentColor' } : undefined} />
              </button>
              <button
                onClick={shareEvent}
                aria-label="Share"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                {shareOk ? <Check width={17} /> : <ShareIcon />}
              </button>
            </div>
          </div>

          <div className="mt-10 max-w-3xl lg:mt-14">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              {day && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-bold text-emerald-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Day {day.current} of {day.total}
                </span>
              )}
              {startsIn != null && startsIn >= 0 && (
                <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-bold text-amber-200">Starts in {startsIn} days</span>
              )}
              {avgRating > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                  <Star width={12} style={{ fill: '#fbbf24', color: '#fbbf24' }} /> {avgRating}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl">{data.name}</h1>
            <p className="mt-3 max-w-2xl text-base text-white/80 sm:text-lg">{data.tagline}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button onClick={() => goSection('floor')} className="btn-primary px-5 py-2.5">
                <Grid width={16} /> {canBook && data.status !== 'past' ? 'Explore & book stalls' : 'Explore floor plan'}
              </button>
              {data.organizer && (
                <button
                  onClick={toggleFollow}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold backdrop-blur transition ${following ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
                >
                  {following ? <><Check width={15} /> Following</> : <>Follow {data.organizer.name.split(' ')[0]}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Ticket strip: key facts in one band, overlapping the hero ---- */}
      <div className="container-px relative z-10 -mt-12">
        <div className="grid grid-cols-2 overflow-hidden rounded-[1.5rem] border border-ink-100 bg-white shadow-[0_24px_60px_-28px_rgba(21,19,33,0.35)] lg:grid-cols-[1.2fr_1.4fr_1fr_1.4fr]">
          <TicketCell icon={<Calendar width={18} />} label="Dates">
            <span className="font-semibold text-ink-900">{formatDate(data.start_date)} – {formatDate(data.end_date)}</span>
          </TicketCell>
          <TicketCell icon={<MapPin width={18} />} label="Venue">
            <span className="truncate font-semibold text-ink-900">{data.venue}, {data.city}</span>
            <a href={mapLink} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
              Get directions <ArrowRight width={11} />
            </a>
          </TicketCell>
          <TicketCell icon={<Ticket width={18} />} label="Entry">
            <span className="font-semibold text-ink-900">{data.entry_free ? 'Free' : 'Paid pass'}</span>
            <span className="text-xs text-ink-400">{data.entry_free ? 'Register online' : 'Buy at venue / online'}</span>
          </TicketCell>
          <div className="col-span-2 flex items-center justify-around gap-2 border-t border-dashed border-ink-200 px-5 py-4 lg:col-span-1 lg:border-l lg:border-t-0">
            <TicketStat value={data.exhibitors.length || data.companies || '—'} label="Exhibitors" />
            <TicketStat value={data.total_stalls ?? '—'} label="Stalls" />
            <TicketStat
              value={(data.status === 'live' ? data.visitors_today : data.total_visitors).toLocaleString('en-IN')}
              label={data.status === 'live' ? 'Today' : 'Visitors'}
            />
          </div>
        </div>
      </div>

      {/* ---- Scroll-spy section nav ---- */}
      <div ref={navRef} className="sticky top-16 z-30 mt-8 border-b border-ink-100 bg-[var(--paper)]/95 backdrop-blur">
        <div className="container-px">
          <div className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
            {NAV.map((t) => (
              <button
                key={t.id}
                onClick={() => goSection(t.id)}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3.5 text-sm font-semibold transition-colors ${activeSection === t.id ? 'text-brand-700' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeSection === t.id ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>{t.count}</span>
                )}
                {activeSection === t.id && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- All sections, stacked ---- */}
      <div className="mt-2">
        {/* 01 · Overview: about left, organizer vertical card right */}
        <section id="overview" className="container-px scroll-mt-32 py-12">
          <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr]">
            <div>
              <SectionTitle eyebrow="01 · Know the event" title="About this exhibition" />
              <p className="mt-5 text-base leading-relaxed text-ink-600 sm:text-[17px]">{data.about}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Chip>{data.industry}</Chip>
                <Chip>{data.city}</Chip>
                {!!data.b2b && <Chip>B2B</Chip>}
                {!!data.international && <Chip>International</Chip>}
                {!!data.government && <Chip>Government</Chip>}
                {!!data.entry_free && <Chip>Free entry</Chip>}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Building, t: 'Live product demos', d: 'See launches and machinery in action across halls.' },
                  { icon: Users, t: 'Meet exhibitors', d: 'Tap any stall on the floor map to open company profiles.' },
                  { icon: Ticket, t: 'Seminars & talks', d: 'Expert sessions scheduled throughout the show days.' },
                  { icon: Grid, t: '2D & 3D floor plan', d: 'Toggle views, filter available stalls, book in two steps.' },
                ].map((f) => (
                  <div key={f.t} className="flex gap-3.5 rounded-2xl border border-ink-100 bg-white p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><f.icon width={19} /></span>
                    <div>
                      <div className="font-semibold text-ink-900">{f.t}</div>
                      <div className="mt-0.5 text-sm text-ink-500">{f.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Documents inline under about */}
              <div className="mt-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">Event documents</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {docs.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-ink-200 bg-ink-50 py-8 text-center text-sm text-ink-500">Documents coming soon.</div>
                  ) : docs.map((d) => (
                    <a
                      key={d.name}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3.5 rounded-2xl border border-ink-100 bg-white p-3.5 transition-shadow hover:shadow-soft"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                        <Download width={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink-900">{d.name}</div>
                        <div className="text-[10px] uppercase text-ink-400">{d.type || 'PDF'} file</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {data.address && (
                <p className="mt-6 text-sm text-ink-400"><MapPin width={13} className="mr-1 inline" />{data.address}</p>
              )}
              {isAdmin && data.status !== 'past' && (
                <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-ink-50 px-4 py-3">
                  <span className="text-[11px] uppercase tracking-wide text-ink-400">Exhibitor pricing · admin</span>
                  <span className="font-display text-xl font-extrabold text-ink-900">{formatINR(data.price_from)} <span className="text-sm font-medium text-ink-400">/ stall from</span></span>
                </div>
              )}
            </div>

            {/* Organizer — vertical card on the right */}
            {data.organizer && (
              <aside>
                <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
                  <div className="relative h-20 bg-grad">
                    <span className="absolute left-5 top-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Organized by</span>
                    <img src={data.organizer.logo} alt="" className="absolute -bottom-7 left-5 h-16 w-16 rounded-2xl border-4 border-white bg-white shadow-md" />
                  </div>
                  <div className="px-5 pb-6 pt-10">
                    <div className="font-display text-lg font-bold text-ink-900">{data.organizer.name}</div>
                    <p className="mt-2.5 text-sm leading-relaxed text-ink-500">{data.organizer.about}</p>
                    <button
                      onClick={toggleFollow}
                      className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition ${following ? 'bg-emerald-50 text-emerald-700' : 'bg-brand text-white hover:bg-brand-600'}`}
                    >
                      {following ? '✓ Following' : '+ Follow organizer'}
                    </button>
                    <div className="mt-5 space-y-2.5 border-t border-ink-50 pt-4 text-sm text-ink-600">
                      <div className="flex items-center gap-2.5"><Globe width={15} className="shrink-0 text-ink-400" /> <span className="truncate">{data.organizer.website}</span></div>
                      <div className="flex items-center gap-2.5"><Mail width={15} className="shrink-0 text-ink-400" /> <span className="truncate">{data.organizer.email}</span></div>
                      <div className="flex items-center gap-2.5"><Phone width={15} className="shrink-0 text-ink-400" /> {data.organizer.phone}</div>
                    </div>
                    <div className="mt-4 flex gap-2 border-t border-ink-50 pt-4">
                      <SocialBtn href="#" label="Instagram"><Instagram /></SocialBtn>
                      <SocialBtn href="#" label="YouTube"><Youtube /></SocialBtn>
                      <SocialBtn href="#" label="LinkedIn"><Linkedin /></SocialBtn>
                      <SocialBtn href="#" label="Facebook"><Facebook /></SocialBtn>
                      <SocialBtn href="#" label="X"><Twitter /></SocialBtn>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </section>

        {/* 02 · Floor plan — full-bleed tinted band */}
        <section id="floor" className="scroll-mt-32 border-y border-ink-100 bg-ink-50/60 py-12">
          <div className="container-px">
            <SectionTitle
              eyebrow="02 · Walk the halls"
              title="Floor plan"
              subtitle={
                data.floor_plan_url
                  ? 'View the official organizer map, or book stalls on the interactive plan.'
                  : 'Click any stall to open the exhibitor company, contacts and booth highlights.'
              }
            />
            <div className="mt-6">
              {data.status === 'past' ? (
                <div className="rounded-3xl border border-dashed border-ink-200 bg-white py-16 text-center text-ink-500">
                  This exhibition has concluded. The final stall layout is archived.
                </div>
              ) : (
                <FloorPlanSection data={data} floorView={floorView} setFloorView={setFloorView} />
              )}
            </div>
          </div>
        </section>

        {/* 03 · Exhibitors */}
        <section id="exhibitors" className="container-px scroll-mt-32 py-12">
          <SectionTitle eyebrow="03 · Who's showing" title="Exhibitors" subtitle="Brands you’ll meet on the show floor — tap to open the profile." />
          <div>
            {data.exhibitors.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center text-ink-500">Exhibitor list opens closer to the event.</div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.exhibitors.map((c, i) => (
                  <Link
                    key={`${c.id}-${c.stall_code}`}
                    to={`/company/${c.id}?exhibition=${data.id}`}
                    className="group relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft"
                  >
                    {i < 3 && (
                      <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Top {i + 1}</span>
                    )}
                    <img src={c.logo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                    <div className="mt-3 truncate font-display text-base font-bold text-ink-900">{c.name}</div>
                    <div className="truncate text-xs text-ink-400">{c.industry}</div>
                    <div className="mt-2 text-[11px] font-semibold text-brand-600">{c.hall_name} · Stall {c.stall_code}</div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-400 group-hover:text-brand-600">
                      View profile <ArrowRight width={13} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 04 · Media — dark media wall */}
        <section id="media" className="scroll-mt-32 bg-ink-950 py-14">
          <div className="container-px space-y-12">
            {/* Reels */}
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <SectionTitle tone="dark" eyebrow="04 · Watch it live" title="Reels & shorts" subtitle="Quick clips from the venue." />
                {canManageMedia && <span className="pill border border-white/20 bg-white/10 text-white">Organizer / admin</span>}
              </div>
              {(data.reel_url || reels.length > 0) ? (
                <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3">
                  {data.reel_url && <ReelCard url={data.reel_url} caption="Official event reel" author="Organizer" />}
                  {reels.map((m) => (
                    <ReelCard key={m.id} url={m.url} caption={m.caption || 'Shared reel'} author={m.author_name} />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
                  No reels yet{canManageMedia ? ' — add one below.' : '.'}
                </div>
              )}
              {canManageMedia && (
                <div className="mt-5">
                  <AddMediaForm slug={data.slug} defaultName={user?.name} defaultKind="reel" onAdded={onMediaAdded} lockedKind="reel" />
                </div>
              )}
            </div>

            {/* Videos — cinema layout */}
            <div>
              <SectionTitle tone="dark" title="Videos" subtitle="Pick from the playlist — plays in the big screen." />
              {(data.youtube_url || videos.length > 0) ? (
                <VideoCinema
                  items={[
                    ...(data.youtube_url ? [{ key: 'official', url: data.youtube_url, title: 'Official highlights', subtitle: 'Organizer' }] : []),
                    ...videos.map((m) => ({ key: String(m.id), url: m.url, title: m.caption || 'Shared video', subtitle: `by ${m.author_name}` })),
                  ]}
                />
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
                  No videos yet{canManageMedia ? ' — add one below.' : '.'}
                </div>
              )}
              {canManageMedia && (
                <div className="mt-5">
                  <AddMediaForm slug={data.slug} defaultName={user?.name} defaultKind="video" onAdded={onMediaAdded} allowUpload lockedKind="video" />
                </div>
              )}
            </div>

            {/* Photos */}
            <div>
              <SectionTitle tone="dark" title="Photo gallery" subtitle="Moments from the halls." />
              {allPhotos.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {allPhotos.map((g, i) => (
                    <button key={`${g}-${i}`} onClick={() => setLightbox(g)} className="group overflow-hidden rounded-2xl">
                      <img src={g} alt="" className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105 md:h-40" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/50">Photos will appear here when the organizer adds them.</p>
              )}
              {canManageMedia && (
                <div className="mt-5">
                  <AddMediaForm slug={data.slug} defaultName={user?.name} defaultKind="photo" onAdded={onMediaAdded} allowUpload lockedKind="photo" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 05 · Reviews */}
        <section id="reviews" className="container-px scroll-mt-32 py-12">
          <SectionTitle
            eyebrow="05 · Visitor voices"
            title="Reviews & comments"
            subtitle={`${comments.length} review${comments.length === 1 ? '' : 's'}${avgRating ? ` · ${avgRating}/5 average` : ''}`}
          />
          <Comments
            comments={comments}
            slug={data.slug}
            user={user}
            onPosted={(c) => setComments((prev) => [c, ...prev])}
          />
        </section>

        {/* 06 · Schedule — timeline */}
        <section id="schedule" className="scroll-mt-32 border-t border-ink-100 bg-ink-50/60 py-12">
          <div className="container-px">
            <SectionTitle eyebrow="06 · Plan your day" title="Seminar schedule" subtitle="Talks and panels during the show." />
            <div className="mt-8 max-w-3xl">
              {data.seminars.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-ink-200 bg-white py-12 text-center text-ink-500">Schedule coming soon.</div>
              ) : (
                <div className="relative ml-2 space-y-6 border-l-2 border-brand-200 pl-7">
                  {data.seminars.map((s) => (
                    <div key={s.id} className="relative">
                      <span className="absolute -left-[37px] top-4 h-4 w-4 rounded-full border-4 border-white bg-brand" />
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase text-brand-700">{s.day}</span>
                        <div className="min-w-[180px] flex-1">
                          <div className="font-semibold text-ink-900">{s.title}</div>
                          <div className="text-sm text-ink-500">by {s.speaker}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center justify-end gap-1.5 font-medium text-ink-700"><Clock width={15} /> {s.time}</div>
                          <div className="text-xs text-ink-400">{s.hall}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
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

/* ---------------- Building blocks ---------------- */

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function SectionTitle({ title, subtitle, eyebrow, tone = 'light' }: { title: string; subtitle?: string; eyebrow?: string; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <div>
      {eyebrow && (
        <div className={`mb-2 text-[11px] font-bold uppercase tracking-[0.18em] ${dark ? 'text-brand-300' : 'text-brand-600'}`}>{eyebrow}</div>
      )}
      <h2 className={`font-display text-2xl font-extrabold sm:text-3xl ${dark ? 'text-white' : 'text-ink-900'}`}>{title}</h2>
      {subtitle && <p className={`mt-1.5 max-w-2xl text-sm sm:text-base ${dark ? 'text-white/60' : 'text-ink-500'}`}>{subtitle}</p>}
      <div className="mt-3 h-1 w-12 rounded-full bg-grad" />
    </div>
  );
}

function TicketCell({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-ink-100 px-5 py-4 [&:not(:first-child)]:border-l max-lg:[&:nth-child(odd)]:border-l-0 max-lg:[&:nth-child(n+3)]:border-t">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</span>
        {children}
      </div>
    </div>
  );
}

function TicketStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-xl font-extrabold text-ink-900">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">{children}</span>;
}

function SocialBtn({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} className="grid h-9 w-9 place-items-center rounded-full bg-ink-50 text-ink-600 transition hover:bg-brand-50 hover:text-brand-600">
      {children}
    </a>
  );
}

/** Phone-framed reel card for the dark media wall. */
function ReelCard({ url, caption, author }: { url: string; caption: string; author: string }) {
  const embed = toEmbedUrl(url);
  const kind = mediaKind(url);
  return (
    <div className="group w-[240px] shrink-0 snap-start sm:w-[260px]">
      <div className="rounded-[2rem] border border-white/15 bg-ink-900 p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:-translate-y-1.5">
        {/* Phone notch */}
        <div className="mx-auto mb-1.5 h-1.5 w-14 rounded-full bg-white/15" />
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.45rem] bg-ink-950">
          {embed ? (
            <iframe title={caption} src={embed} className="h-full w-full border-0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="grid h-full place-items-center p-3 text-center text-[10px] text-white/70 break-all">{url}</a>
          )}
        </div>
        <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-2.5">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${kind === 'instagram' ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600' : 'bg-red-600'} text-white`}>
            {kind === 'instagram' ? <Instagram width={13} /> : <Youtube width={13} />}
          </span>
          <div className="min-w-0">
            <div className="line-clamp-1 text-xs font-semibold text-white">{caption}</div>
            <div className="truncate text-[10px] text-white/50">{author}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

type CinemaItem = { key: string; url: string; title: string; subtitle?: string };

/** Cinema layout — one large featured player, playlist of the rest beside it. */
function VideoCinema({ items }: { items: CinemaItem[] }) {
  const [current, setCurrent] = useState(0);
  const active = items[Math.min(current, items.length - 1)];
  const embed = toEmbedUrl(active.url);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1.9fr_1fr]">
      {/* Featured player */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
        <div className="aspect-video bg-ink-950">
          {embed ? (
            <iframe
              key={active.key}
              title={active.title}
              src={embed}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video key={active.key} src={active.url} controls className="h-full w-full object-contain" />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{active.title}</div>
            {active.subtitle && <div className="truncate text-[11px] text-white/50">{active.subtitle}</div>}
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/60">
            {current + 1} / {items.length}
          </span>
        </div>
      </div>

      {/* Playlist */}
      <div className="no-scrollbar flex gap-3 overflow-x-auto lg:max-h-[440px] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
        {items.map((v, i) => {
          const thumb = youtubeThumb(v.url);
          const isActive = i === current;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setCurrent(i)}
              className={`flex w-[240px] shrink-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition lg:w-full ${
                isActive ? 'border-brand-400/60 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-950">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-white/40"><Youtube width={18} /></div>
                )}
                <span className="absolute inset-0 grid place-items-center">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-white backdrop-blur transition ${isActive ? 'bg-brand' : 'bg-black/50'}`}>
                    {isActive ? <span className="text-[8px] font-black tracking-widest">▶</span> : <span className="ml-0.5 text-[10px]">▶</span>}
                  </span>
                </span>
              </div>
              <div className="min-w-0">
                <div className={`line-clamp-2 text-xs font-semibold ${isActive ? 'text-white' : 'text-white/80'}`}>{v.title}</div>
                {v.subtitle && <div className="mt-0.5 truncate text-[10px] text-white/40">{v.subtitle}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddMediaForm({
  slug,
  defaultName,
  defaultKind,
  onAdded,
  allowUpload,
  lockedKind,
}: {
  slug: string;
  defaultName?: string;
  defaultKind: 'video' | 'photo' | 'reel';
  onAdded: (m: ExhibitionMedia) => void;
  allowUpload?: boolean;
  lockedKind?: 'video' | 'photo' | 'reel';
}) {
  const [kind, setKind] = useState<'video' | 'photo' | 'reel'>(lockedKind || defaultKind);
  const [name, setName] = useState(defaultName || '');
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk(false);
    setBusy(true);
    try {
      const r = await api.post(`/exhibitions/${slug}/media`, { author_name: name || defaultName || 'Organizer', kind, url, caption });
      onAdded(r.data);
      setUrl('');
      setCaption('');
      setOk(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not add media');
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > 4_500_000) {
      setError('File too large for demo upload (max ~4.5MB). Use a link instead.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUrl(String(reader.result || ''));
      if (!lockedKind) setKind(file.type.startsWith('video') ? 'video' : 'photo');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink-900">
            Add {kind === 'reel' ? 'reel' : kind === 'video' ? 'video' : 'photo'}
          </h3>
          <p className="text-xs text-ink-500">Visible to everyone · only organizers & admins can publish</p>
        </div>
      </div>
      {!lockedKind && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(['reel', 'video', 'photo'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${kind === k ? 'bg-brand-600 text-white' : 'bg-white text-ink-600'}`}
            >
              {k}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Credit name" className="input py-2 text-sm" />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className="input py-2 text-sm" />
      </div>
      <input
        value={url.startsWith('data:') ? '' : url}
        onChange={(e) => setUrl(e.target.value)}
        required={!url.startsWith('data:')}
        placeholder={kind === 'reel' ? 'Instagram / YouTube Shorts URL' : kind === 'video' ? 'YouTube URL' : 'Image URL'}
        className="input mt-2 py-2 text-sm"
      />
      {url.startsWith('data:') && <p className="mt-1.5 text-xs text-emerald-600">File ready ✓</p>}
      {allowUpload && (
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 bg-white px-3 py-2.5 text-xs font-medium text-ink-600 hover:border-brand">
          <Bookmark width={14} /> Upload {kind === 'photo' ? 'image' : 'file'}
          <input type="file" accept={kind === 'photo' ? 'image/*' : 'video/*,image/*'} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
      {error && <p className="mt-2 text-sm text-brand-700">{error}</p>}
      {ok && <p className="mt-2 text-sm text-emerald-600">Published</p>}
      <button type="submit" disabled={busy || !url} className="btn-primary mt-3 text-sm">{busy ? 'Saving…' : `Publish ${kind}`}</button>
    </form>
  );
}

function FloorPlanSection({
  data,
  floorView,
  setFloorView,
}: {
  data: Detail;
  floorView: 'map' | 'book';
  setFloorView: (v: 'map' | 'book') => void;
}) {
  const mode = data.floor_plan_mode || 'both';
  const hasAttach = !!data.floor_plan_url;
  const hasInteractive = (data.halls?.length || 0) > 0;
  const showTabs = hasAttach && hasInteractive && mode === 'both';
  const showMap = hasAttach && (
    mode === 'attached'
    || (mode === 'both' && (!hasInteractive || floorView === 'map'))
  );
  const showBook = hasInteractive && (
    mode === 'interactive'
    || (mode === 'both' && (!hasAttach || floorView === 'book'))
  );

  if (!hasAttach && !hasInteractive) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center text-ink-500">
        Floor plan coming soon.
      </div>
    );
  }

  return (
    <>
      {showTabs && (
        <div className="mb-4 inline-flex rounded-full border border-ink-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setFloorView('map')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${floorView === 'map' ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'}`}
          >
            Official map
          </button>
          <button
            type="button"
            onClick={() => setFloorView('book')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${floorView === 'book' ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'}`}
          >
            Book stalls
          </button>
        </div>
      )}
      {showMap && data.floor_plan_url && (
        <div className={showBook && showTabs ? 'mb-6' : ''}>
          <AttachedFloorPlan url={data.floor_plan_url} title={`${data.name} · official floor plan`} />
        </div>
      )}
      {showBook && <FloorPlan halls={data.halls} exhibitionName={data.name} />}
    </>
  );
}

function Comments({
  comments,
  slug,
  user,
  onPosted,
}: {
  comments: ExhibitionComment[];
  slug: string;
  user: User | null;
  onPosted: (c: ExhibitionComment) => void;
}) {
  const [city, setCity] = useState('Bengaluru');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setBusy(true);
    try {
      const r = await api.post(`/exhibitions/${slug}/comments`, {
        author_name: user.name,
        author_city: city,
        body,
        rating,
      });
      onPosted(r.data);
      setBody('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not post comment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      {user ? (
        <form onSubmit={submit} className="h-fit space-y-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div>
            <h3 className="font-display text-base font-bold text-ink-900">Write a review</h3>
            <p className="text-xs text-ink-400">Posting as <span className="font-semibold text-ink-700">{user.name}</span></p>
          </div>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" className="input py-2.5 text-sm" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star width={22} style={{ color: n <= rating ? '#fbbf24' : '#d1d5db', fill: n <= rating ? '#fbbf24' : 'transparent' }} />
              </button>
            ))}
            <span className="ml-2 text-xs text-ink-400">{rating}/5</span>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} placeholder="Share your experience at this expo…" className="input min-h-[100px] text-sm" />
          {error && <p className="text-sm text-brand-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Posting…' : 'Post review'}</button>
        </form>
      ) : (
        <div className="flex h-fit flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-6 py-12 text-center">
          <Star width={28} className="text-amber-400" style={{ fill: '#fbbf24' }} />
          <h3 className="mt-3 font-display text-lg font-bold text-ink-900">Sign in to leave a review</h3>
          <p className="mt-1.5 max-w-xs text-sm text-ink-500">
            Reviews help other visitors plan their trip. Create a free account or log in to post.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/login" state={{ from: `/exhibitions/${slug}` }} className="btn-primary px-5 py-2.5 text-sm">Sign in</Link>
            <Link to="/register" className="btn-outline px-5 py-2.5 text-sm">Create account</Link>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-12 text-center text-sm text-ink-500">
            No reviews yet — be the first after signing in.
          </div>
        ) : comments.map((c) => (
          <div key={c.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {c.author_name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-900">{c.author_name}</div>
                  <div className="text-[11px] text-ink-400">{c.author_city || 'India'} · {formatDate(c.created_at.slice(0, 10))}</div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} width={12} style={{ color: i < c.rating ? '#fbbf24' : '#e5e7eb', fill: i < c.rating ? '#fbbf24' : 'transparent' }} />
                ))}
              </div>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
