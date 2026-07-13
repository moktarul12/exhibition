import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR, formatDate } from '../api';
import { Spinner, Stat } from '../components/ui';
import { useAuth } from '../auth';
import { Ticket, Mail, Building, ArrowRight, Grid, Check, Download } from '../components/icons';
import { toEmbedUrl, mediaKind } from '../media';
import type { Company } from '../types';

interface InboxMsg {
  id: number;
  from_name: string;
  from_email: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  company_name: string;
  exhibition_name?: string;
  exhibition_slug?: string;
}

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [messages, setMessages] = useState<InboxMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/bookings/mine'),
      api.get('/messages/inbox').catch(() => ({ data: [] })),
      api.get('/auth/me').catch(() => ({ data: {} })),
    ]).then(([b, m, me]) => {
      setBookings(b.data);
      setMessages(m.data);
      setCompany(me.data?.company || null);
    }).finally(() => setLoading(false));
  }, []);

  const markRead = async (id: number) => {
    await api.patch(`/messages/${id}/read`);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m)));
  };

  if (loading) return <Spinner label="Loading company workspace…" />;

  const unread = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="container-px py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Company Workspace</h1>
        <p className="text-sm text-slate-500">Welcome, {user?.name}. Manage stall bookings and visitor enquiries.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Ticket width={20} />} label="My Bookings" value={bookings.length} />
        <Stat icon={<Mail width={20} />} label="Unread Enquiries" value={unread} accent="bg-amber-50 text-amber-600" />
        <Stat icon={<Building width={20} />} label="Total Messages" value={messages.length} accent="bg-indigo-50 text-indigo-600" />
        <Link to="/exhibitions?status=live" className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-soft">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Grid width={20} /></div>
          <div><div className="text-sm font-bold text-slate-900">Book a Stall</div><div className="text-xs text-slate-500">Find live exhibitions</div></div>
        </Link>
      </div>

      <MediaEditor company={company} onSaved={setCompany} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">My Stall Bookings</h3>
            <Link to="/my-bookings" className="text-xs font-semibold text-brand-600">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No bookings yet. <Link to="/exhibitions?status=live" className="font-semibold text-brand-600">Book a stall →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 5).map((b) => (
                <Link key={b.id} to={`/exhibitions/${b.slug}#floor-plan`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <img src={b.exhibition_banner} alt="" className="h-12 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{b.exhibition_name}</div>
                    <div className="text-xs text-slate-500">{b.hall_name} · Stall {b.stall_code}</div>
                  </div>
                  <div className="text-right text-sm font-bold text-slate-900">{formatINR(b.amount)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Visitor Enquiries</h3>
          </div>
          {messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No messages yet. Enquiries from visitors will appear here.</div>
          ) : (
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {messages.map((m) => (
                <button key={m.id} onClick={() => markRead(m.id)} className="block w-full px-5 py-3 text-left hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{m.subject}</span>
                        {m.status === 'unread' && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">New</span>}
                      </div>
                      <div className="text-xs text-slate-500">From {m.from_name} · {m.from_email}</div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{m.body}</p>
                    </div>
                    <a href={`mailto:${m.from_email}?subject=Re: ${m.subject}`} onClick={(e) => e.stopPropagation()} className="btn-outline shrink-0 px-2 py-1 text-xs">
                      Reply <ArrowRight width={12} />
                    </a>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">{formatDate(m.created_at)}{m.exhibition_name ? ` · ${m.exhibition_name}` : ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaEditor({ company, onSaved }: { company: Company | null; onSaved: (c: Company) => void }) {
  const [form, setForm] = useState({ youtube_url: '', reel_url: '', brochure_url: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (company) setForm({
      youtube_url: company.youtube_url || '',
      reel_url: company.reel_url || '',
      brochure_url: company.brochure_url || '',
    });
  }, [company]);

  if (!company) {
    return (
      <div className="card mb-6 p-5 text-sm text-slate-500">
        No company profile is linked to your account yet, so media can't be added. Book a stall to create your company profile.
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const r = await api.patch('/companies/mine', form);
      onSaved(r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save media');
    } finally {
      setSaving(false);
    }
  };

  const reelPreview = toEmbedUrl(form.reel_url);
  const videoPreview = toEmbedUrl(form.youtube_url);

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Media & Reels</h3>
          <p className="text-xs text-slate-500">Add a YouTube video or an Instagram / YouTube reel link — it shows on your public profile.</p>
        </div>
        <a href={`/company/${company.id}`} className="text-xs font-semibold text-brand-600">View profile →</a>
      </div>
      <form onSubmit={save} className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="label">YouTube video link</label>
            <input className="input" placeholder="https://youtube.com/watch?v=…" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
          </div>
          <div>
            <label className="label">Reel link (Instagram or YouTube Shorts)</label>
            <input className="input" placeholder="https://instagram.com/reel/… or https://youtube.com/shorts/…" value={form.reel_url} onChange={(e) => setForm({ ...form, reel_url: e.target.value })} />
            {form.reel_url && (
              <p className="mt-1 text-xs text-slate-500">
                Detected: <b className="uppercase">{mediaKind(form.reel_url)}</b>{!reelPreview && ' · link will open in a new tab (can’t be embedded)'}
              </p>
            )}
          </div>
          <div>
            <label className="label">Brochure / PDF link</label>
            <input className="input" placeholder="https://…/brochure.pdf" value={form.brochure_url} onChange={(e) => setForm({ ...form, brochure_url: e.target.value })} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save media'}</button>
            {saved && <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600"><Check width={16} /> Saved</span>}
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Live preview</div>
          {videoPreview && (
            <div className="aspect-video overflow-hidden rounded-xl bg-slate-900">
              <iframe title="Video preview" src={videoPreview} className="h-full w-full" allowFullScreen />
            </div>
          )}
          {reelPreview && (
            <div className="mx-auto aspect-[9/16] max-h-72 w-full max-w-[220px] overflow-hidden rounded-xl bg-slate-900">
              <iframe title="Reel preview" src={reelPreview} className="h-full w-full" allowFullScreen scrolling="no" />
            </div>
          )}
          {form.brochure_url && (
            <a href={form.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              <Download width={16} className="text-brand-600" /> Open brochure
            </a>
          )}
          {!videoPreview && !reelPreview && !form.brochure_url && (
            <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">Paste a link to see a preview here.</div>
          )}
        </div>
      </form>
    </div>
  );
}
