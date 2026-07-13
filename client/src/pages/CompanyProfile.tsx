import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, formatDate } from '../api';
import type { Company } from '../types';
import { Spinner } from '../components/ui';
import { useAuth } from '../auth';
import { Globe, Mail, Phone, MapPin, Building, Calendar, Check, Download } from '../components/icons';
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
  if (!c) return <div className="container-px py-24 text-center text-slate-500">Company not found.</div>;

  return (
    <div className="container-px py-8">
      <div className="card overflow-hidden">
        <div className="h-28" style={{ background: 'linear-gradient(90deg, #a30d3a, #7c1d4a)' }} />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <img src={c.logo} alt="" className="h-20 w-20 rounded-2xl border-4 border-white bg-white shadow" />
            <div className="flex-1 pb-1">
              <h1 className="text-2xl font-extrabold text-slate-900">{c.name}</h1>
              <div className="text-sm text-slate-500">{c.industry} · {c.city}</div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <a href={`mailto:${c.email}?subject=Enquiry via Expo Mela`} className="btn-outline"><Mail width={16} /> Email</a>
              <a href={`tel:${c.phone}`} className="btn-outline"><Phone width={16} /> Call</a>
            </div>
          </div>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">{c.about}</p>
        </div>
      </div>

      {(c.youtube_url || c.reel_url || c.brochure_url || (c.documents && c.documents.length > 0)) && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {c.youtube_url && (
            <div className="card overflow-hidden p-5">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Company video</h3>
              <div className="aspect-video overflow-hidden rounded-xl bg-slate-900">
                <iframe
                  title={`${c.name} video`}
                  src={toEmbedUrl(c.youtube_url) || c.youtube_url}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          {c.reel_url && (
            <div className="card overflow-hidden p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                Reel <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-600">{mediaKind(c.reel_url) === 'instagram' ? 'Instagram' : mediaKind(c.reel_url) === 'youtube' ? 'YouTube' : 'Video'}</span>
              </h3>
              {toEmbedUrl(c.reel_url) ? (
                <div className="mx-auto aspect-[9/16] max-h-[560px] w-full max-w-[340px] overflow-hidden rounded-xl bg-slate-900">
                  <iframe title={`${c.name} reel`} src={toEmbedUrl(c.reel_url)!} className="h-full w-full" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen scrolling="no" />
                </div>
              ) : (
                <a href={c.reel_url} target="_blank" rel="noreferrer" className="btn-outline w-full">Watch reel →</a>
              )}
            </div>
          )}
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Brochures & documents</h3>
            <div className="space-y-2">
              {c.brochure_url && (
                <a href={c.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <Download width={16} className="text-brand-600" /> Company Brochure.pdf
                </a>
              )}
              {c.documents?.map((d) => (
                <a key={d.name} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <Download width={16} className="text-brand-600" /> {d.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Contact Details</h3>
          <div className="space-y-2.5 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Building width={16} className="text-slate-400" /> {c.contact_person}</div>
            <div className="flex items-center gap-2"><Globe width={16} className="text-slate-400" /> {c.website}</div>
            <div className="flex items-center gap-2"><Mail width={16} className="text-slate-400" /> {c.email}</div>
            <div className="flex items-center gap-2"><Phone width={16} className="text-slate-400" /> {c.phone}</div>
            <div className="flex items-center gap-2"><MapPin width={16} className="text-slate-400" /> {c.address}, {c.city}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
            <div><div className="text-xs text-slate-400">Established</div><div className="font-semibold text-slate-800">{c.established}</div></div>
            <div><div className="text-xs text-slate-400">Employees</div><div className="font-semibold text-slate-800">{c.employees}</div></div>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Send a message to {c.name}</h3>
          {!user && (
            <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Please <Link to="/login" state={{ from: `/company/${id}` }} className="font-bold underline">login</Link> to send an in-app message — or email them directly.
            </div>
          )}
          {sent ? (
            <div className="grid place-items-center py-10 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check width={24} /></div>
              <div className="font-bold text-slate-900">Message sent!</div>
              <p className="mt-1 text-sm text-slate-500">{c.contact_person} will get back to you soon.</p>
              <button onClick={() => setSent(false)} className="btn-outline mt-4">Send another</button>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="space-y-3">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Your name</label><input className="input" required value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} /></div>
                <div><label className="label">Email</label><input className="input" type="email" required value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} /></div>
              </div>
              <div><label className="label">Phone</label><input className="input" value={form.from_phone} onChange={(e) => setForm({ ...form, from_phone: e.target.value })} /></div>
              <div><label className="label">Subject</label><input className="input" required placeholder="e.g. Product enquiry / Meeting request" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><label className="label">Message</label><textarea className="input min-h-[110px]" required placeholder="Tell them what you're looking for…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <button className="btn-primary" disabled={sending}>{sending ? 'Sending…' : user ? 'Send Message' : 'Login to Send'}</button>
            </form>
          )}
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Exhibition History</h3>
        {!c.history || c.history.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No exhibition history yet.</div>
        ) : (
          <div className="space-y-3">
            {c.history.map((h, i) => (
              <Link to={`/exhibitions/${h.slug}`} key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600"><Calendar width={18} /></div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{h.name}</div>
                  <div className="text-xs text-slate-500">{h.hall_name} · Stall {h.stall_code}</div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <div>{formatDate(h.start_date)}</div>
                  {(h as any).status && <div className="text-[10px] font-bold uppercase text-brand-600">{(h as any).status}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
