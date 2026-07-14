import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatDate, formatINR, daysUntil, dayOfEvent } from '../api';
import type { Exhibition, Hall, Organizer, Seminar, Company, ExhibitionComment, ExhibitionMedia, MediaDoc } from '../types';
import { StatusBadge, Spinner } from '../components/ui';
import FloorPlan from '../components/FloorPlan';
import {
  MapPin, Calendar, Users, Grid, Ticket, Building, Clock, Globe, Phone, Mail, ArrowRight, Star,
  Heart, Bookmark, Download, Instagram, Youtube, Facebook, Linkedin, Twitter, Check,
} from '../components/icons';
import { useAuth } from '../auth';
import { toEmbedUrl, mediaKind } from '../media';

type Detail = Exhibition & {
  organizer: Organizer;
  halls: Hall[];
  seminars: Seminar[];
  exhibitors: (Company & { stall_code: string; hall_name: string })[];
  documents?: MediaDoc[];
};

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'floor', label: 'Floor plan' },
  { id: 'exhibitors', label: 'Top exhibitors' },
  { id: 'docs', label: 'Documents' },
  { id: 'reels', label: 'Reels' },
  { id: 'videos', label: 'Videos' },
  { id: 'gallery', label: 'Photos' },
  { id: 'comments', label: 'Reviews' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'location', label: 'Location' },
] as const;

function mapsEmbedUrl(lat?: number, lng?: number, query?: string) {
  if (lat != null && lng != null) return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query || 'Bengaluru')}&z=14&output=embed`;
}
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
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [comments, setComments] = useState<ExhibitionComment[]>([]);
  const [media, setMedia] = useState<ExhibitionMedia[]>([]);
  const [fav, setFav] = useState(false);
  const [following, setFollowing] = useState(false);
  const [shareOk, setShareOk] = useState(false);
  const [activeSection, setActiveSection] = useState('about');
  const floorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/exhibitions/${slug}`).then((r) => {
      setData(r.data);
      setFav(localStorage.getItem(favKey(slug)) === '1');
      if (r.data.organizer?.id) setFollowing(localStorage.getItem(followKey(r.data.organizer.id)) === '1');
    }).finally(() => setLoading(false));
    api.get(`/exhibitions/${slug}/comments`).then((r) => setComments(r.data)).catch(() => setComments([]));
    api.get(`/exhibitions/${slug}/media`).then((r) => setMedia(r.data)).catch(() => setMedia([]));
  }, [slug]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.35] },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [data]);

  const avgRating = useMemo(() => {
    if (!comments.length) return 0;
    return Math.round((comments.reduce((n, c) => n + (c.rating || 0), 0) / comments.length) * 10) / 10;
  }, [comments]);

  const reels = useMemo(() => media.filter((m) => m.kind === 'reel' || mediaKind(m.url) === 'instagram'), [media]);
  const videos = useMemo(() => media.filter((m) => m.kind === 'video' || (m.kind !== 'photo' && m.kind !== 'reel' && mediaKind(m.url) === 'youtube')), [media]);
  const photos = useMemo(() => media.filter((m) => m.kind === 'photo'), [media]);
  const topExhibitors = useMemo(() => (data?.exhibitors || []).slice(0, 8), [data]);

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
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <Spinner label="Loading exhibition…" />;
  if (!data) return <div className="container-px py-24 text-center text-ink-500">Exhibition not found.</div>;

  const day = data.status === 'live' ? dayOfEvent(data.start_date, data.end_date) : null;
  const startsIn = data.status === 'upcoming' ? daysUntil(data.start_date) : null;
  const placeQuery = `${data.venue}, ${data.city}`;
  const mapSrc = mapsEmbedUrl(data.lat, data.lng, placeQuery);
  const mapLink = mapsOpenUrl(data.lat, data.lng, placeQuery);
  const docs = data.documents?.length ? data.documents : [];
  const allPhotos = [...(data.gallery || []), ...photos.map((p) => p.url)].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="pb-16">
      {/* Immersive hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={data.banner} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
        </div>
        <div className="container-px relative pb-10 pt-8 lg:pb-14 lg:pt-12">
          <Link to="/exhibitions" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/75 hover:text-white">
            <ArrowRight width={16} className="rotate-180" /> All exhibitions
          </Link>
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              {data.tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">{t}</span>
              ))}
              {avgRating > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                  <Star width={12} style={{ fill: '#fbbf24', color: '#fbbf24' }} /> {avgRating} · {comments.length} reviews
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl lg:text-[3.4rem]">{data.name}</h1>
            <p className="mt-3 max-w-2xl text-base text-white/80 sm:text-lg">{data.tagline}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              <span className="flex items-center gap-1.5"><MapPin width={16} className="text-brand-300" /> {data.venue}, {data.city}</span>
              <span className="flex items-center gap-1.5"><Calendar width={16} className="text-brand-300" /> {formatDate(data.start_date)} – {formatDate(data.end_date)}</span>
              {day && <span className="flex items-center gap-1.5 font-semibold text-amber-300"><Clock width={16} /> Day {day.current} of {day.total}</span>}
              {startsIn != null && startsIn >= 0 && <span className="flex items-center gap-1.5 font-semibold text-amber-300"><Clock width={16} /> Starts in {startsIn} days</span>}
            </div>
          </div>

          {/* Actions: favourite / share / follow — no stall price for visitors */}
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <button onClick={() => scrollTo('floor')} className="btn-primary px-5 py-2.5">
              <Grid width={16} /> Explore floor plan
            </button>
            {canBook && data.status !== 'past' && (
              <button onClick={() => scrollTo('floor')} className="btn border-2 border-white/40 bg-white/10 px-5 py-2.5 text-white hover:bg-white/20">
                Book stall · from {formatINR(data.price_from)}
              </button>
            )}
            <button onClick={toggleFav} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold backdrop-blur transition ${fav ? 'bg-brand text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}>
              <Heart width={16} style={fav ? { fill: 'currentColor' } : undefined} /> {fav ? 'Saved' : 'Favourite'}
            </button>
            <button onClick={shareEvent} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/25">
              <ShareIcon /> {shareOk ? 'Link copied' : 'Share'}
            </button>
            {data.organizer && (
              <button onClick={toggleFollow} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold backdrop-blur ${following ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                {following ? <><Check width={15} /> Following organizer</> : <>Follow {data.organizer.name.split(' ')[0]}</>}
              </button>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label="Exhibitors" value={data.exhibitors.length || data.companies || '—'} />
            <HeroStat label="Stalls" value={data.total_stalls ?? '—'} />
            <HeroStat label={data.status === 'live' ? 'Visitors today' : 'Total visitors'} value={(data.status === 'live' ? data.visitors_today : data.total_visitors).toLocaleString('en-IN')} />
            <HeroStat label="Halls" value={data.halls.length} />
          </div>
        </div>
      </section>

      {/* Sticky section nav */}
      <div className="sticky top-16 z-30 border-b border-ink-100 bg-[var(--paper)]/95 backdrop-blur">
        <div className="container-px">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`relative whitespace-nowrap px-3.5 py-3.5 text-sm font-semibold transition-colors ${activeSection === s.id ? 'text-brand-700' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {s.label}
                {activeSection === s.id && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-px mt-10 space-y-16 lg:space-y-20">
        {/* About */}
        <section id="about" className="scroll-mt-36">
          <SectionTitle title="About this exhibition" subtitle="Everything you need to know before you visit." />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="text-base leading-relaxed text-ink-600 sm:text-[17px]">{data.about}</p>
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
                  { icon: Grid, t: 'Interactive floor plan', d: 'Find booths visually and save your favourites.' },
                ].map((f) => (
                  <div key={f.t} className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><f.icon width={18} /></span>
                    <div><div className="font-semibold text-ink-900">{f.t}</div><div className="text-sm text-ink-500">{f.d}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <aside className="space-y-4">
              <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-400">Event snapshot</h3>
                <dl className="space-y-3.5 text-sm">
                  <Row icon={<Calendar width={16} />} label="Dates" value={`${formatDate(data.start_date)} – ${formatDate(data.end_date)}`} />
                  <Row icon={<MapPin width={16} />} label="Venue" value={`${data.venue}, ${data.city}`} />
                  <Row icon={<Ticket width={16} />} label="Visitor entry" value={data.entry_free ? 'Free (register online)' : 'Paid visitor pass'} />
                  <Row icon={<Users width={16} />} label="Exhibitors" value={`${data.exhibitors.length} listed`} />
                </dl>
                {canBook && data.status !== 'past' && (
                  <div className="mt-5 rounded-2xl bg-ink-50 p-3.5">
                    <div className="text-[11px] uppercase tracking-wide text-ink-400">Exhibitor pricing</div>
                    <div className="font-display text-2xl font-extrabold text-ink-900">{formatINR(data.price_from)} <span className="text-sm font-medium text-ink-400">/ stall from</span></div>
                  </div>
                )}
              </div>
              {data.organizer && (
                <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-400">Organizer</h3>
                  <div className="flex items-center gap-3">
                    <img src={data.organizer.logo} alt="" className="h-12 w-12 rounded-xl" />
                    <div>
                      <div className="font-semibold text-ink-900">{data.organizer.name}</div>
                      <button onClick={toggleFollow} className="text-xs font-semibold text-brand-600">{following ? 'Following ✓' : '+ Follow'}</button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ink-500">{data.organizer.about}</p>
                  <div className="mt-4 space-y-2 text-sm text-ink-600">
                    <div className="flex items-center gap-2"><Globe width={15} className="text-ink-400" /> {data.organizer.website}</div>
                    <div className="flex items-center gap-2"><Mail width={15} className="text-ink-400" /> {data.organizer.email}</div>
                    <div className="flex items-center gap-2"><Phone width={15} className="text-ink-400" /> {data.organizer.phone}</div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Follow us</div>
                    <div className="flex gap-2">
                      <SocialBtn href="#" label="Instagram"><Instagram /></SocialBtn>
                      <SocialBtn href="#" label="YouTube"><Youtube /></SocialBtn>
                      <SocialBtn href="#" label="LinkedIn"><Linkedin /></SocialBtn>
                      <SocialBtn href="#" label="Facebook"><Facebook /></SocialBtn>
                      <SocialBtn href="#" label="X"><Twitter /></SocialBtn>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* Floor plan — most important */}
        <section id="floor" ref={floorRef} className="scroll-mt-36">
          <SectionTitle
            title="Interactive floor plan"
            subtitle="Click any stall to open the exhibitor company, contacts and booth highlights."
          />
          <div className="mt-6">
            {data.status === 'past' ? (
              <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-16 text-center text-ink-500">
                This exhibition has concluded. The final stall layout is archived.
              </div>
            ) : (
              <FloorPlan halls={data.halls} exhibitionName={data.name} />
            )}
          </div>
        </section>

        {/* Top exhibitors */}
        <section id="exhibitors" className="scroll-mt-36">
          <SectionTitle title="Top exhibitors" subtitle="Featured brands you’ll meet on the show floor." />
          {topExhibitors.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center text-ink-500">Exhibitor list opens closer to the event.</div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topExhibitors.map((c, i) => (
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
        </section>

        {/* Documents */}
        <section id="docs" className="scroll-mt-36">
          <SectionTitle title="Event documents" subtitle="Download visitor guides, maps and manuals as PDF." />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {docs.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center text-ink-500">Documents coming soon.</div>
            ) : docs.map((d) => (
              <a
                key={d.name}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 transition-shadow hover:shadow-soft"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Download width={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-900">{d.name}</div>
                  <div className="text-xs uppercase text-ink-400">{d.type || 'PDF'} file</div>
                </div>
                <span className="text-sm font-semibold text-brand-600">Open</span>
              </a>
            ))}
          </div>
        </section>

        {/* Reels */}
        <section id="reels" className="scroll-mt-36">
          <SectionTitle title="Reels & shorts" subtitle="Instagram and YouTube Shorts from the venue — add yours too." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.reel_url && (
              <ReelCard url={data.reel_url} caption="Official event reel" author="Organizer" />
            )}
            {reels.map((m) => (
              <ReelCard key={m.id} url={m.url} caption={m.caption || 'Shared reel'} author={m.author_name} />
            ))}
          </div>
          <div className="mt-6">
            <AddMediaForm slug={data.slug} defaultName={user?.name} defaultKind="reel" onAdded={onMediaAdded} />
          </div>
        </section>

        {/* Videos */}
        <section id="videos" className="scroll-mt-36">
          <SectionTitle title="Videos" subtitle="Walkthroughs and highlights. Paste a YouTube link or upload a short clip URL." />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {data.youtube_url && (
              <VideoCard url={data.youtube_url} title="Official highlights" />
            )}
            {videos.map((m) => (
              <VideoCard key={m.id} url={m.url} title={m.caption || 'Shared video'} subtitle={`by ${m.author_name}`} />
            ))}
          </div>
          <div className="mt-6">
            <AddMediaForm slug={data.slug} defaultName={user?.name} defaultKind="video" onAdded={onMediaAdded} allowUpload />
          </div>
        </section>

        {/* Gallery */}
        <section id="gallery" className="scroll-mt-36">
          <SectionTitle title="Photo gallery" subtitle="Moments from the halls — upload or paste an image link." />
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {allPhotos.map((g, i) => (
              <button key={`${g}-${i}`} onClick={() => setLightbox(g)} className="group overflow-hidden rounded-2xl">
                <img src={g} alt="" className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105 md:h-48" />
              </button>
            ))}
          </div>
          <div className="mt-6">
            <AddMediaForm slug={data.slug} defaultName={user?.name} defaultKind="photo" onAdded={onMediaAdded} allowUpload />
          </div>
        </section>

        {/* Comments / ratings */}
        <section id="comments" className="scroll-mt-36">
          <SectionTitle title="Reviews & comments" subtitle={`${comments.length} visitor reviews${avgRating ? ` · ${avgRating}/5 average` : ''}`} />
          <Comments
            comments={comments}
            slug={data.slug}
            defaultName={user?.name}
            onPosted={(c) => setComments((prev) => [c, ...prev])}
          />
        </section>

        {/* Schedule */}
        <section id="schedule" className="scroll-mt-36">
          <SectionTitle title="Seminar schedule" subtitle="Talks and panels during the show." />
          <div className="mt-6 space-y-3">
            {data.seminars.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center text-ink-500">Schedule coming soon.</div>
            ) : data.seminars.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-center text-brand-700">
                  <div className="text-[10px] font-bold uppercase">{s.day}</div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-ink-900">{s.title}</div>
                  <div className="text-sm text-ink-500">by {s.speaker}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="flex items-center gap-1.5 font-medium text-ink-700"><Clock width={15} /> {s.time}</div>
                  <div className="text-xs text-ink-400">{s.hall}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Location */}
        <section id="location" className="scroll-mt-36">
          <SectionTitle title="Venue & map" subtitle="Find your way to the exhibition centre." />
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="overflow-hidden rounded-3xl border border-ink-100 lg:col-span-2">
              <iframe title={`${data.name} map`} src={mapSrc} className="h-[360px] w-full border-0 lg:h-[440px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </div>
            <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><MapPin width={24} /></div>
              <div className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-400">Venue</div>
              <div className="mt-1 font-display text-lg font-bold text-ink-900">{data.venue}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{data.address || `${data.venue}, ${data.city}`}</p>
              <a href={mapLink} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full"><MapPin width={16} /> Open in Google Maps</a>
            </div>
          </div>
        </section>
      </div>

      {/* Floating CTA */}
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-ink-100 bg-white/95 px-2 py-2 shadow-soft backdrop-blur">
        <button onClick={() => scrollTo('floor')} className="btn-primary rounded-full px-4 py-2 text-sm"><Grid width={15} /> Floor plan</button>
        <button onClick={toggleFav} className={`rounded-full p-2.5 ${fav ? 'text-brand' : 'text-ink-500'}`} aria-label="Favourite">
          <Heart width={18} style={fav ? { fill: 'currentColor' } : undefined} />
        </button>
        <button onClick={shareEvent} className="rounded-full p-2.5 text-ink-500" aria-label="Share"><ShareIcon /></button>
        <button onClick={() => scrollTo('comments')} className="rounded-full px-3 py-2 text-sm font-semibold text-ink-600">
          <Star width={14} className="mr-1 inline" style={{ color: '#fbbf24', fill: '#fbbf24' }} /> {avgRating || '—'}
        </button>
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

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-ink-500 sm:text-base">{subtitle}</p>}
      <div className="mt-3 h-1 w-12 rounded-full bg-grad" />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
      <div className="font-display text-xl font-extrabold text-white sm:text-2xl">{value}</div>
      <div className="text-[11px] font-medium text-white/65">{label}</div>
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
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-ink-400">{label}</dt>
        <dd className="font-medium text-ink-800">{value}</dd>
      </div>
    </div>
  );
}

function SocialBtn({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} className="grid h-9 w-9 place-items-center rounded-full bg-ink-50 text-ink-600 transition hover:bg-brand-50 hover:text-brand-600">
      {children}
    </a>
  );
}

function ReelCard({ url, caption, author }: { url: string; caption: string; author: string }) {
  const embed = toEmbedUrl(url);
  const kind = mediaKind(url);
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
      <div className="relative mx-auto aspect-[9/16] max-h-[420px] w-full bg-ink-950">
        {embed ? (
          <iframe title={caption} src={embed} className="h-full w-full border-0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="grid h-full place-items-center p-4 text-center text-sm text-white/80">{url}</a>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
          {kind === 'instagram' ? <Instagram width={12} /> : <Youtube width={12} />} {kind === 'instagram' ? 'Instagram' : 'Short'}
        </div>
        <div className="mt-1 text-sm font-semibold text-ink-900">{caption}</div>
        <div className="text-xs text-ink-400">by {author}</div>
      </div>
    </div>
  );
}

function VideoCard({ url, title, subtitle }: { url: string; title: string; subtitle?: string }) {
  const embed = toEmbedUrl(url);
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
      <div className="aspect-video bg-ink-950">
        {embed ? (
          <iframe title={title} src={embed} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <video src={url} controls className="h-full w-full object-contain" />
        )}
      </div>
      <div className="p-4">
        <div className="font-semibold text-ink-900">{title}</div>
        {subtitle && <div className="text-xs text-ink-400">{subtitle}</div>}
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
}: {
  slug: string;
  defaultName?: string;
  defaultKind: 'video' | 'photo' | 'reel';
  onAdded: (m: ExhibitionMedia) => void;
  allowUpload?: boolean;
}) {
  const [kind, setKind] = useState<'video' | 'photo' | 'reel'>(defaultKind);
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
      const r = await api.post(`/exhibitions/${slug}/media`, { author_name: name, kind, url, caption });
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
      setKind(file.type.startsWith('video') ? 'video' : 'photo');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="mb-3">
        <h3 className="font-display text-base font-bold text-ink-900">
          {kind === 'reel' ? 'Add a reel link' : kind === 'video' ? 'Add / upload a video' : 'Add / upload a photo'}
        </h3>
        <p className="text-sm text-ink-500">
          {kind === 'reel'
            ? 'Paste Instagram Reel or YouTube Shorts URL.'
            : kind === 'video'
              ? 'Paste YouTube URL, or upload a short video file for this demo.'
              : 'Paste an image URL, or upload a photo from your device.'}
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['reel', 'video', 'photo'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${kind === k ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600'}`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
      </div>
      <input
        value={url.startsWith('data:') ? '' : url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={kind === 'reel' ? 'https://instagram.com/reel/… or youtube.com/shorts/…' : kind === 'video' ? 'https://youtube.com/watch?v=…' : 'https://…/photo.jpg'}
        className="mt-3 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100"
      />
      {url.startsWith('data:') && <p className="mt-2 text-xs text-emerald-600">File ready to upload ✓</p>}
      {allowUpload && (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-3 text-sm font-medium text-ink-600 hover:border-brand hover:bg-brand-50/40">
          <Bookmark width={16} /> Upload {kind === 'photo' ? 'image' : 'video'} file
          <input type="file" accept={kind === 'photo' ? 'image/*' : 'video/*,image/*'} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
      {error && <p className="mt-2 text-sm text-brand-700">{error}</p>}
      {ok && <p className="mt-2 text-sm text-emerald-600">Added — thanks for sharing!</p>}
      <button type="submit" disabled={busy || !url} className="btn-primary mt-4">{busy ? 'Saving…' : `Add ${kind}`}</button>
    </form>
  );
}

function Comments({
  comments,
  slug,
  defaultName,
  onPosted,
}: {
  comments: ExhibitionComment[];
  slug: string;
  defaultName?: string;
  onPosted: (c: ExhibitionComment) => void;
}) {
  const [name, setName] = useState(defaultName || '');
  const [city, setCity] = useState('Bengaluru');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.post(`/exhibitions/${slug}/comments`, { author_name: name, author_city: city, body, rating });
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
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={submit} className="h-fit space-y-3 rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
        <h3 className="font-display text-base font-bold text-ink-900">Leave a review</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <Star width={20} style={{ color: n <= rating ? '#fbbf24' : '#d1d5db', fill: n <= rating ? '#fbbf24' : 'transparent' }} />
            </button>
          ))}
          <span className="ml-2 text-xs text-ink-400">{rating}/5</span>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} placeholder="Share your experience…" className="w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
        {error && <p className="text-sm text-brand-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Posting…' : 'Post review'}</button>
      </form>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center text-ink-500">No reviews yet — be the first.</div>
        ) : comments.map((c) => (
          <div key={c.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {c.author_name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-ink-900">{c.author_name}</div>
                  <div className="text-xs text-ink-400">{c.author_city || 'India'} · {formatDate(c.created_at.slice(0, 10))}</div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} width={12} style={{ color: i < c.rating ? '#fbbf24' : '#e5e7eb', fill: i < c.rating ? '#fbbf24' : 'transparent' }} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
