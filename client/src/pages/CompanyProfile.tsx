import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, formatDate } from '../api';
import type { Company } from '../types';
import { Spinner } from '../components/ui';
import { useAuth } from '../auth';
import {
  Globe, Mail, Phone, MapPin, Building, Calendar, Check, Download,
  Users, ArrowRight, Sparkle, ChevronRight,
} from '../components/icons';
import { toEmbedUrl, mediaKind } from '../media';

export default function CompanyProfile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const exhibitionId = params.get('exhibition');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [c, setC] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    from_name: '',
    from_email: '',
    from_phone: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    api.get(`/companies/${id}`).then((r) => setC(r.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        from_name: user.name,
        from_email: user.email,
        from_phone: user.phone || '',
      }));
    }
  }, [user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: `/company/${id}${exhibitionId ? `?exhibition=${exhibitionId}` : ''}` } });
      return;
    }
    setSending(true); setError('');
    try {
      await api.post('/messages', {
        company_id: Number(id),
        exhibition_id: exhibitionId ? Number(exhibitionId) : undefined,
        ...form,
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner />;
  if (!c) return <div className="container-px py-24 text-center text-ink-500">Company not found.</div>;

  const shows = c.history?.length || 0;
  const hasMedia = !!(c.youtube_url || c.reel_url);
  const hasDocs = !!(c.brochure_url || (c.documents && c.documents.length > 0));
  const websiteHref = c.website?.startsWith('http') ? c.website : `https://${c.website}`;

  return (
    <div className="pb-16">
      {/* ---- Dark brand hero ---- */}
      <section className="relative overflow-hidden bg-ink-950">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 80% at 15% 0%, rgba(214,32,110,0.25), transparent 55%), radial-gradient(ellipse 50% 70% at 90% 100%, rgba(124,58,237,0.22), transparent 55%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 18px)' }}
        />

        <div className="container-px relative py-10 lg:py-14">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white">
            <ArrowRight width={15} className="rotate-180" /> Back
          </button>

          <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative w-fit">
                <img src={c.logo} alt="" className="h-24 w-24 rounded-3xl border-2 border-white/20 bg-white object-cover shadow-2xl lg:h-28 lg:w-28" />
                <span className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-brand text-white shadow-lg">
                  <Check width={16} />
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/90">{c.industry}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/90">
                    <MapPin width={12} /> {c.city}
                  </span>
                </div>
                <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white lg:text-4xl">{c.name}</h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/60">{c.about?.slice(0, 140)}{(c.about?.length || 0) > 140 ? '…' : ''}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a href={`mailto:${c.email}?subject=Enquiry via Expo Mela`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink-900 shadow-lg transition-transform hover:-translate-y-0.5">
                <Mail width={16} /> Email
              </a>
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20">
                <Phone width={16} /> Call
              </a>
              {c.website && (
                <a href={websiteHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20">
                  <Globe width={16} /> Website
                </a>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="mt-8 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur sm:max-w-md">
            <HeroStat icon={<Sparkle width={16} />} value={c.established || '—'} label="Established" />
            <HeroStat icon={<Users width={16} />} value={c.employees || '—'} label="Employees" />
            <HeroStat icon={<Calendar width={16} />} value={String(shows)} label={shows === 1 ? 'Exhibition' : 'Exhibitions'} />
          </div>
        </div>
      </section>

      {/* ---- Body: content + sticky contact rail ---- */}
      <div className="container-px mt-10 grid gap-8 lg:grid-cols-[1.65fr_1fr]">
        <div className="min-w-0 space-y-10">
          {/* About */}
          <section>
            <Eyebrow n="01" text="The story" />
            <h2 className="mt-1 font-display text-2xl font-extrabold text-ink-900">About {c.name}</h2>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-600">{c.about}</p>
          </section>

          {/* Media showcase */}
          {hasMedia && (
            <section>
              <Eyebrow n="02" text="Watch" />
              <h2 className="mt-1 font-display text-2xl font-extrabold text-ink-900">Media showcase</h2>
              <div className={`mt-5 grid gap-5 ${c.youtube_url && c.reel_url ? 'lg:grid-cols-[1.6fr_1fr]' : ''}`}>
                {c.youtube_url && (
                  <div className="overflow-hidden rounded-3xl bg-ink-950 p-2 shadow-card">
                    <div className="aspect-video overflow-hidden rounded-2xl">
                      <iframe
                        title={`${c.name} video`}
                        src={toEmbedUrl(c.youtube_url) || c.youtube_url}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="px-3 py-2.5 text-xs font-semibold text-white/70">Company film</div>
                  </div>
                )}
                {c.reel_url && (
                  <div className="mx-auto w-full max-w-[300px]">
                    {toEmbedUrl(c.reel_url) ? (
                      <div className="relative overflow-hidden rounded-[2rem] border border-ink-200 bg-ink-950 p-2 shadow-card">
                        <span className="absolute left-1/2 top-3 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/20" />
                        <div className="aspect-[9/16] overflow-hidden rounded-[1.6rem]">
                          <iframe
                            title={`${c.name} reel`}
                            src={toEmbedUrl(c.reel_url)!}
                            className="h-full w-full"
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                            allowFullScreen
                            scrolling="no"
                          />
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <span className="text-xs font-semibold text-white/70">Reel</span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase text-white ${mediaKind(c.reel_url) === 'instagram' ? 'bg-gradient-to-r from-fuchsia-500 to-amber-500' : 'bg-red-600'}`}>
                            {mediaKind(c.reel_url) === 'instagram' ? 'Instagram' : 'YouTube'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <a href={c.reel_url} target="_blank" rel="noreferrer" className="btn-outline w-full">Watch reel →</a>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Exhibition history — timeline */}
          <section>
            <Eyebrow n={hasMedia ? '03' : '02'} text="Where they've shown" />
            <h2 className="mt-1 font-display text-2xl font-extrabold text-ink-900">Exhibition history</h2>
            {!c.history || c.history.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-ink-200 bg-ink-50 py-12 text-center text-sm text-ink-500">
                No exhibition history yet — this brand is just getting started.
              </div>
            ) : (
              <div className="relative mt-6 ml-2 space-y-5 border-l-2 border-brand-200 pl-7">
                {c.history.map((h, i) => (
                  <Link to={`/exhibitions/${h.slug}`} key={i} className="group relative block">
                    <span className="absolute -left-[37px] top-5 h-4 w-4 rounded-full border-4 border-white bg-brand" />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-soft">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Calendar width={18} /></div>
                      <div className="min-w-[180px] flex-1">
                        <div className="font-display font-bold text-ink-900 group-hover:text-brand-700">{h.name}</div>
                        <div className="text-xs text-ink-500">{h.hall_name} · Stall {h.stall_code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-ink-700">{formatDate(h.start_date)}</div>
                        {(h as any).status && (
                          <span className="text-[10px] font-bold uppercase text-brand-600">{(h as any).status}</span>
                        )}
                      </div>
                      <ChevronRight width={16} className="text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ---- Sticky contact rail ---- */}
        <aside className="min-w-0">
          <div className="space-y-5 lg:sticky lg:top-24">
            {/* Contact card */}
            <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
              <div className="bg-gradient-to-r from-brand-600 to-fuchsia-600 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Get in touch</p>
                <p className="font-display text-lg font-extrabold text-white">Contact details</p>
              </div>
              <div className="space-y-3 px-5 py-5 text-sm">
                <ContactRow icon={<Building width={16} />} label="Contact person" value={c.contact_person} />
                {c.website && (
                  <ContactRow
                    icon={<Globe width={16} />}
                    label="Website"
                    value={<a href={websiteHref} target="_blank" rel="noreferrer" className="font-semibold text-brand-600 hover:underline">{c.website}</a>}
                  />
                )}
                <ContactRow icon={<Mail width={16} />} label="Email" value={<a href={`mailto:${c.email}`} className="break-all font-semibold text-brand-600 hover:underline">{c.email}</a>} />
                <ContactRow icon={<Phone width={16} />} label="Phone" value={<a href={`tel:${c.phone}`} className="font-semibold text-ink-800">{c.phone}</a>} />
                <ContactRow icon={<MapPin width={16} />} label="Address" value={`${c.address}, ${c.city}`} />
              </div>
            </div>

            {/* Documents */}
            {hasDocs && (
              <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Take away</p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-ink-900">Brochures & documents</p>
                <div className="mt-3 space-y-2">
                  {c.brochure_url && <DocRow href={c.brochure_url} name="Company Brochure.pdf" />}
                  {c.documents?.map((d) => <DocRow key={d.name} href={d.url} name={d.name} />)}
                </div>
              </div>
            )}

            {/* Message form */}
            <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">In-app message</p>
              <p className="mt-0.5 font-display text-lg font-extrabold text-ink-900">Say hello to {c.name}</p>

              {!user && (
                <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                  <Link to="/login" state={{ from: `/company/${id}` }} className="font-bold underline">Login</Link> to send an in-app message — or email them directly above.
                </div>
              )}

              {sent ? (
                <div className="grid place-items-center py-8 text-center">
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check width={24} /></div>
                  <div className="font-display font-bold text-ink-900">Message sent!</div>
                  <p className="mt-1 text-sm text-ink-500">{c.contact_person} will get back to you soon.</p>
                  <button onClick={() => setSent(false)} className="btn-outline mt-4">Send another</button>
                </div>
              ) : (
                <form onSubmit={sendMessage} className="mt-4 space-y-3">
                  {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="label">Your name</label><input className="input" required value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} /></div>
                    <div><label className="label">Email</label><input className="input" type="email" required value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} /></div>
                  </div>
                  <div><label className="label">Phone</label><input className="input" value={form.from_phone} onChange={(e) => setForm({ ...form, from_phone: e.target.value })} /></div>
                  <div><label className="label">Subject</label><input className="input" required placeholder="e.g. Product enquiry / Meeting request" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                  <div><label className="label">Message</label><textarea className="input min-h-[100px]" required placeholder="Tell them what you're looking for…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
                  <button className="btn-primary w-full" disabled={sending}>{sending ? 'Sending…' : user ? 'Send message' : 'Login to send'}</button>
                </form>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Eyebrow({ n, text }: { n: string; text: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">
      {n} · {text}
    </p>
  );
}

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="px-4 py-3.5 text-center sm:text-left">
      <div className="flex items-center justify-center gap-1.5 text-white/50 sm:justify-start">{icon}<span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
      <div className="mt-1 font-display text-lg font-extrabold text-white">{value}</div>
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-400">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</div>
        <div className="text-sm text-ink-700">{value}</div>
      </div>
    </div>
  );
}

function DocRow({ href, name }: { href: string; name: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-2xl border border-ink-100 px-3.5 py-3 text-sm text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50/50">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Download width={16} /></span>
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <ChevronRight width={15} className="text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </a>
  );
}
